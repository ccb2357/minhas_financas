<?php

namespace App\Services;

use App\Http\Resources\TransactionResource;
use App\Models\User;
use Carbon\CarbonImmutable;

class DashboardSummary
{
    public function __construct(private FinancialSummary $summary) {}

    public function build(User $user, CarbonImmutable $start): array
    {
        $calendar = app(FinancialCycles::class);
        $selected = $start;
        $calendar->between($selected->subMonths(5), $selected);
        $cycle = $calendar->forLabel($selected);
        $months = $this->summary->monthly($user, $selected->subMonths(5), $selected->addMonth());
        $start = $calendar->start($cycle); $end = $calendar->endExclusive($cycle);
        $latest = $user->transactions()->with('category')
            ->where('transaction_date', '>=', $start->format('Y-m-d'))
            ->where('transaction_date', '<', $end->format('Y-m-d'))
            ->orderByDesc('transaction_date')->orderByDesc('id')->limit(4)->get();
        $totals = $months[$selected->format('Y-m')];
        $totals = array_intersect_key($totals, array_flip(['income_cents', 'expense_cents', 'result_cents', 'income_count', 'expense_count']));

        return [
            'period' => $calendar->present($cycle),
            'totals' => $totals,
            'previous_month' => $months[$selected->subMonth()->format('Y-m')],
            'by_category' => $this->summary->categories($user, $start, $end),
            'last_six_months' => array_values($months),
            'latest_transactions' => TransactionResource::collection($latest),
        ];
    }
}
