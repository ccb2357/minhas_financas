<?php

namespace App\Http\Requests\Budget;

class UpdateBudgetRequest extends BudgetRequest
{
    public function authorize(): bool
    {
        $this->user()->monthlyBudgets()->findOrFail($this->route('budget'));
        return true;
    }

    public function rules(): array
    {
        // Um orçamento identifica categoria e competência fixas. PATCH altera
        // somente o limite; outra categoria/mês deve ter seu próprio orçamento.
        return [
            'limit_cents' => $this->limitRules(),
            'category_id' => ['prohibited'], 'year' => ['prohibited'], 'month' => ['prohibited'],
            ...$this->controlledFields(),
        ];
    }

    public function messages(): array
    {
        return [
            ...parent::messages(),
            'category_id.prohibited' => 'A categoria do orçamento não pode ser alterada.',
            'year.prohibited' => 'O ano do orçamento não pode ser alterado.',
            'month.prohibited' => 'O mês do orçamento não pode ser alterado.',
        ];
    }
}
