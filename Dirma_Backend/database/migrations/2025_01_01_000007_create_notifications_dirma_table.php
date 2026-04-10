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
        Schema::create('notifications_dirma', function (Blueprint $table) {
            $table->id();
            $table->foreignId('destinataire_id')->constrained('users')->cascadeOnDelete();
            $table->string('titre');
            $table->text('message');
            $table->enum('type', ['info', 'succes', 'avertissement', 'erreur'])->default('info');
            $table->string('lien')->nullable();
            $table->boolean('lu')->default(false);
            $table->timestamps();
        });
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications_dirma');
    }
};
