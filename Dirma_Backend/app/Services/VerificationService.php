<?php

namespace App\Services;

use App\Models\Document;
use App\Models\Verification;
use App\Models\SourcePlagiat;
use App\Models\NotificationDirma;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

/**
 * Service principal qui orchestre les 4 phases de vérification d'un document.
 * Coordonne ShinglingMinHash, PlagiatIA et RabinKarp.
 */
class VerificationService
{
    public function __construct(
        private ShinglingMinHashService $shinglingService,
        private PlagiatIAService        $iaService,
        private RabinKarpService        $rabinKarpService,
        private NotificationService     $notificationService,
    ) {}

    /**
     * Lance la vérification complète d'un document.
     * Crée une entrée Verification et exécute les 3 phases d'analyse.
     */
    public function lancer(Document $document): Verification
    {
        // Créer l'entrée de vérification
        $verification = Verification::create([
            'document_id' => $document->id,
            'etudiant_id' => $document->etudiant_id,
            'statut'      => 'en_cours',
        ]);

        $document->update(['statut' => 'en_verification']);

        try {
            // Extraire le texte du document
            $texte = $this->extraireTexte($document);

            // Phase 2 : Analyse locale (Shingling + MinHash + Jaccard)
            $resultatsLocal = $this->analyserLocal($verification, $texte, $document->id);

            // Phase 3 : Détection IA (Perplexité + Burstiness)
            $resultatsIA = $this->analyserIA($verification, $texte);

            // Phase 4 : Recherche web (Rabin-Karp)
            $resultatsWeb = $this->analyserWeb($verification, $texte);

            // Phase 5 : Calcul du score global pondéré
            // Local 40% + IA 35% + Web 25%
            $scoreGlobal = round(
                ($resultatsLocal['score'] * 0.40) +
                ($resultatsIA['score']    * 0.35) +
                ($resultatsWeb['score']   * 0.25),
                2
            );

            $verification->update([
                'score_local'  => $resultatsLocal['score'],
                'score_ia'     => $resultatsIA['score'],
                'score_web'    => $resultatsWeb['score'],
                'score_global' => $scoreGlobal,
                'details_ia'   => $resultatsIA['details'],
                'statut'       => 'termine',
            ]);

            $document->update(['statut' => 'verifie']);

            // Notifier l'étudiant
            $this->notificationService->notifier(
                $document->etudiant_id,
                'Vérification terminée',
                "La vérification de votre document \"{$document->titre}\" est terminée. Score global : {$scoreGlobal}%",
                'info',
                "/etudiant/verifications/{$verification->id}"
            );

        } catch (\Exception $e) {
            Log::error("Erreur vérification document #{$document->id} : " . $e->getMessage());
            $verification->update(['statut' => 'erreur']);
            $document->update(['statut' => 'depose']);
        }

        return $verification->fresh();
    }

    /**
     * Phase 2 : Analyse locale avec Shingling + MinHash + Jaccard.
     */
    private function analyserLocal(Verification $verification, string $texte, int $documentId): array
    {
        // Récupérer tous les autres documents archivés
        $documentsArchives = Document::where('id', '!=', $documentId)
            ->where('statut', 'valide')
            ->get()
            ->map(function ($doc) {
                $texte = $this->extraireTexte($doc);
                return ['reference' => "DOC-{$doc->id} : {$doc->titre}", 'texte' => $texte];
            })
            ->toArray();

        $resultats = $this->shinglingService->analyser($texte, $documentsArchives);

        // Sauvegarder les sources locales détectées
        foreach ($resultats['sources'] as $source) {
            SourcePlagiat::create([
                'verification_id' => $verification->id,
                'type'            => 'local',
                'document_ref'    => $source['document_ref'],
                'taux_similarite' => $source['taux_similarite'],
            ]);
        }

        $verification->update(['details_local' => $resultats]);

        return $resultats;
    }

    /**
     * Phase 3 : Détection IA avec Perplexité + Burstiness.
     */
    private function analyserIA(Verification $verification, string $texte): array
    {
        $resultats = $this->iaService->analyser($texte);
        $verification->update(['details_ia' => $resultats['details']]);
        return $resultats;
    }

    /**
     * Phase 4 : Recherche web avec Rabin-Karp.
     */
    private function analyserWeb(Verification $verification, string $texte): array
    {
        $resultats = $this->rabinKarpService->analyser($texte);

        // Sauvegarder les sources web détectées
        foreach ($resultats['sources'] as $source) {
            SourcePlagiat::create([
                'verification_id'  => $verification->id,
                'type'             => 'web',
                'url'              => $source['url'],
                'taux_similarite'  => $source['taux_similarite'],
                'passage_original' => $source['passage_original'] ?? null,
                'passage_source'   => $source['passage_source'] ?? null,
            ]);
        }

        $verification->update(['details_web' => $resultats]);

        return $resultats;
    }

    /**
     * Extrait le texte brut d'un document PDF ou DOCX.
     */
    public function extraireTexte(Document $document): string
    {
        $chemin = Storage::path($document->fichier_path);

        if (!file_exists($chemin)) {
            return '';
        }

        if ($document->type_fichier === 'pdf') {
            return $this->extraireTextePdf($chemin);
        }

        if ($document->type_fichier === 'docx') {
            return $this->extraireTexteDocx($chemin);
        }

        return '';
    }

    /**
     * Extrait le texte d'un PDF via pdftotext (poppler-utils).
     */
    private function extraireTextePdf(string $chemin): string
    {
        $output = shell_exec("pdftotext " . escapeshellarg($chemin) . " -");
        return $output ?? '';
    }

    /**
     * Extrait le texte d'un DOCX (format ZIP contenant du XML).
     */
    private function extraireTexteDocx(string $chemin): string
    {
        try {
            $zip = new \ZipArchive();
            if ($zip->open($chemin) !== true) return '';

            $xml = $zip->getFromName('word/document.xml');
            $zip->close();

            if (!$xml) return '';

            // Supprimer les balises XML et décoder les entités
            $texte = strip_tags(str_replace('</w:p>', "\n", $xml));
            return html_entity_decode($texte, ENT_QUOTES, 'UTF-8');

        } catch (\Exception $e) {
            Log::error("Erreur extraction DOCX : " . $e->getMessage());
            return '';
        }
    }
}
