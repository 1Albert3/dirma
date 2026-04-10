<?php

namespace App\Services;

/**
 * Service d'analyse de similarité des thèmes — Précision maximale.
 *
 * Algorithmes combinés :
 *  1. TF-IDF + Cosinus          → similarité sémantique pondérée
 *  2. Jaccard sur bigrammes     → similarité structurelle
 *  3. Jaccard sur trigrammes    → similarité de séquences
 *  4. Levenshtein normalisé     → similarité caractère par caractère
 *  5. Overlap de mots-clés      → mots significatifs communs
 *
 * Score final = combinaison pondérée des 5 méthodes → 0 à 100%
 */
class TfIdfService
{
    private array $stopWords = [
        // Français
        'le','la','les','de','du','des','un','une','et','en','au','aux',
        'ce','se','sa','son','ses','sur','par','pour','dans','avec','est',
        'sont','que','qui','ou','ne','pas','plus','il','elle','nous','vous',
        'ils','elles','je','tu','on','mais','donc','or','ni','car','si',
        'tout','tous','toute','toutes','cette','cet','ces','mon','ton','ma',
        'ta','mes','tes','leur','leurs','dont','où','quand','comme','très',
        'bien','aussi','même','encore','déjà','puis','alors','après','avant',
        'lors','entre','vers','chez','sans','sous','lors','selon','afin',
        // Anglais
        'the','of','and','to','a','in','is','it','that','was','for','on',
        'are','with','as','at','be','by','from','this','have','an','not',
        'but','had','has','its','were','been','their','there','which','when',
    ];

    /**
     * Analyse complète multi-algorithmes.
     * Retourne le score max et le détail par méthode.
     */
    public function analyserComplet(string $nouveauTexte, array $textesExistants): array
    {
        if (empty($textesExistants)) {
            return ['score' => 0.0, 'details' => [], 'meilleure_correspondance' => null];
        }

        $scoreMax    = 0.0;
        $meilleureCorrespondance = null;
        $details     = [];

        foreach ($textesExistants as $index => $texteRef) {
            $scores = $this->comparerDeuxTextes($nouveauTexte, $texteRef['texte']);

            // Score combiné pondéré
            $scoreCombine = round(
                ($scores['tfidf']      * 0.35) +
                ($scores['bigrammes']  * 0.20) +
                ($scores['trigrammes'] * 0.20) +
                ($scores['keywords']   * 0.15) +
                ($scores['levenshtein']* 0.10),
                2
            );

            $details[] = [
                'reference' => $texteRef['reference'] ?? "Thème #{$index}",
                'score'     => $scoreCombine,
                'methodes'  => $scores,
            ];

            if ($scoreCombine > $scoreMax) {
                $scoreMax = $scoreCombine;
                $meilleureCorrespondance = $texteRef['reference'] ?? "Thème #{$index}";
            }
        }

        // Trier par score décroissant
        usort($details, fn($a, $b) => $b['score'] <=> $a['score']);

        return [
            'score'                   => $scoreMax,
            'details'                 => array_slice($details, 0, 5), // top 5
            'meilleure_correspondance'=> $meilleureCorrespondance,
        ];
    }

    /**
     * Méthode simplifiée pour compatibilité (retourne juste le score max).
     */
    public function calculerSimilarite(string $nouveauTexte, array $textesExistants): float
    {
        if (empty($textesExistants)) return 0.0;

        // Convertir en format attendu par analyserComplet
        $formatted = array_map(fn($t, $i) => ['texte' => $t, 'reference' => "Thème #{$i}"],
            $textesExistants, array_keys($textesExistants));

        $resultat = $this->analyserComplet($nouveauTexte, $formatted);
        return $resultat['score'];
    }

    /**
     * Compare deux textes avec les 5 algorithmes.
     */
    public function comparerDeuxTextes(string $texteA, string $texteB): array
    {
        $tokensA = $this->tokeniser($texteA);
        $tokensB = $this->tokeniser($texteB);

        return [
            'tfidf'       => $this->scoreTfIdf($tokensA, $tokensB),
            'bigrammes'   => $this->scoreNgrammes($tokensA, $tokensB, 2),
            'trigrammes'  => $this->scoreNgrammes($tokensA, $tokensB, 3),
            'keywords'    => $this->scoreKeywords($tokensA, $tokensB),
            'levenshtein' => $this->scoreLevenshtein($texteA, $texteB),
        ];
    }

    // ─── Algorithme 1 : TF-IDF + Cosinus ────────────────────────────────────

    private function scoreTfIdf(array $tokensA, array $tokensB): float
    {
        $corpus = [$tokensA, $tokensB];
        $vocab  = array_unique(array_merge($tokensA, $tokensB));

        if (empty($vocab)) return 0.0;

        $vecA = $this->vecteurTfIdf($tokensA, $corpus, $vocab);
        $vecB = $this->vecteurTfIdf($tokensB, $corpus, $vocab);

        return round($this->cosinus($vecA, $vecB) * 100, 2);
    }

