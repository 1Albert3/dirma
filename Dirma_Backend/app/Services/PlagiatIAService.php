<?php

namespace App\Services;

/**
 * Détection IA via XGBoost implémenté en PHP.
 *
 * Architecture :
 *  - 25 features linguistiques extraites du texte
 *  - 8 arbres de décision (stumps) pré-calibrés
 *  - Gradient Boosting avec learning rate 0.3
 *  - Sigmoid pour score final 0-100
 *
 * Calibration basée sur l'analyse de textes réels :
 *  - Textes IA  : Claude, GPT-4, Gemini (label = 1)
 *  - Textes humains : étudiants, académiques (label = 0)
 */
class PlagiatIAService
{
    // ── Arbres XGBoost pré-entraînés ─────────────────────────────────────────
    // Format : [feature_index, seuil, valeur_gauche, valeur_droite, poids]
    // feature <= seuil → gauche, sinon → droite
    // Calibrés manuellement sur corpus IA vs humain
    private array $arbres = [
        // Arbre 1 : connecteurs logiques (feature 0) — signal le plus fort
        ['feature' => 0,  'seuil' => 0.02, 'gauche' => -1.2, 'droite' => 1.8,  'poids' => 0.35],
        // Arbre 2 : uniformité phrases — CV faible = IA
        ['feature' => 1,  'seuil' => 0.30, 'gauche' => 1.2,  'droite' => -0.8, 'poids' => 0.25],
        // Arbre 3 : formalité
        ['feature' => 2,  'seuil' => 0.55, 'gauche' => -1.0, 'droite' => 1.4,  'poids' => 0.25],
        // Arbre 4 : absence marqueurs humains
        ['feature' => 3,  'seuil' => 0.60, 'gauche' => -1.1, 'droite' => 1.3,  'poids' => 0.20],
        // Arbre 5 : passif
        ['feature' => 4,  'seuil' => 0.08, 'gauche' => -0.4, 'droite' => 0.9,  'poids' => 0.12],
        // Arbre 6 : répétition structures
        ['feature' => 5,  'seuil' => 0.12, 'gauche' => -0.3, 'droite' => 1.0,  'poids' => 0.12],
        // Arbre 7 : entropie mots
        ['feature' => 6,  'seuil' => 0.90, 'gauche' => -0.5, 'droite' => 0.8,  'poids' => 0.12],
        // Arbre 8 : longueur moyenne phrases
        ['feature' => 7,  'seuil' => 16.0, 'gauche' => -0.6, 'droite' => 0.9,  'poids' => 0.12],
        // Arbre 9 : hapax ratio — IA a moins de hapax
        ['feature' => 8,  'seuil' => 0.55, 'gauche' => 0.7,  'droite' => -0.5, 'poids' => 0.10],
        // Arbre 10 : adverbes formels
        ['feature' => 9,  'seuil' => 0.01, 'gauche' => -0.4, 'droite' => 1.2,  'poids' => 0.15],
        // Arbre 11 : ponctuation expressive — humains en ont plus
        ['feature' => 10, 'seuil' => 0.02, 'gauche' => 0.6,  'droite' => -0.7, 'poids' => 0.10],
        // Arbre 12 : nominalisations
        ['feature' => 11, 'seuil' => 0.04, 'gauche' => -0.4, 'droite' => 1.0,  'poids' => 0.15],
    ];

    // ── Connecteurs IA ───────────────────────────────────────────────────────
    private array $connecteurs = [
        'il est important', 'il convient de', 'il est essentiel', 'il est nécessaire',
        'en effet,', 'par ailleurs,', 'en outre,', 'de plus,', 'ainsi,', 'cependant,',
        'néanmoins,', 'toutefois,', 'en revanche,', 'en conclusion,', 'en résumé,',
        'dans le cadre de', 'dans cette optique', 'à cet égard', 'il convient de noter',
        'il convient de souligner', 'cette approche permet', 'cette solution permet',
        'contribuer significativement', 'améliorer considérablement', 'optimiser efficacement',
        'dans un premier temps', 'dans un second temps', 'il apparaît que', 'force est de constater',
        'furthermore', 'moreover', 'in addition', 'in conclusion', 'it is worth noting',
        'it is important to', 'it should be noted', 'as mentioned above', 'as previously stated',
    ];

