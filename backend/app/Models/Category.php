<?php

namespace App\Models;

use App\Enums\FinancialType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    // Identificadores do Framework7 Icons; não aceitar HTML ou classes arbitrárias.
    public const ICONS = [
        'cart', 'car_fill', 'house', 'heart', 'film', 'book', 'bag',
        'gift', 'briefcase', 'money_dollar_circle', 'creditcard',
        'airplane', 'paw', 'phone', 'wifi', 'bolt', 'sportscourt',
        'wrench', 'tag', 'ellipsis_circle',
    ];

    protected $fillable = ['name', 'type', 'icon', 'color', 'is_active'];

    protected function casts(): array
    {
        return [
            'type' => FinancialType::class,
            'is_active' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }
}
