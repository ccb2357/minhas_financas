<?php

namespace App\Services;

use App\Http\Resources\CategoryResource;
use App\Http\Resources\TransactionResource;
use App\Models\User;
use Carbon\CarbonImmutable;

class DashboardSummary
{
    public function build(User $user, CarbonImmutable $start): array
    {
        $end = $start->addMonth();
        $months = [];
        for ($offset = 5; $offset >= 0; $offset--) {
            $date = $start->subMonths($offset);
            $months[$date->format('Y-m')] = [
                'year' => $date->year, 'month' => $date->month,
                'income_cents' => 0, 'expense_cents' => 0, 'result_cents' => 0,
                'income_count' => 0, 'expense_count' => 0,
            ];
        }

        // Agrega no banco por dia/tipo: memória limitada ao calendário de seis
        // meses, sem carregar todos os lançamentos e sem funções SQL de data
        // específicas de um banco. Os valores permanecem centavos inteiros.
        $daily = $user->transactions()
            ->where('transaction_date', '>=', $start->subMonths(5)->format('Y-m-d'))
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

        $current = $user->transactions()
            ->where('transaction_date', '>=', $start->format('Y-m-d'))
            ->where('transaction_date', '<', $end->format('Y-m-d'));
        $groups = (clone $current)->where('type', 'expense')
            ->selectRaw('category_id, SUM(amount_cents) AS total_cents, COUNT(*) AS transaction_count')
            ->groupBy('category_id')->orderByDesc('total_cents')->orderBy('category_id')
            ->toBase()->get();
        // Categorias inativas continuam identificando despesas históricas.
        $categories = $user->categories()->whereIn('id', $groups->pluck('category_id'))->get()->keyBy('id');
        $byCategory = $groups->map(fn ($group) => [
            'category' => new CategoryResource($categories->get($group->category_id)),
            'amount_cents' => (int) $group->total_cents,
            'transaction_count' => (int) $group->transaction_count,
        ])->all();
        $latest = (clone $current)->with('category')
            ->orderByDesc('transaction_date')->orderByDesc('id')->limit(4)->get();
        $totals = $months[$start->format('Y-m')];
        unset($totals['year'], $totals['month']);

        return [
            'period' => [
                'year' => $start->year, 'month' => $start->month,
                'start_date' => $start->format('Y-m-d'),
                'end_date' => $start->endOfMonth()->format('Y-m-d'),
            ],
            'totals' => $totals,
            'previous_month' => $months[$start->subMonth()->format('Y-m')],
            'by_category' => $byCategory,
            'last_six_months' => array_values($months),
            'latest_transactions' => TransactionResource::collection($latest),
        ];
    }
}
