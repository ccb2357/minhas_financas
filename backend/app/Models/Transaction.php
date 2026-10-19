<?php

namespace App\Models;

use App\Enums\FinancialType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Transaction extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'category_id', 'type', 'amount_cents', 'description', 'transaction_date', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'category_id' => 'integer',
            'type' => FinancialType::class,
            'amount_cents' => 'integer',
            'transaction_date' => 'immutable_date:Y-m-d',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
