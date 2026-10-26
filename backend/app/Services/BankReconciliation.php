<?php
namespace App\Services;
use App\Models\BankOperation;
use App\Models\User;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BankReconciliation
{
    public function __construct(private PluggyAccounts $accounts, private TransactionWriter $writer) {}
    private function operation(User $user, string $id): BankOperation
    {
        $accounts = $this->accounts->forUser($user);
        return BankOperation::where('user_id', $user->id)->whereIn('account_id', array_column($accounts, 'account_id'))->lockForUpdate()->findOrFail($id);
    }
    public function ignore(User $user, string $id): void
    {
        DB::transaction(function () use ($user, $id): void {
            $op = $this->operation($user, $id);
            abort_if($op->review_status === 'added', 409, 'Esta operação já foi adicionada às suas finanças.');
            if ($op->review_status !== 'ignored') $op->update(['review_status' => 'ignored', 'reviewed_at' => now()]);
        }, 3);
    }
    public function add(User $user, string $id, array $data): Transaction
    {
        // Keep the cycle lock order used by normal transaction writes.
        app(FinancialCycles::class)->forDate();
        return DB::transaction(function () use ($user, $id, $data): Transaction {
            $op = $this->operation($user, $id);
            abort_if($op->review_status === 'ignored', 409, 'Esta operação já foi ignorada. Atualize a sincronização.');
            if ($op->review_status === 'added') {
                $transaction = $user->transactions()->find($op->transaction_id);
                abort_unless($transaction, 409, 'Esta operação já foi processada e seu lançamento foi removido.');
                $cycle = app(FinancialCycles::class)->forDate($transaction->transaction_date->format('Y-m-d'));
                return $transaction->load('category')->setAttribute('cycle_key', sprintf('%04d-%02d', $cycle->year, $cycle->month));
            }
            if ($op->currency_code !== 'BRL') throw ValidationException::withMessages(['amount_cents' => 'A importação financeira aceita somente operações em reais.']);
            $transaction = $this->writer->save($user, $data);
            $cycleKey = $transaction->getAttribute('cycle_key');
            unset($transaction->cycle_key);
            $transaction->external_transaction_id = $op->external_transaction_id;
            $transaction->save();
            $transaction->setAttribute('cycle_key', $cycleKey);
            $op->update(['review_status' => 'added', 'transaction_id' => $transaction->id, 'reviewed_at' => now()]);
            return $transaction;
        }, 3);
    }
}
