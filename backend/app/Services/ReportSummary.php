<?php

namespace App\Services;

use App\Models\User;
use Carbon\CarbonImmutable;

class ReportSummary
{
    public function __construct(private FinancialSummary $summary, private ReportInsights $insights) {}

    public function build(User $user, CarbonImmutable $selected, string $range): array
    {
        $end = $selected->addMonth();
        $start = match ($range) {
            'three_months' => $selected->subMonths(2),
            'year' => $selected->startOfYear(),
            default => $selected,
        };
        $monthCount = $range === 'year' ? $selected->month : ($range === 'three_months' ? 3 : 1);
        // Ano compara janeiro até o mês escolhido com o mesmo recorte do ano anterior.
        $previousStart = $range === 'year' ? $start->subYear() : $start->subMonths($monthCount);
        $previousEnd = $range === 'year' ? $end->subYear() : $start;

        // A comparação visual existente continua sendo seis meses no modo Mês.
        $comparisonStart = $range === 'month' ? $selected->subMonths(5) : $start;
        $queryStart = $previousStart->lt($comparisonStart) ? $previousStart : $comparisonStart;
        $queryEnd = $range === 'year' ? $selected->startOfYear()->addYear() : $end;
        $allMonths = $this->summary->monthly($user, $queryStart, $queryEnd);
        $comparison = array_filter($allMonths, fn ($key) => $key >= $comparisonStart->format('Y-m') && $key < $end->format('Y-m'), ARRAY_FILTER_USE_KEY);
        $monthly = array_filter($comparison, fn ($key) => $key >= $start->format('Y-m'), ARRAY_FILTER_USE_KEY);
        $previousMonths = array_filter($allMonths, fn ($key) => $key >= $previousStart->format('Y-m') && $key < $previousEnd->format('Y-m'), ARRAY_FILTER_USE_KEY);
        $totals = $this->summary->totals($monthly);
        $previousTotals = $this->summary->totals($previousMonths);
        // Série exclusiva do gráfico de barras; os demais indicadores preservam seu período.
        $barStart = $range === 'year' ? $selected->startOfYear() : $start;
        $barEnd = $range === 'year' ? $barStart->addYear() : $end;
        $barMonths = array_filter($allMonths, fn ($key) => $key >= $barStart->format('Y-m') && $key < $barEnd->format('Y-m'), ARRAY_FILTER_USE_KEY);
        $calendar = app(FinancialCycles::class);
        $selectedCycle = $calendar->forLabel($selected);
        $actualStart = $calendar->start($calendar->forLabel($start));
        $actualEnd = $calendar->endExclusive($selectedCycle);
        $categories = $this->summary->categories($user, $actualStart, $actualEnd);
        $today = $calendar->today();
        $status = $today->lt($actualStart) ? 'future' : ($today->gte($actualEnd) ? 'past' : 'in_progress');

        return [
            'period' => [
                'range' => $range, 'year' => $selected->year, 'month' => $selected->month, 'cycle_id' => (int) $selectedCycle->id,
                'start_date' => $actualStart->toDateString(),
                'end_date' => $actualEnd->subDay()->toDateString(),
                'month_count' => count($monthly),
            ],
            // O status informa o calendário; não corta lançamentos com data futura.
            'period_status' => [
                'state' => $status, 'is_partial' => $status === 'in_progress',
                'as_of_date' => $today->format('Y-m-d'),
            ],
            'totals' => $totals,
            'by_category' => $categories,
            'monthly_series' => array_values($monthly),
            'comparison_period' => [
                'start_date' => $calendar->start($calendar->forLabel($comparisonStart))->toDateString(),
                'end_date' => $actualEnd->subDay()->toDateString(),
                'month_count' => count($comparison),
            ],
            'comparison_series' => array_values($comparison),
            'income_expense_series' => array_values($barMonths),
            'income_expense_period' => [
                'start_date' => $calendar->start($calendar->forLabel($barStart))->toDateString(),
                'end_date' => $calendar->endExclusive($calendar->forLabel($barEnd->subMonth()))->subDay()->toDateString(),
                'month_count' => count($barMonths),
            ],
            'previous_period' => [
                'start_date' => $calendar->start($calendar->forLabel($previousStart))->toDateString(),
                'end_date' => $calendar->endExclusive($calendar->forLabel($previousEnd->subMonth()))->subDay()->toDateString(),
                'month_count' => count($previousMonths), 'totals' => $previousTotals,
            ],
            'changes' => $this->insights->changes($totals, $previousTotals),
            'insights' => $this->insights->build($user, $actualStart, $actualEnd, $categories),
        ];
    }
}
