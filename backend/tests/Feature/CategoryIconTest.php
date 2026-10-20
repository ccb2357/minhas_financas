<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryIconTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_icons_can_be_saved_as_category_identifiers(): void
    {
        $this->actingAs(User::factory()->create(), 'web')->withHeader('Origin', 'http://localhost:5173');

        foreach (Category::ICONS as $index => $icon) {
            $this->postJson('/api/v1/categories', [
                'name' => 'Categoria '.$index, 'type' => 'expense',
                'icon' => $icon, 'color' => '#1564FF',
            ])->assertCreated()->assertJsonPath('data.icon', $icon);
        }

        $this->assertDatabaseCount('categories', count(Category::ICONS));
    }

    public function test_existing_category_can_change_to_a_financial_icon_and_rejects_unknown_icons(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web')->withHeader('Origin', 'http://localhost:5173');
        $category = $user->categories()->create([
            'name' => 'Investimentos', 'type' => 'income', 'icon' => 'cart', 'color' => '#1564FF',
        ]);

        $this->patchJson('/api/v1/categories/'.$category->id, ['icon' => 'chart_pie'])
            ->assertOk()->assertJsonPath('data.icon', 'chart_pie');
        foreach (['building_columns_malicioso', '<svg onload=alert(1)>', 'Ações'] as $invalid) {
            $this->patchJson('/api/v1/categories/'.$category->id, ['icon' => $invalid])
                ->assertUnprocessable()->assertJsonValidationErrors('icon');
        }
        $this->assertSame('chart_pie', $category->fresh()->icon);
    }
}
