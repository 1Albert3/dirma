<?php

namespace App\Services;

use App\Models\Verification;
use App\Models\Document;
use Barryvdh\DomPDF\Facade\Pdf;

/**
 * Service de génération de rapport de vérification.
 * Produit un rapport PDF structuré avec tous les scores et sources détectées.
 *
 * Score global pondéré :
 *   - Score local (Shingling/Jaccard) : 40%
 *   - Score IA (Perplexité/Burstiness) : 35%
 *   - Score web (Rabin-Karp) : 25%
 */
class RapportService
{
    /**
     * Génère les données structurées du rapport pour une vérification.
     */
    public function generer(Verification $verification): array
    {
        $verification->load(['document.etudiant', 'sources']);

        $document = $verification->document;
        $etudiant = $document->etudiant;

        return [
            'meta' => [
                'titre'            => 'Rapport de Vérification DIRMA',
                'date'             => now()->format('d/m/Y H:i'),
                'verification_id'  => $verification->id,
            ],
            'etudiant' => [
                'nom'         => $etudiant->name . ' ' . $etudiant->prenom,
                'matricule'   => $etudiant->matricule,
                'departement' => $etudiant->departement,
            ],
            'document' => [
                'titre'              => $document->titre,
                'type'               => strtoupper($document->type_fichier),
                'niveau'             => ucfirst($document->niveau),
                'annee_universitaire'=> $document->annee_universitaire,
            ],
            'scores' => [
                'local'   => $this->formaterScore($verification->score_local),
                'ia'      => $this->formaterScore($verification->score_ia),
                'web'     => $this->formaterScore($verification->score_web),
                'global'  => $this->formaterScore($verification->score_global),
                'niveau_risque' => $this->evaluerRisque($verification->score_global),
            ],
            'ponderation' => [
                'local' => '40%',
                'ia'    => '35%',
                'web'   => '25%',
            ],
            'details_ia'    => $verification->details_ia ?? [],
            'sources_local' => $verification->sources->where('type', 'local')->values(),
            'sources_web'   => $verification->sources->where('type', 'web')->values(),
            'conclusion'    => $this->genererConclusion($verification->score_global),
        ];
    }

    /**
     * Génère et retourne le PDF du rapport.
     */
    public function genererPdf(Verification $verification): \Barryvdh\DomPDF\PDF
    {
        $donnees = $this->generer($verification);
        return Pdf::loadView('rapports.verification', $donnees)
                  ->setPaper('a4', 'portrait');
    }

    /**
     * Évalue le niveau de risque selon le score global.
     */
    private function evaluerRisque(?float $score): string
    {
        if ($score === null) return 'Indéterminé';
        if ($score >= 70)   return 'Élevé';
        if ($score >= 40)   return 'Modéré';
        return 'Faible';
    }

    /**
     * Formate un score en pourcentage lisible.
     */
    private function formaterScore(?float $score): string
    {
        return $score !== null ? round($score, 2) . '%' : 'N/A';
    }

    /**
     * Génère une conclusion textuelle selon le score global.
     */
    private function genererConclusion(?float $score): string
    {
        if ($score === null) return 'Analyse incomplète.';

        if ($score >= 70) {
            return "Score de similarité élevé ({$score}%). Ce document présente des risques importants de plagiat ou de contenu généré par IA. Une révision approfondie est recommandée avant toute validation.";
        }

        if ($score >= 40) {
            return "Score de similarité modéré ({$score}%). Certains passages méritent une attention particulière. Une vérification manuelle est conseillée.";
        }

        return "Score de similarité faible ({$score}%). Le document semble original. Aucune anomalie majeure détectée.";
    }
}
