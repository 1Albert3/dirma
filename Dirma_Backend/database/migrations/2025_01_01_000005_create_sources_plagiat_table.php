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
        Schema::create('sources_plagiat', function (Blueprint $table) {
            $table->id();
            $table->foreignId('verification_id')->constrained('verifications')->cascadeOnDelete();
            $table->enum('type', ['local', 'web']);
            $table->string('url')->nullable();
            $table->string('document_ref')->nullable();
            $table->float('taux_similarite');
            $table->text('passage_original')->nullable();
            $table->text('passage_source')->nullable();
            $table->timestamps();
        });
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    public function down(): void
    {
        Schema::dropIfExists('sources_plagiat');
    }
};
