<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Decision;
use App\Services\VerificationService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Contrôleur des documents.
 * Gère le dépôt de fichiers, le lancement de vérification et les décisions.
 */
class DocumentController extends Controller
{
    public function __construct(
        private VerificationService $verificationService,
        private NotificationService $notif,
    ) {}

    /**
     * Liste les documents selon le rôle de l'utilisateur.
     */
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = Document::with([
            'etudiant:id,name,prenom,matricule,departement',
            'theme:id,titre',
            'derniereVerification',
        ]);

        if ($user->estEtudiant()) {
            $query->where('etudiant_id', $user->id);
        } elseif ($user->estChefDep()) {
            $query->whereHas('etudiant', fn($q) => $q->where('departement', $user->departement))
                  ->whereIn('statut', ['verifie', 'en_attente_chef', 'rejete_chef', 'en_attente_da', 'rejete_da', 'valide']);
        } elseif ($user->estDirecteurAdj()) {
            $query->whereIn('statut', ['en_attente_da', 'rejete_da', 'valide']);
        }

        return response()->json($query->latest()->get());
    }

    /**
     * Dépose un nouveau document (étudiant uniquement).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'theme_id'           => 'required|exists:themes,id',
            'titre'              => 'required|string|max:255',
            'fichier'            => 'required|file|mimes:pdf,docx|max:20480',
            'annee_universitaire'=> 'required|string',
            'niveau'             => 'required|in:licence,master',
        ]);

        $user = $request->user();

        // Vérifier que le thème appartient à l'étudiant et est validé
        $theme = \App\Models\Theme::where('id', $data['theme_id'])
            ->where('etudiant_id', $user->id)
            ->where('statut', 'valide')
            ->first();

        if (!$theme) {
            return response()->json(['message' => 'Thème invalide ou non validé.'], 422);
        }

        // Stocker le fichier
        $fichier     = $request->file('fichier');
        $extension   = $fichier->getClientOriginalExtension();
        $nomFichier  = $fichier->getClientOriginalName();
        $chemin      = $fichier->store("documents/{$user->id}", 'local');

        $document = Document::create([
            'etudiant_id'        => $user->id,
            'theme_id'           => $data['theme_id'],
            'titre'              => $data['titre'],
            'fichier_path'       => $chemin,
            'fichier_nom'        => $nomFichier,
            'type_fichier'       => strtolower($extension),
            'annee_universitaire'=> $data['annee_universitaire'],
            'niveau'             => $data['niveau'],
            'statut'             => 'depose',
        ]);

        return response()->json([
            'message'  => 'Document déposé avec succès.',
            'document' => $document,
        ], 201);
    }

    /**
     * Affiche un document avec ses vérifications et décisions.
     */
    public function show(Request $request, Document $document)
    {
        $this->autoriser($request->user(), $document);

        $document->load([
            'etudiant:id,name,prenom,matricule',
            'theme:id,titre',
            'verifications.sources',
            'decisions.decideur:id,name,prenom',
        ]);

        return response()->json(['document' => $document]);
    }

    /**
     * Lance la vérification complète d'un document (étudiant uniquement).
     */
    public function lancerVerification(Request $request, Document $document)
    {
        $user = $request->user();

        if ($document->etudiant_id !== $user->id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        if (in_array($document->statut, ['en_verification'])) {
            return response()->json(['message' => 'Une vérification est déjà en cours.'], 422);
        }

        // Lancer la vérification (synchrone pour l'instant)
        $verification = $this->verificationService->lancer($document);

        // Si la vérification est terminée, transmettre au chef
        if ($verification->statut === 'termine') {
            $document->update(['statut' => 'en_attente_chef']);
        }

        return response()->json([
            'message'      => 'Vérification lancée avec succès.',
            'verification' => $verification->load('sources'),
        ]);
    }

    /**
     * Télécharge le fichier d'un document.
     */
    public function telecharger(Request $request, Document $document)
    {
        $this->autoriser($request->user(), $document);

        if (!Storage::disk('local')->exists($document->fichier_path)) {
            return response()->json(['message' => 'Fichier introuvable.'], 404);
        }

        return Storage::disk('local')->download($document->fichier_path, $document->fichier_nom);
    }

    /**
     * Décision du Chef de Département sur un document.
     */
    public function decisionChef(Request $request, Document $document)
    {
        $data = $request->validate([
            'decision' => 'required|in:valide,rejete',
            'motif'    => 'required_if:decision,rejete|nullable|string',
        ]);

        if ($document->statut !== 'en_attente_chef') {
            return response()->json(['message' => 'Ce document n\'est pas en attente de votre décision.'], 422);
        }

        $user   = $request->user();
        $statut = $data['decision'] === 'valide' ? 'en_attente_da' : 'rejete_chef';

        Decision::create([
            'decideur_id'    => $user->id,
            'decidable_type' => Document::class,
            'decidable_id'   => $document->id,
            'type_decideur'  => 'chef_departement',
            'decision'       => $data['decision'],
            'motif'          => $data['motif'] ?? null,
        ]);

        $document->update(['statut' => $statut]);

        $msg = $data['decision'] === 'valide'
            ? "Votre document \"{$document->titre}\" a été validé par le Chef de Département."
            : "Votre document \"{$document->titre}\" a été rejeté. Motif : {$data['motif']}";

        $this->notif->notifier(
            $document->etudiant_id,
            $data['decision'] === 'valide' ? 'Document validé par le Chef' : 'Document rejeté par le Chef',
            $msg,
            $data['decision'] === 'valide' ? 'succes' : 'erreur',
            "/etudiant/documents/{$document->id}"
        );

        return response()->json(['message' => 'Décision enregistrée.', 'document' => $document->fresh()]);
    }

    /**
     * Décision finale du Directeur Adjoint sur un document.
     */
    public function decisionDA(Request $request, Document $document)
    {
        $data = $request->validate([
            'decision'        => 'required|in:valide,rejete',
            'motif'           => 'required_if:decision,rejete|nullable|string',
            'note_officielle' => 'required_if:decision,valide|nullable|string',
        ]);

        if ($document->statut !== 'en_attente_da') {
            return response()->json(['message' => 'Ce document n\'est pas en attente de votre décision.'], 422);
        }

        $user   = $request->user();
        $statut = $data['decision'] === 'valide' ? 'valide' : 'rejete_da';

        Decision::create([
            'decideur_id'    => $user->id,
            'decidable_type' => Document::class,
            'decidable_id'   => $document->id,
            'type_decideur'  => 'directeur_adjoint',
            'decision'       => $data['decision'],
            'motif'          => $data['motif'] ?? null,
            'note_officielle'=> $data['note_officielle'] ?? null,
        ]);

        $document->update(['statut' => $statut]);

        $msg = $data['decision'] === 'valide'
            ? "Félicitations ! Votre document \"{$document->titre}\" a été officiellement validé. Note : {$data['note_officielle']}"
            : "Votre document \"{$document->titre}\" a été rejeté par le Directeur Adjoint. Motif : {$data['motif']}";

        $this->notif->notifier(
            $document->etudiant_id,
            $data['decision'] === 'valide' ? 'Document officiellement validé !' : 'Document rejeté par le DA',
            $msg,
            $data['decision'] === 'valide' ? 'succes' : 'erreur',
            "/etudiant/documents/{$document->id}"
        );

        return response()->json(['message' => 'Décision finale enregistrée.', 'document' => $document->fresh()]);
    }

    /**
     * Vérifie que l'utilisateur a le droit d'accéder au document.
     */
    private function autoriser($user, Document $document): void
    {
        if ($user->estEtudiant() && $document->etudiant_id !== $user->id) {
            abort(403, 'Accès refusé.');
        }
        if ($user->estChefDep() && $document->etudiant->departement !== $user->departement) {
            abort(403, 'Accès refusé.');
        }
    }
}
