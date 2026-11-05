<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\TransactionVoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionVoiceController
{
    public function __invoke(Request $request, TransactionVoice $voice): JsonResponse
    {
        $request->validate(['audio' => ['required', 'file', 'max:8192']]);
        return response()->json(['data' => $voice->prepare($request->user(), $request->file('audio'))])
            ->header('Cache-Control', 'no-store, private');
    }
}
