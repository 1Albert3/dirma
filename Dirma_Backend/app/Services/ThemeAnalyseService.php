<?php

namespace App\Services;

use App\Models\Theme;

/**
 * Service d'analyse de thème.
 * Orchestre les analyses selon le type choisi par l'étudiant :
 *   - plagiat : TF-IDF + N-grammes + Jaccard + Levenshtein + Keywords
 *   - ia      : Perplexité + Burstiness + Patterns IA
 *   - les_deux: Combinaison des deux
 */
class ThemeAnalyseService
{
    public function __construct(
        private TfIdfService    $tfIdf,
        private PlagiatIAService $iaService,
    ) {}

    /**
     * Lance l'analyse complète selon le type demandé.
     */
    public function analyser(Theme $theme, string $typeAnalyse): array
    {
        $resultats = [
            'type_analyse'  => $typeAnalyse,
            'score_plagiat' => null,
            'score_ia'      => null,
            'score_global'  => null,
            'details'       => [],
        ];

        if (in_array($typeAnalyse, ['plagiat', 'les_deux'])) {
            $resultats = array_merge($resultats, $this->analyserPlagiat($theme));
        }

        if (in_array($typeAnalyse, ['ia', 'les_deux'])) {
            $resultats = array_merge($resultats, $this->analyserIA($theme));
        }

        // Score global selon le type
        $resultats['score_global'] = $this->calculerScoreGlobal($resultats, $typeAnalyse);

        return $resultats;
    }

    /**
     * Analyse plagiat : compare avec tous les thèmes existants.
     */
    private function analyserPlagiat(Theme $theme): array
    {
        $themesExistants = Theme::where('id', '!=', $theme->id)
            ->whereNotIn('statut', ['rejete_chef', 'rejete_da'])
            ->get()
            ->map(fn($t) => [
                'reference' => "#{$t->id} — {$t->titre}",
                'texte'     => $t->titre . ' ' . $t->description,
            ])
            ->toArray();

        $texteNouveau = $theme->titre . ' ' . $theme->description;

        if (empty($themesExistants)) {
            return [
                'score_plagiat'   => 0.0,
                'details_plagiat' => ['message' => 'Aucun thème existant pour comparaison.'],
            ];
        }

        $analyse = $this->tfIdf->analyserComplet($texteNouveau, $themesExistants);

        return [
            'score_plagiat'   => $analyse['score'],
            'details_plagiat' => [
                'meilleure_correspondance' => $analyse['meilleure_correspondance'],
                'top_correspondances'      => $analyse['details'],
                'nb_themes_compares'       => count($themesExistants),
            ],
        ];
    }

    /**
     * Analyse IA : détecte si le texte est généré par IA.
     */
    private function analyserIA(Theme $theme): array
    {
        $texte = $theme->titre . '. ' . $theme->description;
        $analyse = $this->iaService->analyser($texte);

        return [
            'score_ia'   => $analyse['score'],
            'details_ia' => $analyse['details'],
        ];
    }

    /**
     * Calcule le score global selon le type d'analyse.
     */
    private function calculerScoreGlobal(array $resultats, string $type): float
    {
        return match($type) {
            'plagiat'  => $resultats['score_plagiat'] ?? 0.0,
            'ia'       => $resultats['score_ia'] ?? 0.0,
            'les_deux' => round(
                (($resultats['score_plagiat'] ?? 0) * 0.60) +
                (($resultats['score_ia']      ?? 0) * 0.40),
                2
            ),
            default => 0.0,
        };
    }
}
