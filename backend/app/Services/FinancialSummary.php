<?php

namespace App\Services;

use App\Http\Resources\CategoryResource;
use App\Models\User;
use Carbon\CarbonImmutable;

// Regras únicas de agregação para Dashboard e Relatórios.
class FinancialSummary
{
    public function monthly(User $user, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $months = [];
        for ($date = $start; $date->lt($end); $date = $date->addMonth()) {
            $months[$date->format('Y-m')] = [
                'year' => $date->year, 'month' => $date->month,
                'income_cents' => 0, 'expense_cents' => 0, 'result_cents' => 0,
                'income_count' => 0, 'expense_count' => 0,
            ];
        }
        // No máximo duas linhas agregadas por dia; não carrega lançamentos
        // individuais e mantém os centavos em aritmética inteira.
        $daily = $user->transactions()
            ->where('transaction_date', '>=', $start->format('Y-m-d'))
            ->where('transaction_date', '<', $end->format('Y-m-d'))
            ->selectRaw('transaction_date, type, SUM(amount_cents) AS total_cents, COUNT(*) AS transaction_count')
            ->groupBy('transaction_date', 'type')->toBase()->get();
        foreach ($daily as $day) {
            $key = substr($day->transaction_date, 0, 7);
            $months[$key][$day->type.'_cents'] += (int) $day->total_cents;
            $months[$key][$day->type.'_count'] += (int) $day->transaction_count;
        }
        foreach ($months as &$month) {
            $month['result_cents'] = $month['income_cents'] - $month['expense_cents'];
        }
        unset($month);
        return $months;
    }

    public function totals(array $months): array
    {
        $totals = ['income_cents' => 0, 'expense_cents' => 0, 'result_cents' => 0, 'income_count' => 0, 'expense_count' => 0];
        foreach ($months as $month) {
            foreach ($totals as $key => $value) $totals[$key] += $month[$key];
        }
        return $totals;
    }

    public function categories(User $user, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $groups = $user->transactions()
            ->where('transaction_date', '>=', $start->format('Y-m-d'))
            ->where('transaction_date', '<', $end->format('Y-m-d'))->where('type', 'expense')
            ->selectRaw('category_id, SUM(amount_cents) AS total_cents, COUNT(*) AS transaction_count')
            ->groupBy('category_id')->orderByDesc('total_cents')->orderBy('category_id')
            ->toBase()->get();
        // Categorias inativas continuam identificando despesas históricas.
        $categories = $user->categories()->whereIn('id', $groups->pluck('category_id'))->get()->keyBy('id');
        return $groups->map(fn ($group) => [
            'category' => new CategoryResource($categories->get($group->category_id)),
            'amount_cents' => (int) $group->total_cents,
            'transaction_count' => (int) $group->transaction_count,
        ])->all();
    }
}
