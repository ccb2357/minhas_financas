<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('goals', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('name', 80);
            $table->string('icon', 40);
            $table->unsignedBigInteger('target_cents');
            $table->unsignedBigInteger('saved_cents')->default(0);
            $table->date('deadline')->nullable();
            $table->string('status', 10)->default('active');
            $table->timestamp('archived_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->uuid('request_key');
            $table->string('request_hash', 64);
            $table->timestamps();
            $table->unique(['user_id', 'request_key']);
            $table->index(['user_id', 'status', 'id']);
        });
        Schema::create('goal_movements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('goal_id')->constrained()->restrictOnDelete();
            $table->string('type', 12);
            $table->unsignedBigInteger('amount_cents');
            $table->date('movement_date');
            $table->string('notes', 1000)->nullable();
            $table->uuid('request_key');
            $table->string('request_hash', 64);
            $table->timestamps();
            $table->unique(['goal_id', 'request_key']);
            $table->index(['goal_id', 'movement_date', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('goal_movements');
        Schema::dropIfExists('goals');
    }
};
