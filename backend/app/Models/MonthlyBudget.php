<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MonthlyBudget extends Model
{
    use SoftDeletes;

    protected $fillable = ['category_id', 'year', 'month', 'limit_cents', 'notes', 'financial_cycle_id'];

    protected static function booted(): void
    {
        static::creating(function (self $budget): void {
            $calendar = app(\App\Services\FinancialCycles::class);
            $cycle = $calendar->forLabel($calendar->label($budget->year, $budget->month));
            $budget->financial_cycle_id = $cycle->id;
        });
    }

    protected function casts(): array
    {
        return [
            'financial_cycle_id' => 'integer', 'category_id' => 'integer', 'year' => 'integer', 'month' => 'integer',
            'limit_cents' => 'integer', 'spent_cents' => 'integer',
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
