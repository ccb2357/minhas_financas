<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\FinancialCycles;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FinancialCycleController extends Controller
{
    public function show(Request $request, FinancialCycles $cycles): JsonResponse
    {
        $filters = $request->validate(['year' => ['required_with:month', 'integer', 'between:1900,2100'],
            'month' => ['required_with:year', 'integer', 'between:1,12']]);
        return response()->json(['data' => $cycles->configuration(isset($filters['year']) ? $cycles->label($filters['year'], $filters['month']) : null)]);
    }
    public function update(Request $request, FinancialCycles $cycles): JsonResponse
    {
        $data = $request->validate(['cut_day' => ['required', 'integer', 'between:1,31'], 'version' => ['required', 'integer', 'min:0']]);
        return response()->json(['data' => $cycles->configure((int) $data['cut_day'], (int) $data['version'])]);
    }
}
