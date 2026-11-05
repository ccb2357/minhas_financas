<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\FinancialCycles;
use App\Services\Goals;
use Carbon\CarbonImmutable as Date;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

/** Demonstração isolada: 24 ciclos até o atual, sem apagar ou duplicar dados. */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $result = DB::transaction(function (): ?array {
            // Os ciclos são globais. Preserve a configuração real; dia 10 só no primeiro uso demo.
            DB::table('financial_cycle_settings')->insertOrIgnore(['id' => 1]);
            $settings = DB::table('financial_cycle_settings')->where('id', 1)->lockForUpdate()->first();
            $user = User::query()->where('email', 'demo@demo.com')->lockForUpdate()->first();
            if ($user && ($user->transactions()->withTrashed()->exists()
                || $user->monthlyBudgets()->withTrashed()->exists()
                || DB::table('goals')->where('user_id', $user->id)->exists())) {
                return null;
            }
            if ($settings->cut_day === null) {
                if (DB::table('financial_cycles')->exists()) {
                    throw new RuntimeException('Há ciclos sem configuração de corte. Configure o ciclo pelo app antes de gerar a demonstração.');
                }
                DB::table('financial_cycle_settings')->where('id', 1)->update([
                    'initial_cut_day' => 10, 'cut_day' => 10, 'version' => (int) $settings->version + 1,
                ]);
            }
            // Evita reutilizar o cache do serviço entre execuções no mesmo processo Artisan.
            request()->attributes->remove('financial_cycles.cache');
            $calendar = app(FinancialCycles::class);
            $today = $calendar->today();
            $current = $calendar->forDate();
            $last = $calendar->label($current->year, $current->month);
            $cycles = $calendar->between($last->subMonths(23), $last)->values();
            $user ??= new User(['email' => 'demo@demo.com']);
            $user->forceFill(['name' => 'Usuário Demo', 'password' => Hash::make('demo'),
                'email_verified_at' => now()])->save();
            (new CategoriesSeeder())->seedFor($user);
            $categories = $user->categories()->get()->keyBy(fn ($category) => $category->type->value.':'.$category->name);
            $category = function (string $type, string $name) use ($categories) {
                $row = $categories->get($type.':'.$name);
                if (!$row) throw new RuntimeException("Categoria do catálogo não encontrada: {$type}/{$name}");
                return $row;
            };
            $this->transactions($user, $cycles, $today, $category);
            $this->budgets($user, $cycles, $category);
            $this->goals($user, $cycles, $today);
            return ['first' => $cycles->first()->start_date, 'last' => $today->toDateString(),
                'transactions' => $user->transactions()->count(), 'budgets' => $user->monthlyBudgets()->count(),
                'goals' => DB::table('goals')->where('user_id', $user->id)->count()];
        }, 3);
        if ($result === null) {
            $this->command?->info('O usuário demo já possui dados. Nada foi alterado ou duplicado.');
            return;
        }
        $this->command?->info("Demo criada: {$result['first']} a {$result['last']} (24 ciclos, atual parcial).");
        $this->command?->info("{$result['transactions']} lançamentos, {$result['budgets']} orçamentos e {$result['goals']} objetivos.");
        $this->command?->info('Login: demo@demo.com | Senha: demo');
    }

    private function day(string $date): Date { return Date::parse($date, 'America/Sao_Paulo')->startOfDay(); }
    private function variation(string $key, int $base): int
    {
        return max(1, (int) round($base * (80 + hexdec(substr(hash('sha256', $key), 0, 6)) % 51) / 100));
    }

    private function transactions(User $user, Collection $cycles, Date $today, callable $category): void
    {
        // Nome, descrição, valor-base em centavos, ocorrências por ciclo, cadência.
        $expenses = [
            ['Moradia', 'Aluguel residencial', 165000, 1, 1],
            ['Condomínio', 'Condomínio', 38000, 1, 1],
            ['Água e Esgoto', 'Conta de água', 8500, 1, 1],
            ['Energia Elétrica', 'Conta de energia', 19500, 1, 1],
            ['Internet', 'Internet residencial', 11990, 1, 1],
            ['Telefone e Celular', 'Plano do celular', 5990, 1, 1],
            ['Supermercado', 'Compras de supermercado', 28500, 4, 1],
            ['Alimentação', 'Padaria e alimentação', 2500, 6, 1],
            ['Restaurantes e Delivery', 'Restaurante e delivery', 8500, 3, 1],
            ['Combustível', 'Abastecimento', 16000, 3, 1],
            ['Transporte', 'Transporte por aplicativo', 3200, 3, 1],
            ['Estacionamento e Pedágio', 'Estacionamento', 2200, 2, 1],
            ['Plano de Saúde', 'Mensalidade plano de saúde', 43000, 1, 1],
            ['Farmácia', 'Medicamentos e higiene', 7800, 2, 1],
            ['Saúde', 'Consulta médica', 22000, 1, 4],
            ['Terapia e Bem-estar', 'Sessão de terapia', 12000, 2, 2],
            ['Cursos e Livros', 'Livro ou curso', 9500, 1, 3],
            ['Filhos', 'Atividades e material infantil', 13500, 1, 2],
            ['Pets', 'Ração e cuidados', 11000, 1, 2],
            ['Cuidados Pessoais', 'Cuidados pessoais', 6500, 1, 1],
            ['Roupas e Acessórios', 'Roupas e acessórios', 16500, 1, 3],
            ['Lazer', 'Cinema e passeio', 9500, 2, 1],
            ['Academia', 'Mensalidade academia', 12990, 1, 1],
            ['Assinaturas', 'Streaming e serviços', 6990, 1, 1],
            ['Jogos e Apps', 'Aplicativo ou jogo', 3990, 1, 3],
            ['Gás', 'Botijão de gás', 12000, 1, 3],
            ['Manutenção do Veículo', 'Revisão do veículo', 48000, 1, 6],
            ['Casa e Manutenção', 'Reparos na residência', 22500, 1, 4],
            ['Móveis e Eletrodomésticos', 'Compra para casa', 85000, 1, 8],
            ['Eletrônicos', 'Acessório eletrônico', 35000, 1, 6],
            ['Impostos e Taxas', 'Impostos e taxas', 22000, 1, 6],
            ['Seguros', 'Seguro', 14500, 1, 1],
            ['Presentes', 'Presente de aniversário', 9500, 1, 3],
            ['Doações', 'Doação', 4000, 1, 2],
            ['Tarifas Bancárias', 'Tarifa bancária', 1490, 1, 1],
            ['Viagens', 'Hospedagem e viagem', 165000, 1, 12],
            ['Outras Despesas', 'Despesa eventual', 7500, 1, 4],
        ];
        $otherIncomes = ['Aluguéis recebidos', 'Aposentadoria e pensão', 'Benefícios e auxílios',
            'Bônus e comissões', 'Cashback', 'Dividendos', 'Férias',
            'Prestação de Serviços', 'Presentes', 'Reembolsos',
            'Resgates de Investimentos', 'Trabalhos Extras', 'Vendas'];
        $rows = [];
        $add = function (string $type, string $name, string $description, int $amount, Date $date) use (&$rows, $user, $category, $today): void {
            if ($date->gt($today)) return;
            $rows[] = ['user_id' => $user->id, 'category_id' => $category($type, $name)->id,
                'type' => $type, 'amount_cents' => $amount, 'description' => $description,
                'transaction_date' => $date->toDateString(), 'notes' => 'Dado fictício de demonstração.',
                'created_at' => $date->format('Y-m-d 12:00:00'), 'updated_at' => $date->format('Y-m-d 12:00:00')];
        };
        foreach ($cycles as $index => $cycle) {
            $start = $this->day($cycle->start_date); $end = $this->day($cycle->end_date);
            $days = (int) $start->diffInDays($end) + 1;
            $key = $start->toDateString();
            $add('income', 'Salário', 'Salário do ciclo', 690000 + $index * 7500, $start);
            $add('income', 'Dividendos', 'Dividendos recebidos', 3500 + $index * 250, $start->addDays(min(5, $days - 1)));
            $extra = $otherIncomes[$index % count($otherIncomes)];
            $add('income', $extra, $extra.' — demonstrativo', $this->variation($key.':extra', 45000), $start->addDays(min(8, $days - 1)));
            foreach ($expenses as $ordinal => [$name, $description, $base, $count, $cadence]) {
                if (($index + $ordinal) % $cadence !== 0) continue;
                for ($entry = 0; $entry < $count; $entry++) {
                    $offset = min($days - 1, (int) floor(($entry + 0.35) * $days / $count));
                    $amount = $this->variation("{$key}:{$name}:{$entry}", $base);
                    if (in_array($index % 6, [2, 5], true) && in_array($name, ['Supermercado', 'Lazer', 'Restaurantes e Delivery'], true)) $amount = (int) round($amount * 1.35);
                    $add('expense', $name, $description, $amount, $start->addDays($offset));
                }
            }
        }
        foreach (array_chunk($rows, 100) as $chunk) DB::table('transactions')->insert($chunk);
    }

    private function budgets(User $user, Collection $cycles, callable $category): void
    {
        $limits = ['Moradia' => 175000, 'Condomínio' => 42000, 'Água e Esgoto' => 10000,
            'Energia Elétrica' => 21000, 'Internet' => 12000, 'Telefone e Celular' => 6500,
            'Supermercado' => 125000, 'Alimentação' => 18000, 'Restaurantes e Delivery' => 32000,
            'Combustível' => 52000, 'Transporte' => 13000, 'Plano de Saúde' => 48000,
            'Farmácia' => 19000, 'Lazer' => 25000,
            'Assinaturas' => 8500, 'Academia' => 15000, 'Seguros' => 16000];
        $rows = [];
        foreach ($cycles as $index => $cycle) foreach ($limits as $name => $limit) {
            $rows[] = ['user_id' => $user->id, 'category_id' => $category('expense', $name)->id,
                'year' => $cycle->year, 'month' => $cycle->month, 'financial_cycle_id' => $cycle->id,
                'limit_cents' => (int) round($limit * (1 + ($index % 4) * 0.03)),
                'created_at' => $cycle->start_date.' 12:00:00', 'updated_at' => $cycle->start_date.' 12:00:00'];
        }
        foreach (array_chunk($rows, 100) as $chunk) DB::table('monthly_budgets')->insert($chunk);
    }

    private function goals(User $user, Collection $cycles, Date $today): void
    {
        $plans = [
            ['Reserva de emergência', 'shield', 3000000, 0, 24, 60000, 'active'],
            ['Viagem de férias', 'airplane', 800000, 0, 10, 80000, 'complete'],
            ['Notebook novo', 'desktopcomputer', 500000, 3, 8, 62500, 'complete'],
            ['Reforma da cozinha', 'house', 700000, 1, 6, 30000, 'archive'],
            ['Ar-condicionado', 'cube_box', 250000, 16, 8, 15000, 'active'],
            ['Troca do carro', 'car_fill', 4000000, 8, 16, 40000, 'active'],
            ['Curso de especialização', 'book', 300000, 8, 6, 50000, 'complete'],
            ['Móveis para casa', 'cube_box', 400000, 18, 6, 25000, 'active'],
        ];
        $service = app(Goals::class);
        foreach ($plans as $ordinal => [$name, $icon, $target, $first, $length, $amount, $state]) {
            $last = $first + $length - 1;
            $deadline = $ordinal === 0 ? null : ($state === 'active'
                ? $today->addMonthsNoOverflow(3)->toDateString() : $cycles[$last]->end_date);
            $goal = $service->create($user, ['name' => $name, 'icon' => $icon,
                'target_cents' => $target, 'deadline' => $deadline, 'request_key' => (string) Str::uuid()]);
            $created = $cycles[$first]->start_date.' 12:00:00';
            foreach (range($first, $last) as $index) {
                $date = $this->day($cycles[$index]->start_date)->addDays(3)->min($this->day($cycles[$index]->end_date))->min($today);
                $key = (string) Str::uuid();
                $goal = $service->movement($user, $goal->id, ['type' => 'contribution', 'amount_cents' => $amount,
                    'movement_date' => $date->toDateString(), 'notes' => 'Valor guardado para '.$name,
                    'version' => $goal->version, 'request_key' => $key]);
                DB::table('goal_movements')->where('goal_id', $goal->id)->where('request_key', $key)
                    ->update(['created_at' => $date->format('Y-m-d 12:00:00'), 'updated_at' => $date->format('Y-m-d 12:00:00')]);
                if ($ordinal === 0 && in_array($index, [7, 17], true)) {
                    $key = (string) Str::uuid();
                    $goal = $service->movement($user, $goal->id, ['type' => 'withdrawal', 'amount_cents' => 50000,
                        'movement_date' => $date->toDateString(), 'notes' => 'Uso de parte da reserva',
                        'version' => $goal->version, 'request_key' => $key]);
                    DB::table('goal_movements')->where('goal_id', $goal->id)->where('request_key', $key)
                        ->update(['created_at' => $date->format('Y-m-d 15:00:00'), 'updated_at' => $date->format('Y-m-d 15:00:00')]);
                }
            }
            if ($state !== 'active') $goal = $service->state($user, $goal->id, $state, $goal->version);
            $updated = $this->day($cycles[$last]->start_date)->addDays(3)->min($today)->format('Y-m-d 15:00:00');
            DB::table('goals')->where('id', $goal->id)->update(['created_at' => $created, 'updated_at' => $updated,
                'archived_at' => $state === 'active' ? null : $updated,
                'completed_at' => $state === 'complete' ? $updated : null]);
        }
    }
}