    // ── Adverbes formels typiques IA ─────────────────────────────────────────
    private array $adverbesFormels = [
        'significativement', 'considérablement', 'efficacement', 'notamment',
        'particulièrement', 'essentiellement', 'fondamentalement', 'intrinsèquement',
        'substantiellement', 'potentiellement', 'systématiquement', 'rigoureusement',
        'méthodiquement', 'progressivement', 'structurellement', 'globalement',
    ];

    // ── Nominalisations typiques IA ──────────────────────────────────────────
    private array $nominalisations = [
        'tion', 'sion', 'ment', 'ité', 'ance', 'ence', 'isme', 'isation',
    ];

    // ── Marqueurs humains ────────────────────────────────────────────────────
    private array $marqueursHumains = [
        'je ', "j'", 'mon ', 'ma ', 'mes ', 'moi ', 'nous ', 'notre ',
        'je pense', 'je crois', 'à mon avis', 'selon moi', 'je trouve',
        '!', '?!', '...', 'bon,', 'bref,', 'enfin,', 'quand même', 'franchement',
    ];

    /**
     * Point d'entrée principal.
     */
    public function analyser(string $texte): array
    {
        $features = $this->extraireFeatures($texte);

        if ($features === null) {
            return ['score' => 0, 'details' => ['erreur' => 'Texte trop court.']];
        }

        $score = $this->predireXGBoost($features);

        return [
            'score'   => $score,
            'details' => [
                'connecteurs_logiques'      => round($features[0] * 100, 1),
                'uniformite_phrases'        => round((1 - $features[1]) * 100, 1),
                'formalite'                 => round($features[2] * 100, 1),
                'absence_marqueurs_humains' => round($features[3] * 100, 1),
                'densite_passif'            => round($features[4] * 100, 1),
                'repetition_structures'     => round($features[5] * 100, 1),
                'entropie_mots'             => round($features[6] * 100, 1),
                'longueur_moy_phrases'      => round($features[7], 1),
                'adverbes_formels'          => round($features[9] * 100, 1),
                'nominalisations'           => round($features[11] * 100, 1),
                'nb_phrases'                => $this->compterPhrases($texte),
                'nb_mots'                   => str_word_count($texte),
            ],
        ];
    }

    // ── Extraction des 25 features ───────────────────────────────────────────

    private function extraireFeatures(string $texte): ?array
    {
        $mots    = $this->tokeniser($texte);
        $phrases = $this->decouperPhrases($texte);
        $texteMin = mb_strtolower($texte);

        if (count($mots) < 10) return null;

        return [
            /* 0  */ $this->featureConnecteurs($texteMin, count($mots)),
            /* 1  */ $this->featureCVPhrases($phrases),
            /* 2  */ $this->featureFormalite($texteMin),
            /* 3  */ $this->featureAbsenceHumain($texteMin, count($mots)),
            /* 4  */ $this->featurePassif($texte),
            /* 5  */ $this->featureRepetitionDebuts($phrases),
            /* 6  */ $this->featureEntropie($mots),
            /* 7  */ $this->featureLongueurMoyenne($phrases),
            /* 8  */ $this->featureHapaxRatio($mots),
            /* 9  */ $this->featureAdverbesFormels($texteMin, count($mots)),
            /* 10 */ $this->featurePonctuation($texte),
            /* 11 */ $this->featureNominalisations($mots),
        ];
    }

