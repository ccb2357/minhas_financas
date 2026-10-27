<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transaction\ListTransactionRequest;
use App\Http\Requests\Transaction\StoreTransactionRequest;
use App\Http\Requests\Transaction\UpdateTransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Services\TransactionWriter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TransactionController extends Controller
{
    public function index(ListTransactionRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $calendar = app(\App\Services\FinancialCycles::class);
        $label = $calendar->selected($filters);
        $cycle = $calendar->forLabel($label);
        $start = $calendar->start($cycle); $end = $calendar->endExclusive($cycle);
        $query = $request->user()->transactions()->with('category')
            ->where('transaction_date', '>=', $start->format('Y-m-d'))
            ->where('transaction_date', '<', $end->format('Y-m-d'));

        if ($filters['unbudgeted'] ?? false) {
            $budgetCategories = $request->user()->monthlyBudgets()
                ->where('financial_cycle_id', $cycle->id)->select('category_id');
            $query->where('type', 'expense')->whereNotIn('category_id', $budgetCategories);
        }

        foreach (['type', 'category_id'] as $field) {
            if (isset($filters[$field])) $query->where($field, $filters[$field]);
        }
        if (($filters['search'] ?? '') !== '') {
            // ESCAPE explícito e neutro entre SQLite/MySQL: % e _ são literais.
            $search = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $filters['search']);
            $query->whereRaw("description LIKE ? ESCAPE '!'", ['%'.$search.'%']);
        }

        $extra = [];
        if ($filters['unbudgeted'] ?? false) {
            $extra['meta'] = [
                'total_amount_cents' => (int) (clone $query)->sum('amount_cents'),
                // Aggregate the entire filtered cycle, independently of transaction pagination.
                'by_category' => (clone $query)->select('category_id')
                    ->selectRaw('SUM(amount_cents) AS total_cents')->groupBy('category_id')
                    ->orderByDesc('total_cents')->orderBy('category_id')->get()
                    ->map(fn ($row) => [
                        'category' => ['id' => (int) $row->category->id, 'name' => $row->category->name,
                            'icon' => $row->category->icon, 'color' => $row->category->color],
                        'amount_cents' => (int) $row->total_cents,
                    ])->values()->all(),
            ];
        }
        $extra['meta']['period'] = $calendar->present($cycle);

        return TransactionResource::collection(
            $query->orderByDesc('transaction_date')->orderByDesc('id')
                ->paginate($filters['per_page'] ?? 25)
                ->appends($request->only(['year', 'month', 'type', 'category_id', 'search', 'per_page', 'unbudgeted']))
        )->additional($extra);
    }

    public function store(StoreTransactionRequest $request, TransactionWriter $writer): JsonResponse
    {
        return (new TransactionResource($writer->save($request->user(), $request->validated())))
            ->response()->setStatusCode(201);
    }

    public function show(Request $request, string $transaction): TransactionResource
    {
        return new TransactionResource($request->user()->transactions()->with('category')->findOrFail($transaction));
    }

    public function update(UpdateTransactionRequest $request, TransactionWriter $writer, string $transaction): TransactionResource
    {
        return new TransactionResource($writer->save($request->user(), $request->validated(), $transaction));
    }

    public function destroy(Request $request, string $transaction): Response
    {
        $owned = $request->user()->transactions()->withTrashed()->findOrFail($transaction);
        if (!$owned->trashed()) $owned->delete();

        return response()->noContent();
    }
}
