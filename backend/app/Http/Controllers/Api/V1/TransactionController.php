<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transaction\ListTransactionRequest;
use App\Http\Requests\Transaction\StoreTransactionRequest;
use App\Http\Requests\Transaction\UpdateTransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Services\TransactionWriter;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TransactionController extends Controller
{
    public function index(ListTransactionRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        // O mês padrão acompanha o calendário local do aplicativo no Brasil.
        $today = CarbonImmutable::now('America/Sao_Paulo');
        $start = CarbonImmutable::create($filters['year'] ?? $today->year,
            $filters['month'] ?? $today->month, 1)->startOfDay();
        $query = $request->user()->transactions()->with('category')
            ->where('transaction_date', '>=', $start->format('Y-m-d'))
            ->where('transaction_date', '<', $start->addMonth()->format('Y-m-d'));

        foreach (['type', 'category_id'] as $field) {
            if (isset($filters[$field])) $query->where($field, $filters[$field]);
        }
        if (($filters['search'] ?? '') !== '') {
            // ESCAPE explícito e neutro entre SQLite/MySQL: % e _ são literais.
            $search = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $filters['search']);
            $query->whereRaw("description LIKE ? ESCAPE '!'", ['%'.$search.'%']);
        }

        return TransactionResource::collection(
            $query->orderByDesc('transaction_date')->orderByDesc('id')
                ->paginate($filters['per_page'] ?? 25)
                ->appends($request->only(['year', 'month', 'type', 'category_id', 'search', 'per_page']))
        );
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
