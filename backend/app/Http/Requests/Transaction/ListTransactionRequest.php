<?php

namespace App\Http\Requests\Transaction;

use App\Enums\FinancialType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('search'))) {
            $this->merge(['search' => trim($this->input('search'))]);
        }
    }

    public function rules(): array
    {
        return [
            'year' => ['required_with:month', 'integer', 'between:1900,2100'],
            'month' => ['required_with:year', 'integer', 'between:1,12'],
            'type' => ['sometimes', 'required', Rule::enum(FinancialType::class)],
            'category_id' => ['sometimes', 'bail', 'required', 'integer', 'min:1',
                Rule::exists('categories', 'id')->where('user_id', $this->user()->id)],
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'unbudgeted' => ['sometimes', 'boolean'],
            'page' => ['sometimes', 'required', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'required', 'integer', 'between:1,100'],
        ];
    }

    public function messages(): array
    {
        return [
            'year.*' => 'Informe o ano entre 1900 e 2100, junto do mês.',
            'month.*' => 'Informe o mês entre 1 e 12, junto do ano.',
            'type.*' => 'Filtre por income (receita) ou expense (despesa).',
            'category_id.*' => 'Selecione uma categoria válida da sua conta.',
            'search.*' => 'A busca deve ser um texto de até 255 caracteres.',
            'page.*' => 'Informe uma página válida, a partir de 1.',
            'per_page.*' => 'Escolha de 1 a 100 lançamentos por página.',
        ];
    }
}
