<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('financial_cycle_settings', function (Blueprint $table): void {
            $table->unsignedTinyInteger('id')->primary();
            $table->unsignedTinyInteger('initial_cut_day')->nullable();
            $table->unsignedTinyInteger('cut_day')->nullable();
            $table->unsignedInteger('version')->default(0);
        });
        // No backend default: the first cut day must be chosen in the UI.
        DB::table('financial_cycle_settings')->insert(['id' => 1]);
        Schema::create('financial_cycles', function (Blueprint $table): void {
            $table->id();
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month');
            $table->date('start_date')->unique();
            $table->date('end_date');
            $table->unsignedTinyInteger('cut_day');
            $table->unique(['year', 'month']);
            $table->index('end_date');
        });
        Schema::table('monthly_budgets', function (Blueprint $table): void {
            $table->foreignId('financial_cycle_id')->nullable()->constrained('financial_cycles')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('monthly_budgets', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('financial_cycle_id');
        });
        Schema::dropIfExists('financial_cycles');
        Schema::dropIfExists('financial_cycle_settings');
    }
};
