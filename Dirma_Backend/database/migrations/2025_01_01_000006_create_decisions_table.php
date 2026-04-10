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
        Schema::create('decisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('decideur_id')->constrained('users')->cascadeOnDelete();
            $table->string('decidable_type');
            $table->unsignedBigInteger('decidable_id');
            $table->enum('type_decideur', ['chef_departement', 'directeur_adjoint']);
            $table->enum('decision', ['valide', 'rejete']);
            $table->text('motif')->nullable();
            $table->text('note_officielle')->nullable();
            $table->timestamps();
            $table->index(['decidable_type', 'decidable_id']);
        });
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    public function down(): void
    {
        Schema::dropIfExists('decisions');
    }
};