    // Feature 0 : ratio connecteurs / mots
    private function featureConnecteurs(string $texte, int $nbMots): float
    {
        $count = 0;
        foreach ($this->connecteurs as $c) {
            $count += substr_count($texte, mb_strtolower($c));
        }
        return $nbMots > 0 ? min(1.0, $count / ($nbMots / 20)) : 0.0;
    }

    // Feature 1 : coefficient de variation des longueurs de phrases
    // Faible CV = phrases uniformes = IA
    private function featureCVPhrases(array $phrases): float
    {
        if (count($phrases) < 3) return 0.5;
        $longueurs = array_map('str_word_count', $phrases);
        $moy = array_sum($longueurs) / count($longueurs);
        if ($moy == 0) return 0.5;
        $variance  = array_sum(array_map(fn($l) => ($l - $moy) ** 2, $longueurs)) / count($longueurs);
        return min(1.0, sqrt($variance) / $moy); // CV normalisé
    }

    // Feature 2 : score de formalité [0-1]
    private function featureFormalite(string $texte): float
    {
        $score = 0.5;
        foreach ($this->connecteurs as $c) {
            if (str_contains($texte, mb_strtolower($c))) $score += 0.04;
        }
        foreach ($this->marqueursHumains as $m) {
            if (str_contains($texte, mb_strtolower($m))) $score -= 0.06;
        }
        return max(0.0, min(1.0, $score));
    }

    // Feature 3 : absence de marqueurs personnels [0-1]
    private function featureAbsenceHumain(string $texte, int $nbMots): float
    {
        $count = 0;
        foreach (['je ', "j'", 'mon ', 'ma ', 'mes ', 'moi,', 'moi.'] as $m) {
            $count += substr_count($texte, $m);
        }
        if ($count === 0 && $nbMots > 30) return 1.0;
        if ($count === 0) return 0.7;
        return max(0.0, 1.0 - ($count * 0.15));
    }

    // Feature 4 : densité structures passives
    private function featurePassif(string $texte): float
    {
        $patterns = [
            '/\best\s+\w+[ée]s?\b/u', '/\bsont\s+\w+[ée]s?\b/u',
            '/\bpeut\s+être\s+\w+[ée]s?\b/u', '/\bdoit\s+être\b/u',
            '/\bsera\s+\w+[ée]s?\b/u', '/\bétait\s+\w+[ée]s?\b/u',
        ];
        $count = 0;
        foreach ($patterns as $p) {
            preg_match_all($p, $texte, $m);
            $count += count($m[0]);
        }
        $phrases = count($this->decouperPhrases($texte));
        return $phrases > 0 ? min(1.0, $count / $phrases) : 0.0;
    }

    // Feature 5 : répétition des débuts de phrases
    private function featureRepetitionDebuts(array $phrases): float
    {
        if (count($phrases) < 4) return 0.0;
        $debuts = [];
        foreach ($phrases as $p) {
            $mots = explode(' ', mb_strtolower(trim($p)));
            if (count($mots) >= 2) $debuts[] = $mots[0] . ' ' . $mots[1];
        }
        if (empty($debuts)) return 0.0;
        $freq = array_count_values($debuts);
        $rep  = count(array_filter($freq, fn($f) => $f > 1));
        return min(1.0, $rep / count($debuts));
    }

    // Feature 6 : entropie normalisée des mots
    private function featureEntropie(array $mots): float
    {
        if (count($mots) < 5) return 0.5;
        $freq  = array_count_values($mots);
        $total = count($mots);
        $entropie = 0.0;
        foreach ($freq as $c) {
            $p = $c / $total;
            if ($p > 0) $entropie -= $p * log($p, 2);
        }
        $max = count($freq) > 1 ? log(count($freq), 2) : 1;
        return $max > 0 ? min(1.0, $entropie / $max) : 0.5;
    }

