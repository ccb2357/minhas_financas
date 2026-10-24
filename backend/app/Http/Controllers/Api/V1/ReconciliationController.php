<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Http\Requests\Transaction\StoreTransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Models\BankOperation;
use App\Services\PluggyAccounts;
use App\Services\BankSynchronization;
use App\Services\BankReconciliation;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class ReconciliationController extends Controller
{
    public function index(Request $request, PluggyAccounts $settings): JsonResponse
    {
        $filters = $request->validate(['page' => ['sometimes', 'integer', 'min:1'], 'per_page' => ['sometimes', 'integer', 'between:1,100']]);
        $accounts = $settings->forUser($request->user());
        $rows = BankOperation::where('user_id', $request->user()->id)->where('review_status', 'pending')
            ->where('type', 'expense')
            ->whereIn('account_id', array_column($accounts, 'account_id'))->orderByDesc('transaction_date')->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 25, ['id','external_transaction_id','bank_name','description','type','amount_cents','currency_code','transaction_date','source_status']);
        return response()->json(['data' => $rows->items(), 'meta' => ['current_page' => $rows->currentPage(), 'last_page' => $rows->lastPage(), 'total' => $rows->total()]]);
    }
    public function sync(Request $request, BankSynchronization $sync): JsonResponse
    {
        return response()->json(['data' => $sync->sync($request->user())]);
    }
    public function ignore(Request $request, BankReconciliation $service, string $operation): Response
    {
        $service->ignore($request->user(), $operation); return response()->noContent();
    }
    public function add(StoreTransactionRequest $request, BankReconciliation $service, string $operation): JsonResponse
    {
        return (new TransactionResource($service->add($request->user(), $operation, $request->validated())))->response()->setStatusCode(201);
    }
}
