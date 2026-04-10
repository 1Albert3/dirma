<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'prenom', 'matricule', 'email',
        'password', 'role', 'departement',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
        ];
    }

    // Relations
    public function themes()
    {
        return $this->hasMany(Theme::class, 'etudiant_id');
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'etudiant_id');
    }

    public function verifications()
    {
        return $this->hasMany(Verification::class, 'etudiant_id');
    }

    public function decisions()
    {
        return $this->hasMany(Decision::class, 'decideur_id');
    }

    public function notificationsDirma()
    {
        return $this->hasMany(NotificationDirma::class, 'destinataire_id');
    }

    // Helpers de rôle
    public function estEtudiant(): bool       { return $this->role === 'etudiant'; }
    public function estChefDep(): bool        { return $this->role === 'chef_departement'; }
    public function estDirecteurAdj(): bool   { return $this->role === 'directeur_adjoint'; }
}
