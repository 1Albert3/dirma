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
        Schema::create('verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete();
            $table->foreignId('etudiant_id')->constrained('users')->cascadeOnDelete();
            $table->float('score_local')->nullable();
            $table->float('score_ia')->nullable();
            $table->float('score_web')->nullable();
            $table->float('score_global')->nullable();
            $table->json('details_local')->nullable();
            $table->json('details_ia')->nullable();
            $table->json('details_web')->nullable();
            $table->json('passages_suspects')->nullable();
            $table->enum('statut', ['en_cours', 'termine', 'erreur'])->default('en_cours');
            $table->timestamps();
        });
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    public function down(): void
    {
        Schema::dropIfExists('verifications');
    }
};
