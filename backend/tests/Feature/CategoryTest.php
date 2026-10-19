<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryTest extends TestCase
{
    use RefreshDatabase;

    private const ENDPOINT = '/api/v1/categories';

    private function signIn(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web')
            ->withHeader('Origin', 'http://localhost:5173');

        return $user;
    }

    private function payload(array $overrides = []): array
    {
        return array_replace([
            'name' => 'Alimentação',
            'type' => 'expense',
            'icon' => 'cart',
            'color' => '#F59E0B',
        ], $overrides);
    }

    private function category(User $user, array $overrides = []): Category
    {
        return $user->categories()->create($this->payload($overrides));
    }

    public function test_all_category_endpoints_require_authentication(): void
    {
        $this->getJson(self::ENDPOINT)->assertUnauthorized();
        $this->postJson(self::ENDPOINT, $this->payload())->assertUnauthorized();
        $this->patchJson(self::ENDPOINT.'/1', ['name' => 'Teste'])->assertUnauthorized();
        $this->deleteJson(self::ENDPOINT.'/1')->assertUnauthorized();
    }

    public function test_user_starts_with_an_empty_category_list(): void
    {
        $this->signIn();
        $this->getJson(self::ENDPOINT)
            ->assertOk()->assertJsonPath('data', [])->assertJsonPath('meta.total', 0);
    }

    public function test_user_can_create_a_category_with_normalized_fields(): void
    {
        $user = $this->signIn();
        $response = $this->postJson(self::ENDPOINT, $this->payload([
            'name' => '  Alimentação  ', 'color' => '#f59e0b',
        ]))->assertCreated()
            ->assertJsonPath('data.name', 'Alimentação')
            ->assertJsonPath('data.type', 'expense')
            ->assertJsonPath('data.color', '#F59E0B')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonMissingPath('data.user_id');

        $this->assertDatabaseHas('categories', [
            'id' => $response->json('data.id'), 'user_id' => $user->id,
            'name' => 'Alimentação', 'is_active' => true,
        ]);
    }

    public function test_user_can_create_an_income_category(): void
    {
        $this->signIn();
        $this->postJson(self::ENDPOINT, $this->payload([
            'type' => 'income', 'name' => 'Salário', 'icon' => 'briefcase',
        ]))->assertCreated()->assertJsonPath('data.type', 'income');
    }

    public function test_user_cannot_supply_another_owner_or_system_fields(): void
    {
        $this->signIn();
        $other = User::factory()->create();

        foreach (['user_id' => $other->id, 'id' => 99,
            'created_at' => '2000-01-01', 'updated_at' => '2000-01-01'] as $field => $value) {
            $this->postJson(self::ENDPOINT, $this->payload([$field => $value]))
                ->assertUnprocessable()->assertJsonValidationErrors($field);
        }

        $this->assertDatabaseCount('categories', 0);
    }

    public function test_required_fields_have_portuguese_validation_messages(): void
    {
        $this->signIn();
        $this->postJson(self::ENDPOINT, [])->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'type', 'icon', 'color'])
            ->assertJsonPath('errors.name.0', 'Informe o nome da categoria.');
    }

    public function test_invalid_values_do_not_create_categories(): void
    {
        $this->signIn();
        $invalidCases = [
            ['name', '   '], ['name', str_repeat('a', 81)], ['name', ['nome']],
            ['type', 'transfer'], ['type', ['expense']],
            ['icon', '<svg onload=alert(1)>'], ['icon', ['cart']],
            ['color', 'red'], ['color', '#123'], ['color', '#12ZZ00'],
            ['color', ['#FFFFFF']], ['is_active', 'yes'], ['is_active', null],
        ];

        foreach ($invalidCases as [$field, $value]) {
            $this->postJson(self::ENDPOINT, $this->payload([$field => $value]))
                ->assertUnprocessable()->assertJsonValidationErrors($field);
        }

        $this->assertDatabaseCount('categories', 0);
    }

    public function test_list_contains_only_active_categories_owned_by_the_user(): void
    {
        $user = $this->signIn();
        $visible = $this->category($user);
        $this->category($user, ['name' => 'Inativa', 'is_active' => false]);
        $this->category(User::factory()->create());

        $this->getJson(self::ENDPOINT)->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $visible->id)
            ->assertJsonPath('meta.total', 1);
    }

    public function test_list_can_filter_type_and_status(): void
    {
        $user = $this->signIn();
        $this->category($user);
        $income = $this->category($user, ['name' => 'Salário', 'type' => 'income']);
        $inactive = $this->category($user, ['name' => 'Antiga', 'is_active' => false]);
        $this->category(User::factory()->create(), ['is_active' => false]);

        $this->getJson(self::ENDPOINT.'?type=income')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $income->id);
        $this->getJson(self::ENDPOINT.'?status=inactive&type=expense')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $inactive->id);
        $this->getJson(self::ENDPOINT.'?status=all')->assertOk()
            ->assertJsonCount(3, 'data')->assertJsonPath('meta.total', 3);
    }

    public function test_list_is_paginated_and_sorted_by_name(): void
    {
        $user = $this->signIn();
        $this->category($user, ['name' => 'Transporte']);
        $first = $this->category($user, ['name' => 'Alimentação']);

        $this->getJson(self::ENDPOINT.'?per_page=1')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $first->id)
            ->assertJsonPath('meta.total', 2)->assertJsonPath('meta.last_page', 2);
        $this->getJson(self::ENDPOINT.'?per_page=1&page=2')->assertOk()
            ->assertJsonPath('data.0.name', 'Transporte')
            ->assertJsonPath('meta.current_page', 2);
    }

    public function test_invalid_list_filters_return_validation_errors(): void
    {
        $this->signIn();
        foreach (['type=transfer' => 'type', 'status=unknown' => 'status',
            'per_page=101' => 'per_page', 'per_page=0' => 'per_page',
            'page=0' => 'page', 'page=abc' => 'page'] as $query => $field) {
            $this->getJson(self::ENDPOINT.'?'.$query)
                ->assertUnprocessable()->assertJsonValidationErrors($field);
        }
    }

    public function test_user_can_edit_without_resending_the_entire_category(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->patchJson(self::ENDPOINT.'/'.$category->id, [
            'name' => ' Mercado ', 'icon' => 'bag', 'color' => '#abcdef',
        ])->assertOk()->assertJsonPath('data.name', 'Mercado')
            ->assertJsonPath('data.icon', 'bag')->assertJsonPath('data.color', '#ABCDEF')
            ->assertJsonPath('data.type', 'expense');

        $this->assertDatabaseHas('categories', ['id' => $category->id, 'user_id' => $user->id,
            'name' => 'Mercado', 'color' => '#ABCDEF']);
    }

    public function test_type_cannot_be_changed(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->patchJson(self::ENDPOINT.'/'.$category->id, ['type' => 'income'])
            ->assertUnprocessable()->assertJsonValidationErrors('type');
        $this->assertDatabaseHas('categories', ['id' => $category->id, 'type' => 'expense']);
    }

    public function test_user_cannot_transfer_ownership_when_editing(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $other = User::factory()->create();
        $this->patchJson(self::ENDPOINT.'/'.$category->id, ['user_id' => $other->id])
            ->assertUnprocessable()->assertJsonValidationErrors('user_id');
        $this->assertDatabaseHas('categories', ['id' => $category->id, 'user_id' => $user->id]);
    }

    public function test_user_cannot_edit_or_deactivate_another_users_category(): void
    {
        $this->signIn();
        $other = User::factory()->create();
        $category = $this->category($other);
        // Até um payload inválido deve responder 404, sem revelar a categoria.
        $this->patchJson(self::ENDPOINT.'/'.$category->id, ['type' => 'invalid'])
            ->assertNotFound();
        $this->deleteJson(self::ENDPOINT.'/'.$category->id)->assertNotFound();
        $this->assertDatabaseHas('categories', ['id' => $category->id,
            'user_id' => $other->id, 'name' => 'Alimentação', 'is_active' => true]);
    }

    public function test_missing_and_invalid_ids_return_not_found(): void
    {
        $this->signIn();
        foreach (['999999', 'abc', '-1'] as $id) {
            $this->patchJson(self::ENDPOINT.'/'.$id, ['name' => 'Teste'])->assertNotFound();
            $this->deleteJson(self::ENDPOINT.'/'.$id)->assertNotFound();
        }
    }

    public function test_delete_only_deactivates_and_can_be_repeated(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->deleteJson(self::ENDPOINT.'/'.$category->id)->assertNoContent();
        $this->deleteJson(self::ENDPOINT.'/'.$category->id)->assertNoContent();
        $this->assertDatabaseCount('categories', 1);
        $this->assertDatabaseHas('categories', ['id' => $category->id, 'is_active' => false]);
        $this->getJson(self::ENDPOINT)->assertJsonCount(0, 'data');
    }

    public function test_user_can_reactivate_a_category_without_changing_its_id(): void
    {
        $user = $this->signIn();
        $category = $this->category($user, ['is_active' => false]);
        $this->patchJson(self::ENDPOINT.'/'.$category->id, ['is_active' => true])
            ->assertOk()->assertJsonPath('data.id', $category->id)
            ->assertJsonPath('data.is_active', true);
        $this->getJson(self::ENDPOINT)->assertJsonCount(1, 'data');
    }

    public function test_name_is_unique_per_user_and_type_including_inactive_categories(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->postJson(self::ENDPOINT, $this->payload())
            ->assertUnprocessable()->assertJsonValidationErrors('name');
        $category->update(['is_active' => false]);
        $this->postJson(self::ENDPOINT, $this->payload())
            ->assertUnprocessable()->assertJsonValidationErrors('name');

        $this->postJson(self::ENDPOINT, $this->payload(['type' => 'income']))->assertCreated();
        // O nome de outro usuário não impede criar uma categoria própria.
        $this->category(User::factory()->create(), ['name' => 'Exclusiva']);
        $this->postJson(self::ENDPOINT, $this->payload(['name' => 'Exclusiva']))->assertCreated();
    }

    public function test_edit_can_keep_its_own_name_but_cannot_duplicate_another_category(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->category($user, ['name' => 'Transporte']);
        $this->patchJson(self::ENDPOINT.'/'.$category->id, ['name' => 'Alimentação'])
            ->assertOk();
        $this->patchJson(self::ENDPOINT.'/'.$category->id, ['name' => 'Transporte'])
            ->assertUnprocessable()->assertJsonValidationErrors('name');
    }

    public function test_database_enforces_unique_name_even_without_request_validation(): void
    {
        $user = $this->signIn();
        $this->category($user);
        $this->expectException(UniqueConstraintViolationException::class);
        $this->category($user);
    }
}
