<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SourcePlagiat extends Model
{
    protected $table = 'sources_plagiat';

    protected $fillable = [
        'verification_id', 'type', 'url', 'document_ref',
        'taux_similarite', 'passage_original', 'passage_source',
    ];

    protected $casts = [
        'taux_similarite' => 'float',
    ];

    public function verification()
    {
        return $this->belongsTo(Verification::class);
    }
}
