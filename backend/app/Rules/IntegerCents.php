<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class IntegerCents implements ValidationRule
{
    // R$ 999.999.999,99 por lançamento; inteiro seguro também no JavaScript.
    public const MAX = 99_999_999_999;

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!is_int($value) || $value < 1 || $value > self::MAX) {
            $fail('Informe um valor em centavos inteiros, de 1 a 99999999999.');
        }
    }
}
