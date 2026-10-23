<?php

namespace App\Services;

use App\Enums\FinancialType;
use App\Models\MonthlyBudget;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BudgetWriter
{
    public function save(User $user, array $data, ?string $id = null): MonthlyBudget
    {
        // Resolve before category locks: cycle configuration uses the singleton lock first.
        if ($id === null) app(FinancialCycles::class)->forLabel(app(FinancialCycles::class)->label($data['year'], $data['month']));
        try {
            return DB::transaction(function () use ($user, $data, $id): MonthlyBudget {
                if ($id !== null) {
                    $budget = $user->monthlyBudgets()->lockForUpdate()->findOrFail($id);
                    $budget->update(['limit_cents' => $data['limit_cents']]);
                    return $budget;
                }
                // O lock serializa criações para a mesma categoria e protege
                // a verificação contra uma desativação concorrente.
                $category = $user->categories()->lockForUpdate()->find($data['category_id']);
                if (!$category || !$category->is_active || $category->type !== FinancialType::Expense) {
                    throw ValidationException::withMessages([
                        'category_id' => 'Selecione uma categoria ativa de despesa da sua conta.',
                    ]);
                }
                $existing = $user->monthlyBudgets()->withTrashed()
                    ->where('category_id', $category->id)->where('year', $data['year'])->where('month', $data['month'])
                    ->lockForUpdate()->first();
                if ($existing && !$existing->trashed()) {
                    throw ValidationException::withMessages(['category_id' => 'Esta categoria já possui orçamento neste ciclo. Edite o limite existente.']);
                }
                if ($existing) {
                    $existing->limit_cents = $data['limit_cents'];
                    $existing->restore();
                    return $existing;
                }
                return $user->monthlyBudgets()->create($data);
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            throw ValidationException::withMessages(['category_id' => 'Esta categoria já possui orçamento neste ciclo. Atualize a lista.']);
        }
    }
}
