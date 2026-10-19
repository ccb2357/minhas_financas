<?php

namespace App\Http\Requests\Transaction;

class StoreTransactionRequest extends TransactionRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return $this->transactionRules();
    }
}
