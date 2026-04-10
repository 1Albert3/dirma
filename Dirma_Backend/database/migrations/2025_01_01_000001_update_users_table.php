<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('matricule')->nullable()->unique()->after('name');
            $table->enum('role', ['etudiant', 'chef_departement', 'directeur_adjoint'])->default('etudiant')->after('matricule');
            $table->string('departement')->nullable()->after('role');
            $table->string('prenom')->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['matricule', 'role', 'departement', 'prenom']);
        });
    }
};
