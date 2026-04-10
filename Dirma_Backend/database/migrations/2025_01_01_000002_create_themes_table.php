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
        Schema::create('themes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('etudiant_id')->constrained('users')->cascadeOnDelete();
            $table->string('titre');
            $table->text('description');
            $table->string('departement');
            $table->string('annee_universitaire');
            $table->float('score_similarite')->default(0);
            $table->enum('statut', [
                'analyse_complete', 'en_attente_chef',
                'rejete_chef', 'en_attente_da', 'rejete_da', 'valide'
            ])->default('analyse_complete');
            $table->timestamps();
        });
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    public function down(): void
    {
        Schema::dropIfExists('themes');
    }
};
