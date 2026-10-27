<?php

namespace App\Http\Requests\Budget;

class CopyBudgetRequest extends BudgetRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'source_year' => ['required', 'integer', 'between:1900,2100'],
            'source_month' => ['required', 'integer', 'between:1,12'],
            'year' => ['required', 'integer', 'between:1900,2100'],
            'month' => ['required', 'integer', 'between:1,12'],
            'category_id' => ['prohibited'], 'limit_cents' => ['prohibited'],
            ...$this->controlledFields(),
        ];
    }
}
