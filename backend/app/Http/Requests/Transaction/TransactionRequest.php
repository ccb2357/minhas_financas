<?php

namespace App\Http\Requests\Transaction;

use App\Enums\FinancialType;
use App\Rules\IntegerCents;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class TransactionRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $normalized = [];
        foreach (['description', 'notes'] as $field) {
            if (is_string($this->input($field))) {
                $text = trim($this->input($field));
                $normalized[$field] = $field === 'notes' && $text === '' ? null : $text;
            }
        }
        $this->merge($normalized);
    }

    protected function transactionRules(bool $updating = false): array
    {
        $presence = $updating ? 'sometimes' : 'required';

        return [
            'category_id' => [$presence, 'bail', 'required', 'integer', 'min:1'],
            'type' => [$presence, 'bail', 'required', 'string', Rule::enum(FinancialType::class)],
            'amount_cents' => [$presence, 'bail', 'required', new IntegerCents],
            'description' => [$presence, 'bail', 'required', 'string', 'max:255'],
            'transaction_date' => [$presence, 'bail', 'required', 'date_format:Y-m-d',
                'after_or_equal:1900-01-01', 'before_or_equal:2100-12-31'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'external_transaction_id' => ['prohibited'], 'id' => ['prohibited'], 'user_id' => ['prohibited'],
            'created_at' => ['prohibited'], 'updated_at' => ['prohibited'],
            'deleted_at' => ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return [
            'category_id.*' => 'Selecione uma categoria válida da sua conta.',
            'type.*' => 'Selecione receita ou despesa.',
            'amount_cents.required' => 'Informe um valor maior que zero.',
            'description.required' => 'Informe a descrição do lançamento.',
            'description.string' => 'Informe uma descrição válida.',
            'description.max' => 'A descrição pode ter no máximo 255 caracteres.',
            'transaction_date.*' => 'Informe uma data válida entre 1900 e 2100, no formato AAAA-MM-DD.',
            'notes.string' => 'Informe uma observação válida.',
            'notes.max' => 'A observação pode ter no máximo 2000 caracteres.',
            '*.prohibited' => 'Este campo é controlado pelo sistema.',
        ];
    }
}
