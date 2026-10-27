<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\BudgetController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\TransactionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::controller(\App\Http\Controllers\Api\V1\GoalController::class)->group(function (): void {
        Route::get('/goals', 'index');
        Route::post('/goals', 'store');
        Route::get('/goals/{goal}', 'show')->whereNumber('goal');
        Route::patch('/goals/{goal}', 'update')->whereNumber('goal');
        Route::post('/goals/{goal}/state', 'state')->whereNumber('goal');
        Route::get('/goals/{goal}/movements', 'movements')->whereNumber('goal');
        Route::post('/goals/{goal}/movements', 'saveMovement')->whereNumber('goal');
        Route::patch('/goals/{goal}/movements/{movement}', 'saveMovement')->whereNumber('goal')->whereNumber('movement');
        Route::delete('/goals/{goal}/movements/{movement}', 'deleteMovement')->whereNumber('goal')->whereNumber('movement');
    });
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/me', function (Request $request) {
        return response()->json([
            'id' => $request->user()->id,
            'name' => $request->user()->name,
            'email' => $request->user()->email,
        ]);
    });

    Route::patch('/me', [ProfileController::class, 'update'])->middleware('throttle:10,1');
    Route::put('/me/password', [ProfileController::class, 'password'])->middleware('throttle:5,1');

    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::patch('/categories/{category}', [CategoryController::class, 'update'])
        ->whereNumber('category');
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])
        ->whereNumber('category');

    Route::get('/financial-cycle', [\App\Http\Controllers\Api\V1\FinancialCycleController::class, 'show']);
    Route::put('/financial-cycle', [\App\Http\Controllers\Api\V1\FinancialCycleController::class, 'update'])->middleware('throttle:10,1');

    Route::get('/dashboard', DashboardController::class);
    Route::get('/reports', ReportController::class);

    Route::get('/budgets', [BudgetController::class, 'index']);
    Route::post('/budgets', [BudgetController::class, 'store']);
    Route::post('/budgets/copy', [BudgetController::class, 'copy']);
    Route::get('/budgets/{budget}', [BudgetController::class, 'show'])->whereNumber('budget');
    Route::patch('/budgets/{budget}', [BudgetController::class, 'update'])->whereNumber('budget');
    Route::delete('/budgets/{budget}', [BudgetController::class, 'destroy'])->whereNumber('budget');

    Route::get('/reconciliation', [\App\Http\Controllers\Api\V1\ReconciliationController::class, 'index']);
    Route::post('/reconciliation/sync', [\App\Http\Controllers\Api\V1\ReconciliationController::class, 'sync'])->middleware('throttle:5,1');
    Route::post('/reconciliation/{operation}/ignore', [\App\Http\Controllers\Api\V1\ReconciliationController::class, 'ignore'])->whereNumber('operation');
    Route::post('/reconciliation/{operation}/add', [\App\Http\Controllers\Api\V1\ReconciliationController::class, 'add'])->whereNumber('operation');

    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::post('/transactions', [TransactionController::class, 'store']);
    Route::get('/transactions/{transaction}', [TransactionController::class, 'show'])
        ->whereNumber('transaction');
    Route::patch('/transactions/{transaction}', [TransactionController::class, 'update'])
        ->whereNumber('transaction');
    Route::delete('/transactions/{transaction}', [TransactionController::class, 'destroy'])
        ->whereNumber('transaction');
});
