<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Decision extends Model
{
    protected $fillable = [
        'decideur_id', 'decidable_type', 'decidable_id',
        'type_decideur', 'decision', 'motif', 'note_officielle',
    ];

    public function decideur()
    {
        return $this->belongsTo(User::class, 'decideur_id');
    }

    // Relation polymorphique (Theme ou Document)
    public function decidable()
    {
        return $this->morphTo();
    }
}
