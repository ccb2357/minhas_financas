<?php
namespace App\Services;
use App\Models\BankOperation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Exceptions\PluggyException as RuntimeException;

class BankSynchronization
{
    public function __construct(private PluggyAccounts $accounts, private PluggyClient $client, private BankOperationNormalizer $normalizer) {}
    public function sync(User $user): array
    {
        $accounts = $this->accounts->forUser($user);
        $lease = (string) Str::uuid();
        DB::transaction(function () use ($user, $lease): void {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            DB::table('bank_syncs')->insertOrIgnore(['user_id' => $user->id]);
            $state = DB::table('bank_syncs')->where('user_id', $user->id)->lockForUpdate()->first();
            abort_if($state->locked_until && CarbonImmutable::parse($state->locked_until)->isFuture(), 409, 'Já existe uma consulta aos bancos em andamento. Aguarde e atualize a lista.');
            DB::table('bank_syncs')->where('user_id', $user->id)->update(['lease' => $lease, 'locked_until' => now()->addMinutes(2), 'last_attempt_at' => now()]);
        }, 3);
        $fetched = 0; $errors = [];
        try {
            foreach ($accounts as $account) {
                try {
                    $next = null; $seen = []; $page = 0;
                    do {
                        if (++$page > config('pluggy.max_pages')) throw new RuntimeException('A consulta ultrapassou o limite de páginas. Entre em contato para revisar a integração.');
                        $updated = DB::table('bank_syncs')->where('user_id', $user->id)->where('lease', $lease)->update(['locked_until' => now()->addMinutes(2)]);
                        if (!$updated && !DB::table('bank_syncs')->where('user_id', $user->id)->where('lease', $lease)->exists()) throw new RuntimeException('A consulta foi interrompida por outra sincronização. Atualize novamente.');
                        $response = $this->client->page($account['account_id'], $next);
                        $normalized = array_map(fn ($row) => is_array($row) ? $this->normalizer->normalize($row, $account) : throw new RuntimeException('A Pluggy retornou uma operação inválida.'), $response['results']);
                        DB::transaction(function () use ($user, $normalized): void {
                            $existing = BankOperation::where('user_id', $user->id)->whereIn('external_transaction_id', array_column($normalized, 'external_transaction_id'))->lockForUpdate()->get()->keyBy('external_transaction_id');
                            $new = [];
                            foreach ($normalized as $data) {
                                $op = $existing->get($data['external_transaction_id']);
                                if (!$op) $new[$data['external_transaction_id']] = ['user_id' => $user->id, ...$data, 'created_at' => now(), 'updated_at' => now()];
                                elseif ($op->account_id !== $data['account_id']) throw new RuntimeException('Uma operação foi retornada com identificação de conta divergente.');
                                elseif ($op->review_status === 'pending') { $op->fill($data); if ($op->isDirty()) $op->save(); }
                            }
                            foreach (array_chunk(array_values($new), 200) as $chunk) BankOperation::insert($chunk);
                        }, 3);
                        $fetched += count($normalized);
                        $next = $response['next'];
                        if ($next !== null) {
                            if (isset($seen[$next])) throw new RuntimeException('A Pluggy repetiu a paginação. Tente novamente.');
                            $seen[$next] = true;
                        }
                    } while ($next !== null);
                } catch (RuntimeException $error) {
                    $errors[] = ['bank' => $account['name'], 'message' => $error->getMessage()];
                }
            }
            if (!$errors) DB::table('bank_syncs')->where('user_id', $user->id)->where('lease', $lease)->update(['last_success_at' => now()]);
            return ['complete' => !$errors, 'fetched' => $fetched, 'errors' => $errors];
        } finally {
            DB::table('bank_syncs')->where('user_id', $user->id)->where('lease', $lease)->update(['lease' => null, 'locked_until' => null]);
        }
    }
}
