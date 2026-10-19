<?php

namespace App\Http\Requests\Category;

use App\Enums\FinancialType;
use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class CategoryRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $normalized = [];

        if (is_string($this->input('name'))) {
            $normalized['name'] = trim($this->input('name'));
        }

        if (is_string($this->input('color'))) {
            $normalized['color'] = strtoupper(trim($this->input('color')));
        }

        $this->merge($normalized);
    }

    protected function categoryRules(?Category $category = null): array
    {
        $presence = $category ? 'sometimes' : 'required';
        $type = $category?->type->value ?? $this->input('type');
        // O tipo só entra na consulta como string, mesmo em payloads inválidos.
        $type = is_string($type) ? $type : '';

        $unique = Rule::unique('categories', 'name')
            ->where('user_id', $this->user()->id)
            ->where('type', $type);

        if ($category) {
            $unique->ignore($category);
        }

        return [
            'name' => [$presence, 'bail', 'required', 'string', 'max:80', $unique],
            // Tipo imutável: evita alterar o significado de futuros históricos.
            'type' => $category
                ? ['sometimes', 'required', 'string', Rule::in([$category->type->value])]
                : ['required', 'string', Rule::enum(FinancialType::class)],
            'icon' => [$presence, 'required', 'string', Rule::in(Category::ICONS)],
            'color' => [$presence, 'required', 'string', 'regex:/\A#[0-9A-Fa-f]{6}\z/'],
            'is_active' => ['sometimes', 'required', 'boolean'],
            'id' => ['prohibited'],
            'user_id' => ['prohibited'],
            'created_at' => ['prohibited'],
            'updated_at' => ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Informe o nome da categoria.',
            'name.string' => 'Informe um nome válido.',
            'name.max' => 'O nome pode ter no máximo 80 caracteres.',
            'name.unique' => 'Você já possui uma categoria com esse nome e tipo. Se estiver inativa, reative-a.',
            'type.required' => 'Selecione receita ou despesa.',
            'type.string' => 'Selecione receita ou despesa.',
            'type.enum' => 'Selecione receita ou despesa.',
            'type.in' => 'O tipo de uma categoria não pode ser alterado. Crie outra categoria para o novo tipo.',
            'icon.required' => 'Selecione um ícone.',
            'icon.string' => 'Selecione um ícone válido.',
            'icon.in' => 'Selecione um dos ícones disponíveis.',
            'color.required' => 'Selecione uma cor.',
            'color.string' => 'Informe uma cor válida.',
            'color.regex' => 'Informe uma cor no formato #2463EB.',
            'is_active.required' => 'Informe se a categoria está ativa.',
            'is_active.boolean' => 'O estado da categoria deve ser verdadeiro ou falso.',
            '*.prohibited' => 'Este campo é controlado pelo sistema.',
        ];
    }
}
