<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/** Catálogo compartilhado; nunca substitui categorias existentes. */
class CategoriesSeeder extends Seeder
{
    public function run(): void
    {
        $created = DB::transaction(function (): int {
            $users = User::query()->lockForUpdate()->get();
            if ($users->count() !== 1) {
                throw new RuntimeException('É necessário exatamente um usuário existente para vincular as categorias. Nenhum dado foi alterado.');
            }
            return $this->seedFor($users->first());
        }, 3);
        $this->command?->info("{$created} categorias criadas. Categorias existentes preservadas.");
    }

    /** Usado pelo DemoSeeder para vincular o mesmo catálogo ao usuário correto. */
    public function seedFor(User $user): int
    {
        return DB::transaction(function () use ($user): int {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $groups = [
                'income' => [
                    ['Salário', 'briefcase', '#1564FF'],
                    ['Férias', 'airplane', '#00A8A8'],
                    ['Bônus e comissões', 'rosette', '#7C5CFC'],
                    ['Trabalhos Extras', 'desktopcomputer', '#16A085'],
                    ['Prestação de Serviços', 'wrench', '#0984E3'],
                    ['Vendas', 'tag', '#00B894'],
                    ['Aluguéis recebidos', 'house', '#16A085'],
                    ['Dividendos', 'chart_bar', '#00B894'],
                    ['Resgates de Investimentos', 'building_columns', '#0984E3'],
                    ['Reembolsos', 'arrow_2_squarepath', '#00A8A8'],
                    ['Cashback', 'percent', '#7C5CFC'],
                    ['Presentes Recebidos', 'gift', '#E84393'],
                    ['Benefícios e auxílios', 'person_2', '#16A085'],
                    ['Aposentadoria e pensão', 'wallet', '#0984E3'],
                    ['Outras receitas', 'money_dollar_circle', '#636E72'],
                ],
                'expense' => [
                    ['Moradia', 'house', '#1564FF'],
                    ['Condomínio', 'building_2_fill', '#0984E3'],
                    ['Energia Elétrica', 'bolt', '#F5A623'],
                    ['Água e Esgoto', 'drop', '#0984E3'],
                    ['Gás', 'flame', '#E17055'],
                    ['Internet', 'wifi', '#1564FF'],
                    ['Telefone e Celular', 'phone', '#7C5CFC'],
                    ['Supermercado', 'cart', '#FF9F43'],
                    ['Alimentação', 'bag', '#FF6B6B'],
                    ['Restaurantes e Delivery', 'bag_badge_plus', '#E17055'],
                    ['Transporte', 'car_fill', '#7C5CFC'],
                    ['Combustível', 'gauge', '#F5A623'],
                    ['Estacionamento e Pedágio', 'ticket', '#636E72'],
                    ['Manutenção do Veículo', 'wrench', '#0984E3'],
                    ['Saúde', 'heart', '#E84393'],
                    ['Plano de Saúde', 'shield', '#E84393'],
                    ['Farmácia', 'bandage', '#FF6B6B'],
                    ['Terapia e Bem-estar', 'heart', '#A55EEA'],
                    ['Educação', 'book', '#00B894'],
                    ['Cursos e Livros', 'desktopcomputer', '#16A085'],
                    ['Filhos', 'person_2', '#FF9F43'],
                    ['Pets', 'paw', '#E17055'],
                    ['Cuidados Pessoais', 'scissors', '#A55EEA'],
                    ['Roupas e Acessórios', 'tag', '#E84393'],
                    ['Lazer', 'film', '#F5A623'],
                    ['Academia', 'sportscourt', '#00B894'],
                    ['Viagens', 'airplane', '#00A8A8'],
                    ['Assinaturas', 'music_note_2', '#7C5CFC'],
                    ['Jogos e Aplicativos', 'gamecontroller', '#A55EEA'],
                    ['Presentes', 'gift', '#E17055'],
                    ['Doações', 'heart', '#16A085'],
                    ['Casa e Manutenção', 'hammer', '#636E72'],
                    ['Móveis e Eletrodomésticos', 'cube_box', '#0984E3'],
                    ['Eletrônicos', 'desktopcomputer', '#7C5CFC'],
                    ['Impostos e Taxas', 'doc_text', '#636E72'],
                    ['Seguros', 'umbrella', '#1564FF'],
                    ['Tarifas Bancárias', 'percent', '#FF6B6B'],
                    ['Outras Despesas', 'ellipsis_circle', '#636E72'],
                ],
            ];
            $created = 0;
            foreach ($groups as $type => $definitions) {
                foreach ($definitions as [$name, $icon, $color]) {
                    $category = $user->categories()->firstOrCreate(
                        ['type' => $type, 'name' => $name],
                        ['icon' => $icon, 'color' => $color, 'is_active' => true],
                    );
                    $created += (int) $category->wasRecentlyCreated;
                }
            }
            return $created;
        }, 3);
    }
}
