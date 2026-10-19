<?php

namespace App\Services;

class BudgetMetrics
{
    public static function calculate(int $limit, int $spent): array
    {
        return [
            'spent_cents' => $spent,
            'remaining_cents' => $limit - $spent,
            // Percentual é apenas apresentação. Nenhuma soma de dinheiro usa
            // ponto flutuante e o status é decidido pelos centavos originais.
            'used_percent' => $limit > 0 ? round($spent / $limit * 100, 2) : null,
            'status' => match (true) {
                $limit === 0 => 'no_budget',
                $spent > $limit => 'over_limit',
                $spent === $limit => 'at_limit',
                // ceil(80% do limite), sem divisão de ponto flutuante.
                $spent >= intdiv($limit, 5) * 4 + intdiv(($limit % 5) * 4 + 4, 5) => 'near_limit',
                default => 'within_limit',
            },
        ];
    }
}
