<?php

namespace App\Http\Resources;

use App\Services\BudgetMetrics;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BudgetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'category_id' => $this->category_id,
            'year' => $this->year, 'month' => $this->month,
            'limit_cents' => $this->limit_cents,
            ...BudgetMetrics::calculate($this->limit_cents, $this->spent_cents),
            'category' => new CategoryResource($this->whenLoaded('category')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
