<?php
return [
    'base_url' => env('PLUGGY_BASE_URL', 'https://api.pluggy.ai'),
    'client_id' => env('PLUGGY_CLIENT_ID'),
    'client_secret' => env('PLUGGY_CLIENT_SECRET'),
    'accounts_file' => storage_path('app/private/pluggy-accounts.json'),
    // Personal app: defaults to the first registered user. Never shares bank data with other users.
    'user_id' => env('PLUGGY_USER_ID'),
    'max_pages' => 1000,
];