    private function vecteurTfIdf(array $tokens, array $corpus, array $vocab): array
    {
        $tf  = $this->tf($tokens);
        $idf = $this->idf($vocab, $corpus);
        $vec = [];
        foreach ($vocab as $mot) {
            $vec[$mot] = ($tf[$mot] ?? 0) * ($idf[$mot] ?? 0);
        }
        return $vec;
    }

    private function tf(array $tokens): array
    {
        $n = count($tokens);
        if ($n === 0) return [];
        $freq = array_count_values($tokens);
        return array_map(fn($c) => $c / $n, $freq);
    }

    private function idf(array $vocab, array $corpus): array
    {
        $n   = count($corpus);
        $idf = [];
        foreach ($vocab as $mot) {
            $df = count(array_filter($corpus, fn($t) => in_array($mot, $t)));
            $idf[$mot] = $df > 0 ? log(($n + 1) / ($df + 1)) + 1 : 1.0; // IDF lissé
        }
        return $idf;
    }

    private function cosinus(array $a, array $b): float
    {
        $dot = $na = $nb = 0.0;
        foreach ($a as $k => $v) {
            $dot += $v * ($b[$k] ?? 0);
            $na  += $v ** 2;
        }
        foreach ($b as $v) { $nb += $v ** 2; }
        $na = sqrt($na); $nb = sqrt($nb);
        return ($na > 0 && $nb > 0) ? $dot / ($na * $nb) : 0.0;
    }

    // ─── Algorithme 2 & 3 : N-grammes + Jaccard ─────────────────────────────

    private function scoreNgrammes(array $tokensA, array $tokensB, int $n): float
    {
        $ngrA = $this->ngrammes($tokensA, $n);
        $ngrB = $this->ngrammes($tokensB, $n);

        if (empty($ngrA) || empty($ngrB)) return 0.0;

        $inter = count(array_intersect($ngrA, $ngrB));
        $union = count(array_unique(array_merge($ngrA, $ngrB)));

        return $union > 0 ? round(($inter / $union) * 100, 2) : 0.0;
    }

    private function ngrammes(array $tokens, int $n): array
    {
        $result = [];
        for ($i = 0; $i <= count($tokens) - $n; $i++) {
            $result[] = implode(' ', array_slice($tokens, $i, $n));
        }
        return $result;
    }

    // ─── Algorithme 4 : Overlap mots-clés ───────────────────────────────────

    private function scoreKeywords(array $tokensA, array $tokensB): float
    {
        // Garder uniquement les mots longs (> 4 chars) = mots significatifs
        $kwA = array_unique(array_filter($tokensA, fn($t) => mb_strlen($t) > 4));
        $kwB = array_unique(array_filter($tokensB, fn($t) => mb_strlen($t) > 4));

        if (empty($kwA) || empty($kwB)) return 0.0;

        // Chercher aussi les correspondances partielles (stemming simplifié)
        $matches = 0;
        foreach ($kwA as $motA) {
            foreach ($kwB as $motB) {
                // Correspondance exacte ou préfixe commun (5 premiers chars)
                if ($motA === $motB || (mb_strlen($motA) >= 5 && mb_strlen($motB) >= 5 &&
                    mb_substr($motA, 0, 5) === mb_substr($motB, 0, 5))) {
                    $matches++;
                    break;
                }
            }
        }

        $min = min(count($kwA), count($kwB));
        return $min > 0 ? round(($matches / $min) * 100, 2) : 0.0;
    }

    // ─── Algorithme 5 : Levenshtein normalisé ───────────────────────────────

    private function scoreLevenshtein(string $texteA, string $texteB): float
    {
        // Travailler sur des versions courtes pour la performance
        $a = mb_strtolower(mb_substr(preg_replace('/\s+/', ' ', $texteA), 0, 200));
        $b = mb_strtolower(mb_substr(preg_replace('/\s+/', ' ', $texteB), 0, 200));

        if (empty($a) || empty($b)) return 0.0;

        $dist = levenshtein($a, $b);
        $max  = max(mb_strlen($a), mb_strlen($b));

        return $max > 0 ? round((1 - $dist / $max) * 100, 2) : 0.0;
    }

    // ─── Tokenisation ────────────────────────────────────────────────────────

    private function tokeniser(string $texte): array
    {
        $texte = mb_strtolower($texte);
        $texte = preg_replace('/[^a-zàâäéèêëîïôùûüç\s]/u', ' ', $texte);
        $mots  = preg_split('/\s+/', trim($texte));

        return array_values(array_filter($mots, fn($m) =>
            mb_strlen($m) > 2 && !in_array($m, $this->stopWords)
        ));
    }
}
