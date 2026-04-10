<?php

namespace App\Services;

use App\Models\NotificationDirma;

/**
 * Service centralisé pour l'envoi de notifications aux utilisateurs.
 */
class NotificationService
{
    /**
     * Envoie une notification à un utilisateur.
     */
    public function notifier(
        int    $destinataireId,
        string $titre,
        string $message,
        string $type  = 'info',
        string $lien  = null
    ): NotificationDirma {
        return NotificationDirma::create([
            'destinataire_id' => $destinataireId,
            'titre'           => $titre,
            'message'         => $message,
            'type'            => $type,
            'lien'            => $lien,
            'lu'              => false,
        ]);
    }

    /**
     * Marque toutes les notifications d'un utilisateur comme lues.
     */
    public function marquerToutesLues(int $userId): void
    {
        NotificationDirma::where('destinataire_id', $userId)
            ->where('lu', false)
            ->update(['lu' => true]);
    }
}