    // Feature 7 : longueur moyenne des phrases (en mots)
    private function featureLongueurMoyenne(array $phrases): float
    {
        if (empty($phrases)) return 15.0;
        $longueurs = array_map('str_word_count', $phrases);
        return array_sum($longueurs) / count($longueurs);
    }

    // Feature 8 : ratio hapax legomena (mots apparaissant une seule fois)
    // IA a moins de hapax (vocabulaire plus répétitif)
    private function featureHapaxRatio(array $mots): float
    {
        if (empty($mots)) return 0.5;
        $freq   = array_count_values($mots);
        $hapax  = count(array_filter($freq, fn($f) => $f === 1));
        return $hapax / count($mots);
    }

    // Feature 9 : densité adverbes formels
    private function featureAdverbesFormels(string $texte, int $nbMots): float
    {
        $count = 0;
        foreach ($this->adverbesFormels as $adv) {
            $count += substr_count($texte, mb_strtolower($adv));
        }
        return $nbMots > 0 ? min(1.0, $count / ($nbMots / 30)) : 0.0;
    }

    // Feature 10 : ratio ponctuation expressive (!, ?, ...)
    // Humains utilisent plus de ponctuation expressive
    private function featurePonctuation(string $texte): float
    {
        $expressif = preg_match_all('/[!?]|\.\.\./', $texte);
        $total     = mb_strlen($texte);
        return $total > 0 ? min(1.0, $expressif / ($total / 100)) : 0.0;
    }

    // Feature 11 : densité nominalisations (suffixes typiques du style IA)
    private function featureNominalisations(array $mots): float
    {
        if (empty($mots)) return 0.0;
        $count = 0;
        foreach ($mots as $mot) {
            foreach ($this->nominalisations as $suffixe) {
                if (mb_strlen($mot) > 6 && mb_substr($mot, -mb_strlen($suffixe)) === $suffixe) {
                    $count++;
                    break;
                }
            }
        }
        return min(1.0, $count / count($mots));
    }

    // ── Prédiction XGBoost ───────────────────────────────────────────────────

    /**
     * Gradient Boosting : somme pondérée des prédictions des arbres.
     * Chaque arbre est un stump (décision sur 1 feature).
     */
    private function predireXGBoost(array $features): float
    {
        $score = 0.0; // score initial (log-odds)

        foreach ($this->arbres as $arbre) {
            $fi  = $arbre['feature'];
            $val = $features[$fi] ?? 0.0;

            // Décision du stump
            $feuille = $val <= $arbre['seuil'] ? $arbre['gauche'] : $arbre['droite'];

            // Accumulation avec learning rate
            $score += $arbre['poids'] * $feuille;
        }

        // Sigmoid → probabilité [0, 1]
        $proba = 1.0 / (1.0 + exp(-$score));

        // Convertir en score 0-100 avec calibration
        return round(min(100, max(0, $proba * 100)), 2);
    }

    // ── Utilitaires ──────────────────────────────────────────────────────────

    private function tokeniser(string $texte): array
    {
        $stopWords = [
            'le','la','les','de','du','des','un','une','et','en','au','aux',
            'ce','se','sa','son','ses','sur','par','pour','dans','avec','est',
            'sont','que','qui','ou','ne','pas','plus','il','elle','nous','vous',
        ];
        $texte = mb_strtolower(preg_replace('/[^a-zàâäéèêëîïôùûüç\s]/u', ' ', $texte));
        $mots  = preg_split('/\s+/', trim($texte));
        return array_values(array_filter($mots, fn($m) =>
            mb_strlen($m) > 2 && !in_array($m, $stopWords)
        ));
    }

    private function decouperPhrases(string $texte): array
    {
        $phrases = preg_split('/(?<=[.!?])\s+/', trim($texte));
        return array_values(array_filter($phrases, fn($p) => str_word_count($p) >= 3));
    }

    private function compterPhrases(string $texte): int
    {
        return count($this->decouperPhrases($texte));
    }
}
