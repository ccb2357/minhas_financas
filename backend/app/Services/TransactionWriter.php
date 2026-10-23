<?php

namespace App\Services;

use App\Enums\FinancialType;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransactionWriter
{
    public function save(User $user, array $data, ?string $id = null): Transaction
    {
        // Resolve cycle before locking financial data; dates themselves remain unchanged.
        $calendar = app(FinancialCycles::class);
        $calendar->forDate();
        return DB::transaction(function () use ($user, $data, $id): Transaction {
            $transaction = $id === null ? null
                : $user->transactions()->lockForUpdate()->findOrFail($id);
            $categoryId = $data['category_id'] ?? $transaction?->category_id;
            $type = FinancialType::from($data['type'] ?? $transaction->type->value);
            $category = $user->categories()->lockForUpdate()->find($categoryId);
            $keepingCategory = $transaction && (int) $categoryId === $transaction->category_id;

            // Revalidar sob lock: desativação concorrente não permite novo vínculo.
            // Categoria inativa já vinculada pode permanecer numa edição histórica.
            if (!$category || $category->type !== $type || (!$category->is_active && !$keepingCategory)) {
                throw ValidationException::withMessages([
                    'category_id' => 'Selecione uma categoria ativa, do mesmo tipo e da sua conta.',
                ]);
            }

            if ($transaction) {
                $transaction->update($data);
            } else {
                $transaction = $user->transactions()->create($data);
            }

            $transaction->refresh()->load('category');
            $cycle = app(FinancialCycles::class)->forDate($transaction->transaction_date->format('Y-m-d'));
            $transaction->setAttribute('cycle_key', sprintf('%04d-%02d', $cycle->year, $cycle->month));
            return $transaction;
        }, 3);
    }
}
