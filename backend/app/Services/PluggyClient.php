<?php
namespace App\Services;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\ConnectionException;
use App\Exceptions\PluggyException as RuntimeException;

class PluggyClient
{
    /** A fresh authentication is performed for EVERY page; no token cache/reuse/retry. */
    public function page(string $accountId, ?string $next = null): array
    {
        $base = rtrim((string) config('pluggy.base_url'), '/');
        if (parse_url($base, PHP_URL_SCHEME) !== 'https' || !parse_url($base, PHP_URL_HOST)
            || !config('pluggy.client_id') || !config('pluggy.client_secret')) {
            throw new RuntimeException('Confira PLUGGY_BASE_URL, PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no backend.');
        }
        $query = $next ?? '?'.http_build_query(['accountId' => $accountId]);
        // The cursor is opaque: preserve it exactly, while refusing cross-account/host redirects.
        if (!str_starts_with($query, '?') || strlen($query) > 16384 || preg_match('/[\r\n#]/', $query)) throw new RuntimeException('A Pluggy retornou uma paginação inválida.');
        parse_str(substr($query, 1), $parameters);
        if (($parameters['accountId'] ?? null) !== $accountId) throw new RuntimeException('A Pluggy retornou uma paginação de outra conta.');
        try {
            $auth = Http::acceptJson()->asJson()->connectTimeout(5)->timeout(20)->withOptions(['allow_redirects' => false])->post($base.'/auth', [
                'clientId' => config('pluggy.client_id'), 'clientSecret' => config('pluggy.client_secret'),
            ]);
            if (!$auth->successful() || !is_string($auth->json('apiKey')) || $auth->json('apiKey') === '') throw new RuntimeException('Não foi possível autenticar na Pluggy. Confira as credenciais e tente novamente.');
            $response = Http::acceptJson()->withHeaders(['X-API-KEY' => $auth->json('apiKey')])->connectTimeout(5)->timeout(20)
                ->withOptions(['allow_redirects' => false])->get($base.'/v2/transactions'.$query);
            if (!$response->successful()) throw new RuntimeException($response->status() === 429
                ? 'A Pluggy limitou as consultas. Aguarde um instante e tente novamente.'
                : 'Não foi possível consultar as transações na Pluggy. Tente novamente.');
            $data = $response->json();
            if (!is_array($data) || !isset($data['results']) || !is_array($data['results']) || !array_is_list($data['results']) || !array_key_exists('next', $data)
                || ($data['next'] !== null && (!is_string($data['next']) || $data['next'] === ''))) throw new RuntimeException('A Pluggy retornou uma resposta inesperada.');
            return $data;
        } catch (ConnectionException $error) {
            // Do not propagate a request exception carrying credentials or upstream payloads.
            throw new RuntimeException('A conexão com a Pluggy não foi concluída. Tente novamente.');
        }
    }
}
