<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Dashboard\DashboardRequest;
use App\Services\DashboardSummary;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __invoke(DashboardRequest $request, DashboardSummary $summary): JsonResponse
    {
        $filters = $request->validated();
        $start = app(\App\Services\FinancialCycles::class)->selected($filters);

        return DB::transaction(fn () => response()->json([
            'data' => $summary->build($request->user(), $start),
        ]));
    }
}
