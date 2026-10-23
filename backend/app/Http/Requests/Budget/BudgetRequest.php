<?php

namespace App\Http\Requests\Budget;

use App\Rules\IntegerCents;
use Illuminate\Foundation\Http\FormRequest;

abstract class BudgetRequest extends FormRequest
{
    protected function controlledFields(): array
    {
        return array_fill_keys([
            'financial_cycle_id', 'id', 'user_id', 'created_at', 'updated_at', 'deleted_at', 'type',
            'spent_cents', 'remaining_cents', 'used_percent', 'status',
        ], ['prohibited']);
    }

    protected function limitRules(): array
    {
        return ['required', 'bail', new IntegerCents];
    }

    public function messages(): array
    {
        return [
            'category_id.*' => 'Selecione uma categoria ativa de despesa da sua conta.',
            'year.*' => 'Informe o ano entre 1900 e 2100.',
            'month.*' => 'Informe o mês entre 1 e 12.',
            'limit_cents.required' => 'Informe um limite maior que zero.',
            '*.prohibited' => 'Este campo é controlado pelo sistema.',
        ];
    }
}
