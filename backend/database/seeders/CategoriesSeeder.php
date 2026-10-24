<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/** Categorias iniciais; execução explícita, sem substituir dados existentes. */
class CategoriesSeeder extends Seeder
{
    public function run(): void
    {
        $created = DB::transaction(function (): int {
            $users = User::query()->lockForUpdate()->get();
            if ($users->count() !== 1) {
                throw new RuntimeException('É necessário exatamente um usuário existente para vincular as categorias. Nenhum dado foi alterado.');
            }
            $user = $users->first();
            $groups = [
                'income' => [
                    ['Salário', 'briefcase', '#1564FF'],
                    ['Décimo terceiro', 'calendar', '#1564FF'],
                    ['Férias', 'airplane', '#00A8A8'],
                    ['Bônus e comissões', 'rosette', '#7C5CFC'],
                    ['Trabalhos extras', 'desktopcomputer', '#16A085'],
                    ['Prestação de serviços', 'wrench', '#0984E3'],
                    ['Vendas', 'tag', '#00B894'],
                    ['Aluguéis recebidos', 'house', '#16A085'],
                    ['Dividendos e juros', 'chart_bar', '#00B894'],
                    ['Resgates de investimentos', 'building_columns', '#0984E3'],
                    ['Reembolsos', 'arrow_2_squarepath', '#00A8A8'],
                    ['Cashback', 'percent', '#7C5CFC'],
                    ['Presentes recebidos', 'gift', '#E84393'],
                    ['Benefícios e auxílios', 'person_2', '#16A085'],
                    ['Aposentadoria e pensão', 'wallet', '#0984E3'],
                    ['Outras receitas', 'money_dollar_circle', '#636E72'],
                ],
                'expense' => [
                    ['Moradia', 'house', '#1564FF'],
                    ['Condomínio', 'building_2_fill', '#0984E3'],
                    ['Energia elétrica', 'bolt', '#F5A623'],
                    ['Água e esgoto', 'drop', '#0984E3'],
                    ['Gás', 'flame', '#E17055'],
                    ['Internet', 'wifi', '#1564FF'],
                    ['Telefone e celular', 'phone', '#7C5CFC'],
                    ['Supermercado', 'cart', '#FF9F43'],
                    ['Alimentação', 'bag', '#FF6B6B'],
                    ['Restaurantes e delivery', 'bag_badge_plus', '#E17055'],
                    ['Transporte', 'car_fill', '#7C5CFC'],
                    ['Combustível', 'gauge', '#F5A623'],
                    ['Estacionamento e pedágio', 'ticket', '#636E72'],
                    ['Manutenção do veículo', 'wrench', '#0984E3'],
                    ['Saúde', 'heart', '#E84393'],
                    ['Plano de saúde', 'shield', '#E84393'],
                    ['Farmácia', 'bandage', '#FF6B6B'],
                    ['Terapia e bem-estar', 'heart', '#A55EEA'],
                    ['Educação', 'book', '#00B894'],
                    ['Cursos e livros', 'desktopcomputer', '#16A085'],
                    ['Filhos', 'person_2', '#FF9F43'],
                    ['Pets', 'paw', '#E17055'],
                    ['Cuidados pessoais', 'scissors', '#A55EEA'],
                    ['Roupas e acessórios', 'tag', '#E84393'],
                    ['Lazer', 'film', '#F5A623'],
                    ['Academia', 'sportscourt', '#00B894'],
                    ['Viagens', 'airplane', '#00A8A8'],
                    ['Assinaturas', 'music_note_2', '#7C5CFC'],
                    ['Jogos e aplicativos', 'gamecontroller', '#A55EEA'],
                    ['Presentes', 'gift', '#E17055'],
                    ['Doações', 'heart', '#16A085'],
                    ['Casa e manutenção', 'hammer', '#636E72'],
                    ['Móveis e eletrodomésticos', 'cube_box', '#0984E3'],
                    ['Eletrônicos', 'desktopcomputer', '#7C5CFC'],
                    ['Impostos e taxas', 'doc_text', '#636E72'],
                    ['Seguros', 'umbrella', '#1564FF'],
                    ['Juros e tarifas bancárias', 'percent', '#FF6B6B'],
                    ['Outras despesas', 'ellipsis_circle', '#636E72'],
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
        $this->command?->info("{$created} categorias criadas. Categorias existentes preservadas.");
    }
}
