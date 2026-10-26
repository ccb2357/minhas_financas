<?php

namespace App\Services;

use App\Models\User;
use App\Rules\IntegerCents;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Savings declarations only: never writes transactions, budgets or cycles. */
class Goals
{
    public function query(User $user)
    {
        return DB::table('goals')->select('goals.*')->selectSub(
            DB::table('goal_movements')->selectRaw('COUNT(*)')->whereColumn('goal_id', 'goals.id'), 'movement_count'
        )->where('user_id', $user->id);
    }

    public function find(User $user, int $id, bool $lock = false): object
    {
        $query = $this->query($user)->where('id', $id);
        $goal = ($lock ? $query->lockForUpdate() : $query)->first();
        abort_unless($goal, 404);
        return $goal;
    }

    public function present(object $goal): array
    {
        $saved = (int) $goal->saved_cents; $target = (int) $goal->target_cents;
        return ['id' => (int) $goal->id, 'name' => $goal->name, 'icon' => $goal->icon,
            'target_cents' => $target, 'saved_cents' => $saved, 'remaining_cents' => max(0, $target - $saved),
            'progress_percent' => min(100, round($saved / $target * 100, 1)), 'target_reached' => $saved >= $target,
            'deadline' => $goal->deadline, 'status' => $goal->status, 'archived_at' => $goal->archived_at,
            'completed_at' => $goal->completed_at, 'version' => (int) $goal->version,
            'movement_count' => (int) $goal->movement_count];
    }

    private function version(object $goal, int $version): void
    {
        abort_if((int) $goal->version !== $version, 409, 'Este objetivo mudou em outra sessão. Atualize os dados antes de continuar.');
    }

    private function active(object $goal): void
    {
        abort_if($goal->status !== 'active', 409, 'Reabra o objetivo para editar ou movimentar os valores.');
    }

    private function hash(array $data, array $fields): string
    {
        return hash('sha256', json_encode(array_map(fn ($key) => $data[$key] ?? null, $fields), JSON_THROW_ON_ERROR));
    }

    public function create(User $user, array $data): object
    {
        return DB::transaction(function () use ($user, $data): object {
            DB::table('users')->where('id', $user->id)->lockForUpdate()->first();
            $hash = $this->hash($data, ['name', 'icon', 'target_cents', 'deadline']);
            $existing = $this->query($user)->where('request_key', $data['request_key'])->first();
            if ($existing) {
                abort_if($existing->request_hash !== $hash, 409, 'Esta solicitação já foi usada com outros dados. Atualize a tela.');
                return $existing;
            }
            $now = now();
            $id = DB::table('goals')->insertGetId([
                'user_id' => $user->id, 'name' => $data['name'], 'icon' => $data['icon'],
                'target_cents' => $data['target_cents'], 'deadline' => $data['deadline'] ?? null,
                'request_key' => $data['request_key'], 'request_hash' => $hash, 'created_at' => $now, 'updated_at' => $now,
            ]);
            return $this->find($user, $id);
        }, 3);
    }

    public function update(User $user, int $id, array $data): object
    {
        return DB::transaction(function () use ($user, $id, $data): object {
            $goal = $this->find($user, $id, true); $this->active($goal); $this->version($goal, $data['version']);
            $this->query($user)->where('id', $id)->update([
                'name' => $data['name'], 'icon' => $data['icon'], 'target_cents' => $data['target_cents'],
                'deadline' => $data['deadline'] ?? null, 'version' => $goal->version + 1, 'updated_at' => now(),
            ]);
            return $this->find($user, $id);
        }, 3);
    }

    public function state(User $user, int $id, string $action, int $version): object
    {
        return DB::transaction(function () use ($user, $id, $action, $version): object {
            $goal = $this->find($user, $id, true); $this->version($goal, $version);
            if ($action === 'reopen') {
                abort_unless($goal->status === 'archived', 409, 'Este objetivo já está ativo.');
            } else {
                $this->active($goal);
                if ($action === 'complete' && $goal->saved_cents < $goal->target_cents) {
                    throw ValidationException::withMessages(['action' => 'A meta ainda não foi atingida. Você pode arquivar o objetivo sem concluir.']);
                }
            }
            $this->query($user)->where('id', $id)->update([
                'status' => $action === 'reopen' ? 'active' : 'archived',
                'archived_at' => $action === 'reopen' ? null : now(),
                'completed_at' => $action === 'complete' ? now() : null,
                'version' => $goal->version + 1, 'updated_at' => now(),
            ]);
            return $this->find($user, $id);
        }, 3);
    }

    private function signed(object|array $movement): int
    {
        $movement = (array) $movement;
        return ($movement['type'] === 'withdrawal' ? -1 : 1) * (int) $movement['amount_cents'];
    }

    /** The parent row serializes deposits, withdrawals, corrections and state changes. */
    public function movement(User $user, int $goalId, array $data, ?int $id = null, bool $delete = false): object
    {
        return DB::transaction(function () use ($user, $goalId, $data, $id, $delete): object {
            $goal = $this->find($user, $goalId, true);
            $rows = DB::table('goal_movements')->where('goal_id', $goalId);
            $hash = $this->hash($data, ['type', 'amount_cents', 'movement_date', 'notes']);
            if (!$id) {
                $existing = (clone $rows)->where('request_key', $data['request_key'])->first();
                if ($existing) {
                    abort_if($existing->request_hash !== $hash, 409, 'Esta solicitação já foi usada com outros dados. Atualize a tela.');
                    return $goal;
                }
            }
            $this->active($goal); $this->version($goal, $data['version']);
            $old = $id ? (clone $rows)->where('id', $id)->first() : null;
            if ($id) abort_unless($old, 404);
            $balance = (int) $goal->saved_cents - ($old ? $this->signed($old) : 0) + ($delete ? 0 : $this->signed($data));
            if ($balance < 0 || $balance > IntegerCents::MAX) {
                throw ValidationException::withMessages(['amount_cents' => $balance < 0
                    ? 'A operação deixaria o valor guardado negativo. Confira as retiradas e os valores registrados.'
                    : 'O valor guardado ultrapassaria o limite permitido.']);
            }
            $now = now();
            if ($delete) {
                (clone $rows)->where('id', $id)->delete();
            } else {
                $values = ['type' => $data['type'], 'amount_cents' => $data['amount_cents'],
                    'movement_date' => $data['movement_date'], 'notes' => $data['notes'] ?? null, 'updated_at' => $now];
                if ($id) (clone $rows)->where('id', $id)->update($values);
                else DB::table('goal_movements')->insert($values + ['goal_id' => $goalId,
                    'request_key' => $data['request_key'], 'request_hash' => $hash, 'created_at' => $now]);
            }
            $this->query($user)->where('id', $goalId)->update(['saved_cents' => $balance, 'version' => $goal->version + 1, 'updated_at' => $now]);
            return $this->find($user, $goalId);
        }, 3);
    }
}
