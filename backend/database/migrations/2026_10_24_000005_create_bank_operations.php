<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table): void {
            $table->string('external_transaction_id', 255)->nullable();
            $table->unique(['user_id', 'external_transaction_id'], 'transactions_owner_external_unique');
        });
        Schema::create('bank_operations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('external_transaction_id', 255);
            $table->string('account_id', 100);
            $table->string('bank_name', 100);
            $table->string('description', 255);
            $table->string('type', 10);
            $table->unsignedBigInteger('amount_cents');
            $table->string('currency_code', 3);
            $table->date('transaction_date');
            $table->string('source_status', 30);
            $table->string('review_status', 10)->default('pending');
            $table->foreignId('transaction_id')->nullable()->constrained()->restrictOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'external_transaction_id'], 'bank_operations_owner_external_unique');
            $table->index(['user_id', 'review_status', 'transaction_date'], 'bank_operations_review_index');
        });
        Schema::create('bank_syncs', function (Blueprint $table): void {
            $table->foreignId('user_id')->primary()->constrained()->restrictOnDelete();
            $table->uuid('lease')->nullable();
            $table->timestamp('locked_until')->nullable();
            $table->timestamp('last_attempt_at')->nullable();
            $table->timestamp('last_success_at')->nullable();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('bank_syncs'); Schema::dropIfExists('bank_operations');
        Schema::table('transactions', function (Blueprint $table): void {
            $table->dropUnique('transactions_owner_external_unique'); $table->dropColumn('external_transaction_id');
        });
    }
};
