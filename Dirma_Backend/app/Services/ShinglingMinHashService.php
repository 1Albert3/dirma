<?php

namespace App\Services;

/**
 * Service Shingling + MinHash + Coefficient de Jaccard
 * Utilisé pour la comparaison locale de documents (Phase 2).
 *
 * Shingling : découpe le texte en séquences de k mots consécutifs.
 * MinHash   : génère une signature compacte (empreinte) du document.
 * Jaccard   : |A ∩ B| / |A ∪ B| — proportion de shingles communs.
 */
class ShinglingMinHashService
{
    // Taille des shingles (nombre de mots par séquence)
    private int $k = 5;

    // Nombre de fonctions de hachage pour MinHash
    private int $nbHashFunctions = 100;

    // Seuil de similarité Jaccard au-delà duquel c'est du plagiat (%)
    private float $seuilPlagiat = 30.0;

    /**
     * Analyse un document contre tous les documents archivés.
     * Retourne un tableau avec le score global et les sources détectées.
     */
    public function analyser(string $texteNouveau, array $documentsArchives): array
    {
        $shinglesNouveau   = $this->genererShingles($texteNouveau);
        $signatureNouveau  = $this->calculerMinHash($shinglesNouveau);

        $sources    = [];
        $scoreMax   = 0.0;

        foreach ($documentsArchives as $doc) {
            $shinglesDoc  = $this->genererShingles($doc['texte']);
            $signatureDoc = $this->calculerMinHash($shinglesDoc);

            // Estimation rapide via MinHash
            $estimationJaccard = $this->estimerJaccardMinHash($signatureNouveau, $signatureDoc);

            // Calcul exact si l'estimation dépasse le seuil
            if ($estimationJaccard * 100 >= $this->seuilPlagiat) {
                $jaccardExact = $this->calculerJaccardExact($shinglesNouveau, $shinglesDoc);
                $taux = round($jaccardExact * 100, 2);

                if ($taux >= $this->seuilPlagiat) {
                    $sources[] = [
                        'document_ref'    => $doc['reference'],
                        'taux_similarite' => $taux,
                    ];
                    if ($taux > $scoreMax) {
                        $scoreMax = $taux;
                    }
                }
            }
        }

        return [
            'score'   => $scoreMax,
            'sources' => $sources,
        ];
    }

    /**
     * Génère les shingles d'un texte.
     * Exemple avec k=3 : "le chat mange" → ["le chat mange", "chat mange du", ...]
     */
    public function genererShingles(string $texte): array
    {
        $texte = mb_strtolower(preg_replace('/\s+/', ' ', trim($texte)));
        $mots  = explode(' ', $texte);
        $shingles = [];

        for ($i = 0; $i <= count($mots) - $this->k; $i++) {
            $shingles[] = implode(' ', array_slice($mots, $i, $this->k));
        }

        return array_unique($shingles);
    }

    /**
     * Calcule la signature MinHash d'un ensemble de shingles.
     * Utilise des fonctions de hachage linéaires : h(x) = (a*x + b) mod p
     */
    private function calculerMinHash(array $shingles): array
    {
        if (empty($shingles)) return array_fill(0, $this->nbHashFunctions, PHP_INT_MAX);

        // Paramètres des fonctions de hachage (pré-calculés)
        $p = 4294967311; // grand nombre premier
        srand(42);       // graine fixe pour reproductibilité
        $params = [];
        for ($i = 0; $i < $this->nbHashFunctions; $i++) {
            $params[] = [rand(1, $p - 1), rand(0, $p - 1)];
        }

        $signature = array_fill(0, $this->nbHashFunctions, PHP_INT_MAX);

        foreach ($shingles as $shingle) {
            $hashBase = crc32($shingle);
            for ($i = 0; $i < $this->nbHashFunctions; $i++) {
                [$a, $b] = $params[$i];
                $h = (($a * abs($hashBase) + $b) % $p);
                if ($h < $signature[$i]) {
                    $signature[$i] = $h;
                }
            }
        }

        return $signature;
    }

    /**
     * Estime le coefficient de Jaccard via les signatures MinHash.
     * Jaccard ≈ proportion de positions identiques dans les deux signatures.
     */
    private function estimerJaccardMinHash(array $sigA, array $sigB): float
    {
        $identiques = 0;
        $n = count($sigA);

        for ($i = 0; $i < $n; $i++) {
            if ($sigA[$i] === $sigB[$i]) {
                $identiques++;
            }
        }

        return $identiques / $n;
    }

    /**
     * Calcule le coefficient de Jaccard exact entre deux ensembles de shingles.
     * J(A,B) = |A ∩ B| / |A ∪ B|
     */
    private function calculerJaccardExact(array $shinglesA, array $shinglesB): float
    {
        $intersection = count(array_intersect($shinglesA, $shinglesB));
        $union        = count(array_unique(array_merge($shinglesA, $shinglesB)));

        return $union > 0 ? $intersection / $union : 0.0;
    }
}
