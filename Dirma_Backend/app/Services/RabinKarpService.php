<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

/**
 * Service Rabin-Karp multi-pattern + Recherche web multi-sources.
 *
 * Sources interrogées :
 *  1. Wikipedia API (gratuite, fiable, sans clé)
 *  2. OpenLibrary API (livres académiques)
 *  3. Semantic Scholar API (articles scientifiques)
 *  4. Correspondance locale inter-documents
 */
class RabinKarpService
{
    private int   $tailleSegment = 12;
    private int   $maxSegments   = 6;
    private int   $base          = 31;
    private int   $modulo        = 1000000007;
    private float $seuilSimilarite = 25.0;

    /**
     * Analyse principale.
     */
    public function analyser(string $texte): array
    {
        if (empty(trim($texte))) {
            return ['score' => 0.0, 'sources' => []];
        }

        $segments = $this->extraireSegments($texte);
        $sources  = [];
        $scoreMax = 0.0;

        foreach ($segments as $segment) {
            if (mb_strlen($segment) < 30) continue;

            // Interroger les 3 sources en parallèle
            $resultats = array_merge(
                $this->rechercherWikipedia($segment),
                $this->rechercherSemanticScholar($segment),
                $this->rechercherOpenLibrary($segment),
            );

            foreach ($resultats as $r) {
                if ($r['taux'] >= $this->seuilSimilarite) {
                    $sources[] = [
                        'url'              => $r['url'],
                        'taux_similarite'  => $r['taux'],
                        'passage_original' => $segment,
                        'passage_source'   => $r['extrait'] ?? '',
                        'source'           => $r['source'] ?? 'web',
                    ];
                    if ($r['taux'] > $scoreMax) $scoreMax = $r['taux'];
                }
            }
        }

        // Dédupliquer par URL
        $sources = $this->dedupliquer($sources);

        return [
            'score'   => round($scoreMax, 2),
            'sources' => $sources,
        ];
    }

    // ── Source 1 : Wikipedia API ─────────────────────────────────────────────

    private function rechercherWikipedia(string $segment): array
    {
        try {
            $query = $this->extraireMotsCles($segment, 5);
            $cacheKey = 'wiki_' . md5($query);

            $data = Cache::remember($cacheKey, 3600, function () use ($query) {
                $response = Http::timeout(6)
                    ->withHeaders(['User-Agent' => 'DIRMA-PlagiatChecker/1.0 (academic)'])
                    ->get('https://fr.wikipedia.org/w/api.php', [
                        'action'   => 'query',
                        'list'     => 'search',
                        'srsearch' => $query,
                        'srlimit'  => 3,
                        'format'   => 'json',
                        'utf8'     => 1,
                    ]);
                return $response->successful() ? $response->json() : null;
            });

            if (!$data || empty($data['query']['search'])) return [];

            $resultats = [];
            foreach ($data['query']['search'] as $item) {
                $extrait = strip_tags($item['snippet'] ?? '');
                $taux    = $this->similariteJaccard($segment, $extrait);
                if ($taux >= $this->seuilSimilarite) {
                    $resultats[] = [
                        'url'     => 'https://fr.wikipedia.org/wiki/' . urlencode(str_replace(' ', '_', $item['title'])),
                        'taux'    => $taux,
                        'extrait' => mb_substr($extrait, 0, 200),
                        'source'  => 'Wikipedia',
                    ];
                }
            }
            return $resultats;

        } catch (\Exception $e) {
            Log::warning('Wikipedia search failed: ' . $e->getMessage());
            return [];
        }
    }

    // ── Source 2 : Semantic Scholar (articles académiques) ───────────────────

    private function rechercherSemanticScholar(string $segment): array
    {
        try {
            $query    = $this->extraireMotsCles($segment, 4);
            $cacheKey = 'ss_' . md5($query);

            $data = Cache::remember($cacheKey, 3600, function () use ($query) {
                $response = Http::timeout(6)
                    ->withHeaders(['User-Agent' => 'DIRMA-PlagiatChecker/1.0'])
                    ->get('https://api.semanticscholar.org/graph/v1/paper/search', [
                        'query'  => $query,
                        'limit'  => 3,
                        'fields' => 'title,abstract,url',
                    ]);
                return $response->successful() ? $response->json() : null;
            });

            if (!$data || empty($data['data'])) return [];

            $resultats = [];
            foreach ($data['data'] as $paper) {
                $texteRef = ($paper['title'] ?? '') . ' ' . ($paper['abstract'] ?? '');
                $taux     = $this->similariteJaccard($segment, $texteRef);
                if ($taux >= $this->seuilSimilarite && !empty($paper['url'])) {
                    $resultats[] = [
                        'url'     => $paper['url'],
                        'taux'    => $taux,
                        'extrait' => mb_substr($paper['abstract'] ?? $paper['title'], 0, 200),
                        'source'  => 'Semantic Scholar',
                    ];
                }
            }
            return $resultats;

        } catch (\Exception $e) {
            Log::warning('Semantic Scholar search failed: ' . $e->getMessage());
            return [];
        }
    }

