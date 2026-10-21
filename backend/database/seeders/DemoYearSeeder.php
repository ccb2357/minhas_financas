<?php

namespace Database\Seeders;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/** Execução explícita: substitui somente dados financeiros; não cria/altera usuários. */
class DemoYearSeeder extends Seeder
{
    public function run(): void
    {
        $year = CarbonImmutable::now('America/Sao_Paulo')->year;
        DB::transaction(function () use ($year): void {
            $users = User::query()->lockForUpdate()->get();
            if ($users->count() !== 1) {
                throw new RuntimeException('É necessário exatamente um usuário existente. Nenhum dado foi alterado.');
            }
            $user = $users->first();
            // DELETE respeita FKs e rollback. Inclui registros já removidos logicamente.
            foreach (['transactions', 'monthly_budgets', 'categories'] as $table) {
                DB::table($table)->where('user_id', $user->id)->delete();
            }
            $definitions = [
                'salary' => ['Salário', 'income', 'briefcase', '#1564FF'],
                'freelance' => ['Trabalhos extras', 'income', 'desktopcomputer', '#16A085'],
                'bonus' => ['Receitas extras', 'income', 'gift', '#7C5CFC'],
                'home' => ['Moradia', 'expense', 'house', '#1564FF'],
                'market' => ['Supermercado', 'expense', 'cart', '#FF9F43'],
                'transport' => ['Transporte', 'expense', 'car_fill', '#7C5CFC'],
                'food' => ['Alimentação', 'expense', 'bag', '#FF6B6B'],
                'health' => ['Saúde', 'expense', 'heart', '#E84393'],
                'education' => ['Educação', 'expense', 'book', '#00B894'],
                'leisure' => ['Lazer', 'expense', 'film', '#F5A623'],
                'subscriptions' => ['Assinaturas', 'expense', 'wifi', '#0984E3'],
                'personal' => ['Cuidados pessoais', 'expense', 'scissors', '#A55EEA'],
                'maintenance' => ['Casa e manutenção', 'expense', 'wrench', '#636E72'],
                'gifts' => ['Presentes', 'expense', 'gift', '#E17055'],
                'travel' => ['Viagens', 'expense', 'airplane', '#00A8A8'],
            ];
            $categories = [];
            foreach ($definitions as $key => [$name, $type, $icon, $color]) {
                $categories[$key] = $user->categories()->create(compact('name', 'type', 'icon', 'color') + ['is_active' => true]);
            }
            $now = now()->format('Y-m-d H:i:s');
            for ($month = 1; $month <= 12; $month++) {
                $rows = [];
                $add = function (string $key, int $day, int $cents, string $description) use (&$rows, $user, $categories, $year, $month, $now): void {
                    $rows[] = [
                        'user_id' => $user->id, 'category_id' => $categories[$key]->id,
                        'type' => $categories[$key]->type->value, 'amount_cents' => $cents,
                        'description' => $description,
                        'transaction_date' => sprintf('%04d-%02d-%02d', $year, $month, $day),
                        'notes' => 'Dado de demonstração gerado pelo DemoYearSeeder.',
                        'created_at' => $now, 'updated_at' => $now, 'deleted_at' => null,
                    ];
                };
                $add('salary', 5, 720000 + ($month >= 7 ? 25000 : 0), 'Salário mensal');
                $add('freelance', 18, 42000 + (($month * 7919) % 85000), 'Projeto freelance');
                if (in_array($month, [3, 6, 9, 12], true)) $add('bonus', 20, $month === 12 ? 360000 : 35000 + $month * 1500, $month === 12 ? 'Décimo terceiro' : 'Bonificação trimestral');
                $add('home', 8, 180000, 'Aluguel');
                $add('home', 12, 18990 + $month * 167, 'Energia elétrica');
                $add('home', 15, 7490 + $month * 83, 'Água e esgoto');
                foreach ([2, 9, 16, 23] as $index => $day) $add('market', $day, 20937 + (($month * 1193 + $index * 2137) % 12500), 'Compras da semana '.($index + 1));
                foreach ([7, 21] as $index => $day) $add('transport', $day, 17990 + (($month * 1379 + $index * 193) % 7000), 'Abastecimento '.($index + 1));
                $add('transport', 14, 3250 + $month * 87, 'Transporte por aplicativo');
                foreach ([6, 13, 27] as $index => $day) $add('food', $day, 5590 + (($month * 719 + $index * 1023) % 6500), 'Restaurante '.($index + 1));
                $add('health', 10, 28990, 'Plano de saúde');
                $add('health', 19, 3579 + (($month * 313) % 5000), 'Farmácia');
                $add('education', 11, 19990 + ($month % 3) * 2000, 'Curso e material de estudo');
                $add('leisure', 17, 7590 + (($month * 811) % 8000), 'Cinema e passeio');
                $add('leisure', 24, 4590 + $month * 137, 'Lazer no fim de semana');
                $add('subscriptions', 9, 11990, 'Internet residencial');
                $add('subscriptions', 22, 5590, 'Streaming e música');
                $add('personal', 16, 6590 + ($month % 4) * 1500, 'Cuidados pessoais');
                $add('maintenance', 25, $month === 7 ? 450000 : 8590 + $month * 379, $month === 7 ? 'Troca de eletrodoméstico' : 'Itens e manutenção da casa');
                $add('gifts', 26, $month === 12 ? 125000 : 4590 + ($month % 4) * 3500, $month === 12 ? 'Presentes de Natal' : 'Presente de aniversário');
                if (in_array($month, [1, 7, 12], true)) $add('travel', 28, $month === 7 ? 275000 : 135000 + $month * 5000, 'Viagem de férias');
                DB::table('transactions')->insert($rows);
                $budgetKeys = ['home', 'market', 'transport', 'food', 'health', 'education', 'leisure', 'subscriptions', 'personal', 'maintenance'];
                $targets = [65, 85, 95, 100, 115];
                foreach ($budgetKeys as $index => $key) {
                    $spent = array_sum(array_column(array_filter($rows, fn (array $row): bool => $row['category_id'] === $categories[$key]->id), 'amount_cents'));
                    $user->monthlyBudgets()->create([
                        'category_id' => $categories[$key]->id, 'year' => $year, 'month' => $month,
                        'limit_cents' => intdiv($spent * 100, $targets[($month + $index) % count($targets)]),
                    ]);
                }
            }
        });
        $this->command?->info("Demonstração de janeiro a dezembro de {$year} gerada. Usuário e senha preservados.");
    }
}
