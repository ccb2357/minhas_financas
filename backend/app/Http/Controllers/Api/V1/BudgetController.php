<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Budget\ListBudgetRequest;
use App\Http\Requests\Budget\CopyBudgetRequest;
use App\Http\Requests\Budget\StoreBudgetRequest;
use App\Http\Requests\Budget\UpdateBudgetRequest;
use App\Http\Resources\BudgetResource;
use App\Services\BudgetReader;
use App\Services\BudgetWriter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class BudgetController extends Controller
{
    public function index(ListBudgetRequest $request, BudgetReader $reader): JsonResponse
    {
        $filters = $request->validated();
        $start = app(\App\Services\FinancialCycles::class)->selected($filters);

        return DB::transaction(function () use ($request, $reader, $start, $filters): JsonResponse {
            $overview = $reader->overview($request->user(), $start, (int) ($filters['per_page'] ?? 25));
            $overview['budgets']->appends($request->only(['year', 'month', 'per_page']));
            return BudgetResource::collection($overview['budgets'])
                ->additional(['meta' => ['period' => $overview['period'], 'summary' => $overview['summary']]])->response();
        });
    }

    public function store(StoreBudgetRequest $request, BudgetWriter $writer, BudgetReader $reader): JsonResponse
    {
        $budget = $writer->save($request->user(), $request->validated());
        return (new BudgetResource($reader->find($request->user(), (string) $budget->id)))->response()->setStatusCode(201);
    }

    public function copy(CopyBudgetRequest $request, BudgetWriter $writer): JsonResponse
    {
        return response()->json(['data' => $writer->copyCycle($request->user(), $request->validated())], 201);
    }

    public function show(Request $request, BudgetReader $reader, string $budget): BudgetResource
    {
        return new BudgetResource($reader->find($request->user(), $budget));
    }

    public function update(UpdateBudgetRequest $request, BudgetWriter $writer, BudgetReader $reader, string $budget): BudgetResource
    {
        $writer->save($request->user(), $request->validated(), $budget);
        return new BudgetResource($reader->find($request->user(), $budget));
    }

    public function destroy(Request $request, string $budget): Response
    {
        $owned = $request->user()->monthlyBudgets()->withTrashed()->findOrFail($budget);
        if (!$owned->trashed()) $owned->delete();
        return response()->noContent();
    }
}