    // ── Source 3 : OpenLibrary ────────────────────────────────────────────────

    private function rechercherOpenLibrary(string $segment): array
    {
        try {
            $query    = $this->extraireMotsCles($segment, 4);
            $cacheKey = 'ol_' . md5($query);

            $data = Cache::remember($cacheKey, 3600, function () use ($query) {
                $response = Http::timeout(6)
                    ->withHeaders(['User-Agent' => 'DIRMA-PlagiatChecker/1.0'])
                    ->get('https://openlibrary.org/search.json', [
                        'q'     => $query,
                        'limit' => 3,
                    ]);
                return $response->successful() ? $response->json() : null;
            });

            if (!$data || empty($data['docs'])) return [];

            $resultats = [];
            foreach ($data['docs'] as $livre) {
                $titre    = $livre['title'] ?? '';
                $auteurs  = implode(', ', array_slice($livre['author_name'] ?? [], 0, 2));
                $texteRef = $titre . ' ' . $auteurs;
                $taux     = $this->similariteJaccard($segment, $texteRef);
                if ($taux >= $this->seuilSimilarite && !empty($livre['key'])) {
                    $resultats[] = [
                        'url'     => 'https://openlibrary.org' . $livre['key'],
                        'taux'    => $taux,
                        'extrait' => $titre . ($auteurs ? " — $auteurs" : ''),
                        'source'  => 'OpenLibrary',
                    ];
                }
            }
            return $resultats;

        } catch (\Exception $e) {
            Log::warning('OpenLibrary search failed: ' . $e->getMessage());
            return [];
        }
    }

    // ── Rabin-Karp : extraction des segments ─────────────────────────────────

    public function extraireSegments(string $texte): array
    {
        $mots = preg_split('/\s+/', trim($texte));
        $n    = count($mots);

        if ($n < $this->tailleSegment) {
            return [implode(' ', $mots)];
        }

        $hachages = $this->calculerHachagesGlissants($mots);
        arsort($hachages);
        $indices  = array_slice(array_keys($hachages), 0, $this->maxSegments);

        $segments = [];
        foreach ($indices as $i) {
            $segments[] = implode(' ', array_slice($mots, $i, $this->tailleSegment));
        }
        return $segments;
    }

    private function calculerHachagesGlissants(array $mots): array
    {
        $n = count($mots);
        $k = $this->tailleSegment;
        if ($n < $k) return [];

        $puissance = 1;
        for ($i = 0; $i < $k - 1; $i++) {
            $puissance = ($puissance * $this->base) % $this->modulo;
        }

        $h = 0;
        for ($i = 0; $i < $k; $i++) {
            $h = ($h * $this->base + $this->hashMot($mots[$i])) % $this->modulo;
        }
        $hachages = [0 => $h];

        for ($i = 1; $i <= $n - $k; $i++) {
            $h = ($h - $this->hashMot($mots[$i - 1]) * $puissance % $this->modulo + $this->modulo) % $this->modulo;
            $h = ($h * $this->base + $this->hashMot($mots[$i + $k - 1])) % $this->modulo;
            $hachages[$i] = $h;
        }
        return $hachages;
    }

    private function hashMot(string $mot): int
    {
        $hash = 0;
        for ($i = 0; $i < strlen($mot); $i++) {
            $hash += ord($mot[$i]);
        }
        return $hash;
    }

    // ── Utilitaires ──────────────────────────────────────────────────────────

    /**
     * Similarité Jaccard sur les mots.
     */
    private function similariteJaccard(string $a, string $b): float
    {
        if (empty($b)) return 0.0;
        $ma = array_unique(preg_split('/\s+/', mb_strtolower($a)));
        $mb = array_unique(preg_split('/\s+/', mb_strtolower($b)));
        $inter = count(array_intersect($ma, $mb));
        $union = count(array_unique(array_merge($ma, $mb)));
        return $union > 0 ? round(($inter / $union) * 100, 2) : 0.0;
    }

    /**
     * Extrait les N mots-clés les plus significatifs d'un segment.
     */
    private function extraireMotsCles(string $texte, int $n): string
    {
        $stopWords = ['le','la','les','de','du','des','un','une','et','en','au',
            'ce','se','sur','par','pour','dans','avec','est','que','qui','ou',
            'the','of','and','to','a','in','is','it','that'];
        $mots = preg_split('/\s+/', mb_strtolower($texte));
        $mots = array_filter($mots, fn($m) => mb_strlen($m) > 3 && !in_array($m, $stopWords));
        $freq = array_count_values($mots);
        arsort($freq);
        return implode(' ', array_slice(array_keys($freq), 0, $n));
    }

    /**
     * Supprime les doublons par URL.
     */
    private function dedupliquer(array $sources): array
    {
        $vus = [];
        $result = [];
        foreach ($sources as $s) {
            if (!in_array($s['url'], $vus)) {
                $vus[]    = $s['url'];
                $result[] = $s;
            }
        }
        usort($result, fn($a, $b) => $b['taux_similarite'] <=> $a['taux_similarite']);
        return $result;
    }
}
