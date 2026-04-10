<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('etudiant_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('theme_id')->constrained('themes')->cascadeOnDelete();
            $table->string('titre');
            $table->string('fichier_path');
            $table->string('fichier_nom');
            $table->enum('type_fichier', ['pdf', 'docx']);
            $table->string('annee_universitaire');
            $table->enum('niveau', ['licence', 'master']);
            $table->enum('statut', [
                'depose', 'en_verification', 'verifie',
                'en_attente_chef', 'rejete_chef',
                'en_attente_da', 'rejete_da', 'valide'
            ])->default('depose');
            $table->timestamps();
        });
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
