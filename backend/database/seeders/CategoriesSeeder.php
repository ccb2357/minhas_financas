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
                    ['Aluguéis recebidos', 'house', '#16A085'],
                    ['Aposentadoria e pensão', 'wallet', '#0984E3'],
                    ['Benefícios e auxílios', 'person_2', '#16A085'],
                    ['Bônus e comissões', 'rosette', '#7C5CFC'],
                    ['Cashback', 'percent', '#7C5CFC'],
                    ['Dividendos', 'chart_bar', '#00B894'],
                    ['Férias', 'airplane', '#00A8A8'],
                    ['Prestação de Serviços', 'wrench', '#0984E3'],
                    ['Presentes', 'gift', '#E84393'],
                    ['Reembolsos', 'arrow_2_squarepath', '#00A8A8'],
                    ['Resgates de Investimentos', 'building_columns', '#0984E3'],
                    ['Salário', 'briefcase', '#1564FF'],
                    ['Trabalhos Extras', 'desktopcomputer', '#16A085'],
                    ['Vendas', 'tag', '#00B894']
                ],
                'expense' => [
                    ['Ações', 'chart_bar_square', '#0e3a92'],
                    ['Academia', 'sportscourt', '#00B894'],
                    ['Água e Esgoto', 'drop', '#0984E3'],
                    ['Alimentação', 'bag_badge_plus', '#0984E3'],
                    ['Assinaturas', 'music_note_2', '#7C5CFC'],
                    ['Casa e Manutenção', 'hammer', '#636E72'],
                    ['Combustível', 'gauge', '#F5A623'],
                    ['Condomínio', 'building_2_fill', '#0984E3'],
                    ['Cursos e Livros', 'book', '#16A085'],
                    ['Cuidados Pessoais', 'scissors', '#A55EEA'],
                    ['Doações', 'heart', '#16A085'],
                    ['Eletrônicos', 'desktopcomputer', '#7C5CFC'],
                    ['Energia Elétrica', 'bolt', '#F5A623'],
                    ['Estacionamento e Pedágio', 'ticket', '#636E72'],
                    ['Farmácia', 'bandage', '#FF6B6B'],
                    ['Filhos', 'person_2', '#FF9F43'],
                    ['Gás', 'flame', '#E17055'],
                    ['Impostos e Taxas', 'doc_text', '#636E72'],
                    ['Internet', 'wifi', '#1564FF'],
                    ['Jogos e Apps', 'gamecontroller', '#A55EEA'],
                    ['Lazer', 'film', '#F5A623'],
                    ['Manutenção do Veículo', 'wrench', '#0984E3'],
                    ['Móveis e Eletrodomésticos', 'cube_box', '#0984E3'],
                    ['Moradia', 'house', '#1564FF'],
                    ['Outras Despesas', 'ellipsis_circle', '#636E72'],
                    ['Pets', 'paw', '#E17055'],
                    ['Plano de Saúde', 'heart_fill', '#E84393'],
                    ['Presentes', 'gift', '#E17055'],
                    ['Restaurantes e Delivery', 'bag_badge_plus', '#E17055'],
                    ['Roupas e Acessórios', 'tag', '#E84393'],
                    ['Saúde', 'heart', '#E84393'],
                    ['Seguros', 'shield', '#1564FF'],
                    ['Suplementos Academia', 'cube', '#14af00'],
                    ['Supermercado', 'cart', '#FF9F43'],
                    ['Tarifas Bancárias', 'percent', '#FF6B6B'],
                    ['Telefone e Celular', 'phone', '#7C5CFC'],
                    ['Terapia e Bem-estar', 'heart', '#A55EEA'],
                    ['Transporte', 'car_fill', '#7C5CFC'],
                    ['Viagens', 'airplane', '#00A8A8']
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
