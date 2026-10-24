<?php
namespace App\Services;
use App\Models\User;
use Illuminate\Support\Facades\Validator;

class PluggyAccounts
{
    public function forUser(User $user): array
    {
        $owner = config('pluggy.user_id') ?: User::orderBy('id')->value('id');
        abort_unless((string) $owner === (string) $user->id, 403, 'A conciliação está disponível apenas para o titular configurado.');
        $path = config('pluggy.accounts_file');
        abort_unless(is_string($path) && is_file($path) && is_readable($path), 422, 'Configure o arquivo privado pluggy-accounts.json no backend.');
        try { $data = json_decode(file_get_contents($path), true, 32, JSON_THROW_ON_ERROR); }
        catch (\JsonException $error) { abort(422, 'O arquivo pluggy-accounts.json contém JSON inválido.'); }
        $validator = Validator::make(is_array($data) ? $data : [], [
            'accounts' => ['required', 'array', 'min:1', 'max:50'],
            'accounts.*.name' => ['required', 'string', 'max:100'],
            'accounts.*.account_id' => ['required', 'uuid', 'distinct'],
        ]);
        abort_if($validator->fails(), 422, 'Confira os nomes e account_id no arquivo pluggy-accounts.json. Cada conta precisa de um UUID distinto.');
        return array_map(fn ($a) => ['name' => trim($a['name']), 'account_id' => $a['account_id']], $validator->validated()['accounts']);
    }
}
