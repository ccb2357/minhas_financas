<?php

namespace App\Services;

use App\Models\MonthlyBudget;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Query\JoinClause;

class BudgetReader
{
    private function query(User $user, CarbonImmutable $start): HasMany
    {
        $calendar = app(FinancialCycles::class);
        $cycle = $calendar->forLabel($start);
        $start = $calendar->start($cycle); $end = $calendar->endExclusive($cycle);
        $spending = $user->transactions()->where('type', 'expense')
            ->where('transaction_date', '>=', $start->format('Y-m-d'))
            ->where('transaction_date', '<', $end->format('Y-m-d'))
            ->selectRaw('category_id, SUM(amount_cents) AS spent_cents')->groupBy('category_id')->toBase();

        return $user->monthlyBudgets()
            ->leftJoinSub($spending, 'budget_spending', function (JoinClause $join): void {
                $join->on('monthly_budgets.category_id', '=', 'budget_spending.category_id');
            })
            ->where('monthly_budgets.financial_cycle_id', $cycle->id)
            ->select('monthly_budgets.*')->selectRaw('COALESCE(budget_spending.spent_cents, 0) AS spent_cents');
    }

    public function overview(User $user, CarbonImmutable $start, int $perPage): array
    {
        $query = $this->query($user, $start);
        $calendar = app(FinancialCycles::class);
        $cycle = $calendar->forLabel($start);
        $start = $calendar->start($cycle); $end = $calendar->endExclusive($cycle);
        // O resumo abrange todos os orçamentos do ciclo, não só a página exibida.
        $aggregate = (clone $query)->toBase()->select([])->selectRaw(
            'COUNT(*) AS budget_count, COALESCE(SUM(monthly_budgets.limit_cents), 0) AS limit_cents, COALESCE(SUM(budget_spending.spent_cents), 0) AS spent_cents'
        )->first();
        $totalExpense = (int) $user->transactions()->where('type', 'expense')
            ->where('transaction_date', '>=', $start->format('Y-m-d'))
            ->where('transaction_date', '<', $end->format('Y-m-d'))->sum('amount_cents');
        $limit = (int) $aggregate->limit_cents;
        $spent = (int) $aggregate->spent_cents;

        return [
            'budgets' => $query->with('category')->orderBy('monthly_budgets.category_id')->orderBy('monthly_budgets.id')->paginate($perPage),
            'period' => $calendar->present($cycle),
            'summary' => [
                'budget_count' => (int) $aggregate->budget_count,
                'limit_cents' => $limit,
                ...BudgetMetrics::calculate($limit, $spent),
                'total_expense_cents' => $totalExpense,
                'unbudgeted_expense_cents' => $totalExpense - $spent,
            ],
        ];
    }

    public function find(User $user, string $id): MonthlyBudget
    {
        $owned = $user->monthlyBudgets()->findOrFail($id);
        $start = CarbonImmutable::create($owned->year, $owned->month, 1, 0, 0, 0, 'America/Sao_Paulo');
        return $this->query($user, $start)->with('category')->findOrFail($id);
    }
}
