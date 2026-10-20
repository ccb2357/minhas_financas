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
        'cart', 'house', 'car_fill', 'heart', 'book',
        'film', 'bag', 'airplane', 'money_dollar', 'wallet',
        'building_columns', 'creditcard', 'archivebox', 'arrow_up_right', 'chart_bar',
        'chart_pie', 'doc_text', 'bolt', 'gift', 'ellipsis_circle',
        'briefcase', 'money_dollar_circle', 'paw', 'phone', 'wifi',
        'sportscourt', 'wrench', 'tag', 'percent', 'chart_bar_square',
        'building_2_fill', 'lock_shield', 'flag', 'arrow_2_squarepath', 'arrow_down_circle',
        'arrow_up_circle', 'tray_arrow_down', 'tray_arrow_up', 'person_2', 'cart_badge_plus',
        'drop', 'flame', 'shield', 'bandage', 'scissors',
        'desktopcomputer', 'ticket', 'music_note_2', 'gamecontroller', 'camera',
        'shippingbox', 'hammer', 'umbrella', 'calendar', 'doc_plaintext',
        'rosette', 'bag_badge_plus', 'cube_box', 'leaf_arrow_circlepath', 'gauge',
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
    public function monthlyBudgets(): HasMany
    {
        return $this->hasMany(MonthlyBudget::class);
    }
}
