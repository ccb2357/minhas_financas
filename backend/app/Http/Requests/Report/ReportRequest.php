<?php

namespace App\Http\Requests\Report;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReportRequest extends FormRequest
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
            'range' => ['sometimes', 'required', 'string', Rule::in(['month', 'three_months', 'year'])],
        ];
    }

    public function messages(): array
    {
        return [
            'year.*' => 'Informe o ano entre 1900 e 2100, junto do mês.',
            'month.*' => 'Informe o mês entre 1 e 12, junto do ano.',
            'range.*' => 'Selecione month (mês), three_months (três meses) ou year (ano).',
        ];
    }
}
