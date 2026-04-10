<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Theme extends Model
{
    use HasFactory;

    protected $fillable = [
        'etudiant_id', 'titre', 'description',
        'departement', 'annee_universitaire',
        'score_similarite', 'statut',
    ];

    protected $casts = [
        'score_similarite' => 'float',
    ];

    public function etudiant()
    {
        return $this->belongsTo(User::class, 'etudiant_id');
    }

    public function decisions()
    {
        return $this->morphMany(Decision::class, 'decidable');
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'theme_id');
    }
}
