<?php

namespace App\Http\Requests\Transaction;

class UpdateTransactionRequest extends TransactionRequest
{
    public function authorize(): bool
    {
        // Autorizar antes de validar para não revelar a existência de IDs alheios.
        $this->user()->transactions()->findOrFail($this->route('transaction'));

        return true;
    }

    public function rules(): array
    {
        return $this->transactionRules(true);
    }
}
