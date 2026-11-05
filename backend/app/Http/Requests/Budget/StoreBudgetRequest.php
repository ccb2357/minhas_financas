<?php

namespace App\Http\Requests\Budget;

class StoreBudgetRequest extends BudgetRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['required', 'bail', 'integer', 'min:1'],
            'year' => ['required', 'integer', 'between:1900,2100'],
            'month' => ['required', 'integer', 'between:1,12'],
            'limit_cents' => $this->limitRules(),
            'notes' => ['nullable', 'string', 'max:2000'],
            ...$this->controlledFields(),
        ];
    }
}
