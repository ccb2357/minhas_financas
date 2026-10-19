<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('name', 80);
            $table->enum('type', ['income', 'expense']);
            $table->string('icon', 40);
            $table->string('color', 7);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'type', 'name']);
            $table->index(['user_id', 'is_active', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
