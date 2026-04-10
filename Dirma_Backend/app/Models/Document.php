<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'etudiant_id', 'theme_id', 'titre',
        'fichier_path', 'fichier_nom', 'type_fichier',
        'annee_universitaire', 'niveau', 'statut',
    ];

    public function etudiant()
    {
        return $this->belongsTo(User::class, 'etudiant_id');
    }

    public function theme()
    {
        return $this->belongsTo(Theme::class, 'theme_id');
    }

    public function verifications()
    {
        return $this->hasMany(Verification::class, 'document_id');
    }

    public function decisions()
    {
        return $this->morphMany(Decision::class, 'decidable');
    }

    // Dernière vérification terminée
    public function derniereVerification()
    {
        return $this->hasOne(Verification::class, 'document_id')
                    ->where('statut', 'termine')
                    ->latest();
    }
}
