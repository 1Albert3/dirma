<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Theme;
use App\Models\Decision;
use App\Services\TfIdfService;
use App\Services\ThemeAnalyseService;
use App\Services\NotificationService;
use Illuminate\Http\Request;

/**
 * Contrôleur des thèmes.
 * Gère la soumission, l'analyse automatique TF-IDF et les décisions hiérarchiques.
 */
class ThemeController extends Controller
{
    // Seuil de similarité au-delà duquel le thème est rejeté automatiquement (%)
    private const SEUIL_REJET_AUTO = 70.0;

    public function __construct(
        private TfIdfService         $tfIdf,
        private ThemeAnalyseService  $analyseService,
        private NotificationService  $notif,
    ) {}

    /**
     * Liste les thèmes selon le rôle de l'utilisateur connecté.
     */
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = Theme::with('etudiant:id,name,prenom,matricule,departement');

        if ($user->estEtudiant()) {
            $query->where('etudiant_id', $user->id);
        } elseif ($user->estChefDep()) {
            // Le chef voit les thèmes de son département en attente de sa décision
            $query->where('departement', $user->departement)
                  ->whereIn('statut', ['en_attente_chef', 'rejete_chef', 'en_attente_da', 'rejete_da', 'valide']);
        } elseif ($user->estDirecteurAdj()) {
            // Le DA voit les thèmes validés par le chef
            $query->whereIn('statut', ['en_attente_da', 'rejete_da', 'valide']);
        }

