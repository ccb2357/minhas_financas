<?php

namespace App\Services;

use App\Http\Resources\TransactionResource;
use App\Models\User;
use Carbon\CarbonImmutable;

class ReportInsights
{
    public function build(User $user, CarbonImmutable $start, CarbonImmutable $end, array $categories): array
    {
        $mostUsed = null;
        // A lista já vem ordenada por valor decrescente e ID crescente.
        // Empates em frequência seguem essa ordem de desempate.
        foreach ($categories as $category) {
            if ($mostUsed === null || $category['transaction_count'] > $mostUsed['transaction_count']) {
                $mostUsed = $category;
            }
        }

        $largest = $user->transactions()->where('type', 'expense')
            ->where('transaction_date', '>=', $start->format('Y-m-d'))
            ->where('transaction_date', '<', $end->format('Y-m-d'))
            ->orderByDesc('amount_cents')->orderByDesc('transaction_date')->orderByDesc('id')->first();
        if ($largest !== null) {
            // Reaproveita a categoria carregada no gráfico, sem consulta por item.
            foreach ($categories as $category) {
                if ($category['category']->id === $largest->category_id) {
                    $largest->setRelation('category', $category['category']->resource);
                    break;
                }
            }
        }

        return [
            'largest_expense' => $largest ? new TransactionResource($largest) : null,
            'most_used_expense_category' => $mostUsed,
        ];
    }

    public function changes(array $current, array $previous): array
    {
        $changes = [];
        foreach (['income', 'expense', 'result'] as $type) {
            $difference = $current[$type.'_cents'] - $previous[$type.'_cents'];
            $changes[$type] = [
                'difference_cents' => $difference,
                // Base zero ou negativa não gera um percentual enganoso.
                // Ponto flutuante apenas no percentual de apresentação.
                'percent' => $previous[$type.'_cents'] > 0
                    ? round($difference / $previous[$type.'_cents'] * 100, 2) : null,
            ];
        }
        return $changes;
    }
}
