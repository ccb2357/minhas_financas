<?php

namespace App\Http\Requests\Budget;

use Illuminate\Foundation\Http\FormRequest;

class ListBudgetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'year' => ['required_with:month', 'integer', 'between:1900,2100'],
            'month' => ['required_with:year', 'integer', 'between:1,12'],
            'page' => ['sometimes', 'required', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'required', 'integer', 'between:1,100'],
        ];
    }

    public function messages(): array
    {
        return [
            'year.*' => 'Informe o ano entre 1900 e 2100, junto do mês.',
            'month.*' => 'Informe o mês entre 1 e 12, junto do ano.',
            'page.*' => 'Informe uma página válida, a partir de 1.',
            'per_page.*' => 'Escolha de 1 a 100 orçamentos por página.',
        ];
    }
}