        return response()->json($query->latest()->get());
    }

    /**
     * Soumet un nouveau thème (étudiant uniquement).
     * Déclenche l'analyse TF-IDF automatique.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'titre'               => 'required|string|max:255',
            'description'         => 'required|string|min:100',
            'annee_universitaire' => 'required|string',
            'type_analyse'        => 'required|in:plagiat,ia,les_deux',
        ]);

        $user = $request->user();

        // Créer le thème en statut analyse_complete
        $theme = Theme::create([
            'etudiant_id'        => $user->id,
            'titre'              => $data['titre'],
            'description'        => $data['description'],
            'departement'        => $user->departement,
            'annee_universitaire'=> $data['annee_universitaire'],
            'score_similarite'   => 0,
            'statut'             => 'analyse_complete',
        ]);

        // Lancer l'analyse selon le type choisi
        $resultats = $this->analyseService->analyser($theme, $data['type_analyse']);

        // Mettre à jour le score
        $theme->update(['score_similarite' => $resultats['score_global']]);

        return response()->json([
            'message'   => 'Analyse terminée.',
            'theme'     => $theme->fresh(),
            'resultats' => $resultats,
        ], 201);
    }

    /**
     * Confirme l'envoi du thème au Chef après analyse (action étudiant).
     */
    public function confirmer(Request $request, Theme $theme)
    {
        if ($theme->etudiant_id !== $request->user()->id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        if ($theme->statut !== 'analyse_complete') {
            return response()->json(['message' => 'Ce thème ne peut pas être confirmé.'], 422);
        }

        $theme->update(['statut' => 'en_attente_chef']);

        $this->notif->notifier(
            $theme->etudiant_id,
            'Thème transmis au Chef',
            "Votre thème \"{$theme->titre}\" a été transmis au Chef de Département (similarité : {$theme->score_similarite}%).",
            'info',
            "/etudiant/themes/{$theme->id}"
        );

        return response()->json(['message' => 'Thème transmis au Chef de Département.', 'theme' => $theme->fresh()]);
    }

    /**
     * Abandonne un thème après analyse (l'étudiant choisit de ne pas l'envoyer).
     */
    public function abandonner(Request $request, Theme $theme)
    {
        if ($theme->etudiant_id !== $request->user()->id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        if ($theme->statut !== 'analyse_complete') {
            return response()->json(['message' => 'Ce thème ne peut pas être abandonné.'], 422);
        }

        $theme->delete();

        return response()->json(['message' => 'Thème abandonné.']);
    }

    /**
     * Affiche un thème avec ses décisions.
     */
    public function show(Request $request, Theme $theme)
    {
        $this->autoriser($request->user(), $theme);

        $theme->load(['etudiant:id,name,prenom,matricule', 'decisions.decideur:id,name,prenom']);

        return response()->json(['theme' => $theme]);
    }

    /**
     * Relance l'analyse TF-IDF sur un thème (chef uniquement).
     */
    public function reanalyser(Request $request, Theme $theme)
    {
        $themesExistants = Theme::where('id', '!=', $theme->id)
            ->whereNotIn('statut', ['rejete_auto', 'rejete_chef', 'rejete_da'])
            ->get()
            ->map(fn($t) => $t->titre . ' ' . $t->description)
            ->toArray();

        $score = $this->tfIdf->calculerSimilarite(
            $theme->titre . ' ' . $theme->description,
            $themesExistants
        );

        $theme->update(['score_similarite' => $score]);

        return response()->json(['message' => 'Analyse relancée.', 'score_similarite' => $score]);
    }

    /**
     * Décision du Chef de Département (valider ou rejeter).
     */
    public function decisionChef(Request $request, Theme $theme)
    {
        $data = $request->validate([
            'decision' => 'required|in:valide,rejete',
            'motif'    => 'required_if:decision,rejete|nullable|string',
        ]);

        if ($theme->statut !== 'en_attente_chef') {
            return response()->json(['message' => 'Ce thème n\'est pas en attente de votre décision.'], 422);
        }

        $user    = $request->user();
        $statut  = $data['decision'] === 'valide' ? 'en_attente_da' : 'rejete_chef';

        Decision::create([
            'decideur_id'    => $user->id,
            'decidable_type' => Theme::class,
            'decidable_id'   => $theme->id,
            'type_decideur'  => 'chef_departement',
            'decision'       => $data['decision'],
            'motif'          => $data['motif'] ?? null,
        ]);

        $theme->update(['statut' => $statut]);

        // Notifier l'étudiant
        $msg = $data['decision'] === 'valide'
            ? "Votre thème \"{$theme->titre}\" a été validé par le Chef de Département et transmis au Directeur Adjoint."
            : "Votre thème \"{$theme->titre}\" a été rejeté par le Chef de Département. Motif : {$data['motif']}";

        $this->notif->notifier(
            $theme->etudiant_id,
            $data['decision'] === 'valide' ? 'Thème validé par le Chef' : 'Thème rejeté par le Chef',
            $msg,
            $data['decision'] === 'valide' ? 'succes' : 'erreur',
            "/etudiant/themes/{$theme->id}"
        );

        return response()->json(['message' => 'Décision enregistrée.', 'theme' => $theme->fresh()]);
    }

    /**
     * Décision finale du Directeur Adjoint.
     */
    public function decisionDA(Request $request, Theme $theme)
    {
        $data = $request->validate([
            'decision'        => 'required|in:valide,rejete',
            'motif'           => 'required_if:decision,rejete|nullable|string',
            'note_officielle' => 'required_if:decision,valide|nullable|string',
        ]);

        if ($theme->statut !== 'en_attente_da') {
            return response()->json(['message' => 'Ce thème n\'est pas en attente de votre décision.'], 422);
        }

        $user   = $request->user();
        $statut = $data['decision'] === 'valide' ? 'valide' : 'rejete_da';

        Decision::create([
            'decideur_id'    => $user->id,
            'decidable_type' => Theme::class,
            'decidable_id'   => $theme->id,
            'type_decideur'  => 'directeur_adjoint',
            'decision'       => $data['decision'],
            'motif'          => $data['motif'] ?? null,
            'note_officielle'=> $data['note_officielle'] ?? null,
        ]);

        $theme->update(['statut' => $statut]);

        // Notifier l'étudiant
        $msg = $data['decision'] === 'valide'
            ? "Félicitations ! Votre thème \"{$theme->titre}\" a été officiellement validé. Note : {$data['note_officielle']}"
            : "Votre thème \"{$theme->titre}\" a été rejeté par le Directeur Adjoint. Motif : {$data['motif']}";

        $this->notif->notifier(
            $theme->etudiant_id,
            $data['decision'] === 'valide' ? 'Thème officiellement validé !' : 'Thème rejeté par le DA',
            $msg,
            $data['decision'] === 'valide' ? 'succes' : 'erreur',
            "/etudiant/themes/{$theme->id}"
        );

        return response()->json(['message' => 'Décision finale enregistrée.', 'theme' => $theme->fresh()]);
    }

    /**
     * Vérifie que l'utilisateur a le droit d'accéder au thème.
     */
    private function autoriser($user, Theme $theme): void
    {
        if ($user->estEtudiant() && $theme->etudiant_id !== $user->id) {
            abort(403, 'Accès refusé.');
        }
        if ($user->estChefDep() && $theme->departement !== $user->departement) {
            abort(403, 'Accès refusé.');
        }
    }
}
