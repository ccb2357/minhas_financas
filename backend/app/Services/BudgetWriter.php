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
    public function copyCycle(User $user, array $data): array
    {
        if ((int) $data['source_year'] === (int) $data['year'] && (int) $data['source_month'] === (int) $data['month']) {
            throw ValidationException::withMessages(['month' => 'Escolha um ciclo diferente do ciclo de origem.']);
        }
        $calendar = app(FinancialCycles::class);
        // Resolve both periods before taking category or budget locks.
        $source = $calendar->forLabel($calendar->label((int) $data['source_year'], (int) $data['source_month']));
        $destination = $calendar->forLabel($calendar->label((int) $data['year'], (int) $data['month']));
        $ids = $user->monthlyBudgets()->where('financial_cycle_id', $source->id)->orderBy('category_id')->pluck('category_id')->all();
        if (!$ids) throw ValidationException::withMessages(['source_month' => 'O ciclo de origem não possui orçamentos para copiar.']);

        return DB::transaction(function () use ($user, $data, $calendar, $source, $destination, $ids): array {
            // Lock all categories in a consistent order; creation/deactivation use these same locks.
            $categories = $user->categories()->whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get();
            if ($categories->count() !== count($ids) || $categories->contains(fn ($category) => !$category->is_active || $category->type !== FinancialType::Expense)) {
                throw ValidationException::withMessages(['source_month' => 'Há categorias inativas no ciclo de origem. Revise os orçamentos antes de copiar.']);
            }
            $budgets = $user->monthlyBudgets()->where('financial_cycle_id', $source->id)->orderBy('category_id')->lockForUpdate()->get();
            if ($budgets->pluck('category_id')->all() !== $ids) {
                throw ValidationException::withMessages(['source_month' => 'Os orçamentos de origem foram alterados. Atualize a tela e tente novamente.']);
            }
            if ($user->monthlyBudgets()->where('financial_cycle_id', $destination->id)->whereIn('category_id', $ids)->lockForUpdate()->exists()) {
                throw ValidationException::withMessages(['month' => 'Já existe orçamento para uma das categorias no ciclo de destino. Nenhum orçamento foi copiado.']);
            }
            foreach ($budgets as $budget) {
                $this->save($user, [
                    'category_id' => $budget->category_id, 'limit_cents' => $budget->limit_cents,
                    'year' => (int) $data['year'], 'month' => (int) $data['month'],
                ]);
            }
            return [
                'year' => (int) $destination->year, 'month' => (int) $destination->month,
                'copied_count' => $budgets->count(), 'limit_cents' => (int) $budgets->sum('limit_cents'),
                'period' => $calendar->present($destination),
            ];
        }, 3);
    }

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
