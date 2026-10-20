<?php

namespace App\Http\Requests\Profile;

use Closure;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['bail', 'required', 'string', 'current_password:web'],
            'password' => ['bail', 'required', 'string', 'not_regex:/\x00/', 'min:12', 'max:72', 'confirmed', 'different:current_password',
                // Bcrypt considera no máximo 72 bytes, inclusive em senhas com acentos.
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (strlen($value) > 72) $fail('A nova senha pode ocupar no máximo 72 bytes. Reduza o tamanho se usar acentos ou emojis.');
                }],
            'password_confirmation' => ['required', 'string'],
            'id' => ['prohibited'], 'user_id' => ['prohibited'],
            'name' => ['prohibited'], 'email' => ['prohibited'],
            'email_verified_at' => ['prohibited'], 'remember_token' => ['prohibited'],
            'created_at' => ['prohibited'], 'updated_at' => ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return [
            'current_password.required' => 'Informe sua senha atual.',
            'current_password.string' => 'Informe uma senha atual válida.',
            'current_password.current_password' => 'A senha atual está incorreta.',
            'password.required' => 'Informe a nova senha.', 'password.string' => 'Informe uma nova senha válida.',
            'password.not_regex' => 'A nova senha contém um caractere inválido.',
            'password.min' => 'A nova senha deve ter pelo menos 12 caracteres.',
            'password.max' => 'A nova senha pode ter no máximo 72 caracteres.',
            'password.confirmed' => 'A confirmação não corresponde à nova senha.',
            'password.different' => 'A nova senha deve ser diferente da senha atual.',
            'password_confirmation.required' => 'Confirme a nova senha.',
            'password_confirmation.string' => 'Informe uma confirmação válida.',
            '*.prohibited' => 'Este campo não pode ser alterado nesta operação.',
        ];
    }
}
