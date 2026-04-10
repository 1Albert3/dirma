<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Verification extends Model
{
    protected $fillable = [
        'document_id', 'etudiant_id',
        'score_local', 'score_ia', 'score_web', 'score_global',
        'details_local', 'details_ia', 'details_web',
        'passages_suspects', 'statut',
    ];

    protected $casts = [
        'details_local'     => 'array',
        'details_ia'        => 'array',
        'details_web'       => 'array',
        'passages_suspects' => 'array',
        'score_local'       => 'float',
        'score_ia'          => 'float',
        'score_web'         => 'float',
        'score_global'      => 'float',
    ];

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function etudiant()
    {
        return $this->belongsTo(User::class, 'etudiant_id');
    }

    public function sources()
    {
        return $this->hasMany(SourcePlagiat::class, 'verification_id');
    }
}
