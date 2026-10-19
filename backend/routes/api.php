<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\TransactionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/me', function (Request $request) {
        return response()->json([
            'id' => $request->user()->id,
            'name' => $request->user()->name,
            'email' => $request->user()->email,
        ]);
    });

    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::patch('/categories/{category}', [CategoryController::class, 'update'])
        ->whereNumber('category');
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])
        ->whereNumber('category');

    Route::get('/dashboard', DashboardController::class);
    Route::get('/reports', ReportController::class);

    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::post('/transactions', [TransactionController::class, 'store']);
    Route::get('/transactions/{transaction}', [TransactionController::class, 'show'])
        ->whereNumber('transaction');
    Route::patch('/transactions/{transaction}', [TransactionController::class, 'update'])
        ->whereNumber('transaction');
    Route::delete('/transactions/{transaction}', [TransactionController::class, 'destroy'])
        ->whereNumber('transaction');
});
