<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Report\ReportRequest;
use App\Services\ReportSummary;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function __invoke(ReportRequest $request, ReportSummary $summary): JsonResponse
    {
        $filters = $request->validated();
        $today = CarbonImmutable::now('America/Sao_Paulo');
        $selected = CarbonImmutable::create($filters['year'] ?? $today->year,
            $filters['month'] ?? $today->month, 1, 0, 0, 0, 'America/Sao_Paulo');

        return DB::transaction(fn () => response()->json([
            'data' => $summary->build($request->user(), $selected, $filters['range'] ?? 'month'),
        ]));
    }
}
