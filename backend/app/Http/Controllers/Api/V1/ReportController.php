<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Report\ReportRequest;
use App\Services\ReportSummary;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function __invoke(ReportRequest $request, ReportSummary $summary): JsonResponse
    {
        $filters = $request->validated();
        $selected = app(\App\Services\FinancialCycles::class)->selected($filters);

        return DB::transaction(fn () => response()->json([
            'data' => $summary->build($request->user(), $selected, $filters['range'] ?? 'month'),
        ]));
    }
}
