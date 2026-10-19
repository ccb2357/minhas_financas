<?php

namespace App\Http\Requests\Category;

use App\Enums\FinancialType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'type' => ['sometimes', 'required', Rule::enum(FinancialType::class)],
            'status' => ['sometimes', 'required', Rule::in(['active', 'inactive', 'all'])],
            'page' => ['sometimes', 'required', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'required', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'type.*' => 'Filtre por income (receita) ou expense (despesa).',
            'status.*' => 'Filtre por active, inactive ou all.',
            'page.*' => 'Informe uma página válida, a partir de 1.',
            'per_page.*' => 'Escolha de 1 a 100 categorias por página.',
        ];
    }
}
