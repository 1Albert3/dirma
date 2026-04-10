<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Verification;
use App\Services\RapportService;
use Illuminate\Http\Request;

/**
 * Contrôleur des vérifications.
 * Permet de consulter les rapports d'analyse de plagiat.
 */
class VerificationController extends Controller
{
    public function __construct(private RapportService $rapportService) {}

    /**
     * Liste les vérifications de l'étudiant connecté.
     */
    public function index(Request $request)
    {
        $verifications = Verification::with(['document:id,titre,fichier_nom', 'sources'])
            ->where('etudiant_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json($verifications);
    }

    /**
     * Affiche le rapport complet d'une vérification.
     */
    public function show(Request $request, Verification $verification)
    {
        $user = $request->user();

        // Vérifier les droits d'accès
        if ($user->estEtudiant() && $verification->etudiant_id !== $user->id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $verification->load(['document.etudiant:id,name,prenom,matricule', 'sources']);

        return response()->json($verification);
    }

    /**
     * Télécharge le rapport PDF d'une vérification.
     */
    public function telechargerRapport(Request $request, Verification $verification)
    {
        $user = $request->user();

        if ($user->estEtudiant() && $verification->etudiant_id !== $user->id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        if ($verification->statut !== 'termine') {
            return response()->json(['message' => 'La vérification n\'est pas encore terminée.'], 422);
        }

        $pdf = $this->rapportService->genererPdf($verification);

        return $pdf->download("rapport-dirma-{$verification->id}.pdf");
    }
}
