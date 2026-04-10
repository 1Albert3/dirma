<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationDirma extends Model
{
    protected $table = 'notifications_dirma';

    protected $fillable = [
        'destinataire_id', 'titre', 'message',
        'type', 'lien', 'lu',
    ];

    protected $casts = [
        'lu' => 'boolean',
    ];

    public function destinataire()
    {
        return $this->belongsTo(User::class, 'destinataire_id');
    }
}
