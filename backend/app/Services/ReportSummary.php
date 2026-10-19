<?php

namespace App\Services;

use App\Models\User;
use Carbon\CarbonImmutable;

class ReportSummary
{
    public function __construct(private FinancialSummary $summary) {}

    public function build(User $user, CarbonImmutable $selected, string $range): array
    {
        $end = $selected->addMonth();
        $start = match ($range) {
            'three_months' => $selected->subMonths(2),
            'year' => $selected->startOfYear(),
            default => $selected,
        };
        // No modo Mês, mantém a comparação visual dos últimos seis meses,
        // separada dos totais e categorias do mês escolhido.
        $comparisonStart = $range === 'month' ? $selected->subMonths(5) : $start;
        $comparison = $this->summary->monthly($user, $comparisonStart, $end);
        $monthly = array_filter($comparison, fn ($key) => $key >= $start->format('Y-m'), ARRAY_FILTER_USE_KEY);

        return [
            'period' => [
                'range' => $range, 'year' => $selected->year, 'month' => $selected->month,
                'start_date' => $start->format('Y-m-d'),
                'end_date' => $selected->endOfMonth()->format('Y-m-d'),
                'month_count' => count($monthly),
            ],
            'totals' => $this->summary->totals($monthly),
            'by_category' => $this->summary->categories($user, $start, $end),
            'monthly_series' => array_values($monthly),
            'comparison_period' => [
                'start_date' => $comparisonStart->format('Y-m-d'),
                'end_date' => $selected->endOfMonth()->format('Y-m-d'),
                'month_count' => count($comparison),
            ],
            'comparison_series' => array_values($comparison),
        ];
    }
}
