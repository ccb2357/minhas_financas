<?php

return [
    'enabled' => env('TRANSACTION_VOICE_ENABLED', false),
    'api_key' => env('OPENROUTER_API_KEY', ''),
    'transcription_model' => env('OPENROUTER_TRANSCRIPTION_MODEL', 'openai/whisper-large-v3'),
    'extraction_model' => env('OPENROUTER_EXTRACTION_MODEL', 'google/gemini-2.5-flash-lite'),
];
