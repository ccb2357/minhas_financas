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
        $end = $start->addMonth();
        $months = $this->summary->monthly($user, $start->subMonths(5), $end);
        $latest = $user->transactions()->with('category')
            ->where('transaction_date', '>=', $start->format('Y-m-d'))
            ->where('transaction_date', '<', $end->format('Y-m-d'))
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
            'by_category' => $this->summary->categories($user, $start, $end),
            'last_six_months' => array_values($months),
            'latest_transactions' => TransactionResource::collection($latest),
        ];
    }
}
