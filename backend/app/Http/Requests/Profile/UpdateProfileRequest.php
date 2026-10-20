<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $fields = [];
        if (is_string($this->input('name'))) $fields['name'] = trim($this->input('name'));
        if (is_string($this->input('email'))) $fields['email'] = mb_strtolower(trim($this->input('email')));
        $this->merge($fields);
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'bail', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'bail', 'required', 'string', 'email:rfc', 'max:255', Rule::unique('users', 'email')->ignore($this->user())],
            'current_password' => [Rule::requiredIf(fn () => $this->has('email') && $this->input('email') !== $this->user()->email), 'bail', 'nullable', 'string', 'current_password:web'],
            'id' => ['prohibited'], 'user_id' => ['prohibited'],
            'password' => ['prohibited'], 'password_confirmation' => ['prohibited'],
            'email_verified_at' => ['prohibited'], 'remember_token' => ['prohibited'],
            'created_at' => ['prohibited'], 'updated_at' => ['prohibited'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (!$this->exists('name') && !$this->exists('email')) {
                $validator->errors()->add('name', 'Informe o nome ou o e-mail que deseja atualizar.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Informe seu nome.', 'name.string' => 'Informe um nome válido.',
            'name.max' => 'O nome pode ter no máximo 255 caracteres.',
            'email.required' => 'Informe seu e-mail.', 'email.string' => 'Informe um e-mail válido.',
            'email.email' => 'Informe um e-mail válido.', 'email.max' => 'O e-mail pode ter no máximo 255 caracteres.',
            'email.unique' => 'Este e-mail já está em uso.',
            'current_password.required' => 'Informe sua senha atual para alterar o e-mail.',
            'current_password.string' => 'Informe uma senha atual válida.',
            'current_password.current_password' => 'A senha atual está incorreta.',
            '*.prohibited' => 'Este campo não pode ser alterado nesta operação.',
        ];
    }
}
