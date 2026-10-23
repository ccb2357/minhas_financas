<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use App\Rules\IntegerCents;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionTest extends TestCase
{
    use RefreshDatabase;

    private const API = '/api/v1/transactions';
    private const MONTH = '?year=2026&month=10';
    private int $categorySequence = 0;

    private function category(User $user, array $overrides = []): Category
    {
        return $user->categories()->create(array_replace([
            'name' => 'Categoria '.(++$this->categorySequence), 'type' => 'expense',
            'icon' => 'cart', 'color' => '#2463EB',
        ], $overrides));
    }

    private function signedIn(): array
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web')->withHeader('Origin', 'http://localhost:5173');

        return [$user, $this->category($user)];
    }

    private function payload(Category $category, array $overrides = []): array
    {
        return array_replace([
            'category_id' => $category->id, 'type' => $category->type->value,
            'amount_cents' => 23490, 'description' => 'Supermercado',
            'transaction_date' => '2026-10-25', 'notes' => null,
        ], $overrides);
    }

    private function transaction(User $user, Category $category, array $overrides = []): Transaction
    {
        return $user->transactions()->create($this->payload($category, $overrides));
    }

    public function test_all_transaction_endpoints_require_authentication(): void
    {
        $this->getJson(self::API)->assertUnauthorized();
        $this->postJson(self::API, [])->assertUnauthorized();
        $this->getJson(self::API.'/1')->assertUnauthorized();
        $this->patchJson(self::API.'/1', [])->assertUnauthorized();
        $this->deleteJson(self::API.'/1')->assertUnauthorized();
    }

    public function test_user_can_create_expense_with_exact_cents_and_calendar_date(): void
    {
        [$user, $category] = $this->signedIn();
        $this->app['config']->set('app.timezone', 'America/Sao_Paulo');
        $response = $this->postJson(self::API, $this->payload($category, [
            'description' => '  Supermercado  ', 'notes' => '  Compra do mês  ',
        ]))->assertCreated()->assertJsonPath('data.amount_cents', 23490)
            ->assertJsonPath('data.description', 'Supermercado')
            ->assertJsonPath('data.transaction_date', '2026-10-25')
            ->assertJsonPath('data.notes', 'Compra do mês')
            ->assertJsonPath('data.category.id', $category->id)
            ->assertJsonMissingPath('data.user_id')
            ->assertJsonMissingPath('data.deleted_at');

        $this->assertDatabaseHas('transactions', [
            'id' => $response->json('data.id'), 'user_id' => $user->id,
            'category_id' => $category->id, 'amount_cents' => 23490,
            'transaction_date' => '2026-10-25', 'deleted_at' => null,
        ]);
    }

    public function test_income_amount_is_stored_positive_and_type_determines_its_meaning(): void
    {
        [$user] = $this->signedIn();
        $category = $this->category($user, ['type' => 'income']);
        $this->postJson(self::API, $this->payload($category, ['amount_cents' => 500000]))
            ->assertCreated()->assertJsonPath('data.type', 'income')
            ->assertJsonPath('data.amount_cents', 500000);
    }

    public function test_required_fields_return_validation_errors(): void
    {
        $this->signedIn();
        $this->postJson(self::API, [])->assertUnprocessable()
            ->assertJsonValidationErrors(['category_id', 'type', 'amount_cents', 'description', 'transaction_date']);
    }

    public function test_cents_must_be_positive_json_integers_within_the_limit(): void
    {
        [, $category] = $this->signedIn();
        foreach ([0, -1, 12.34, 1.0, true, false, '1234', '12.34', [], null, IntegerCents::MAX + 1] as $amount) {
            $this->postJson(self::API, $this->payload($category, ['amount_cents' => $amount]), [], JSON_PRESERVE_ZERO_FRACTION)
                ->assertUnprocessable()->assertJsonValidationErrors('amount_cents');
        }
        $this->assertDatabaseCount('transactions', 0);
        foreach ([1, IntegerCents::MAX] as $amount) {
            $this->postJson(self::API, $this->payload($category, ['amount_cents' => $amount]))
                ->assertCreated()->assertJsonPath('data.amount_cents', $amount);
        }
    }

    public function test_invalid_dates_and_text_are_rejected(): void
    {
        [, $category] = $this->signedIn();
        foreach ([
            ['transaction_date', '2026-02-29'], ['transaction_date', '2026-04-31'],
            ['transaction_date', '25/10/2026'], ['transaction_date', '2026-10-25T00:00:00Z'],
            ['transaction_date', '1899-12-31'], ['transaction_date', '2101-01-01'],
            ['description', '   '], ['description', str_repeat('x', 256)],
            ['description', ['invalid']], ['notes', str_repeat('x', 2001)],
            ['notes', ['invalid']], ['type', 'transfer'], ['type', ['expense']],
            ['category_id', 0], ['category_id', ['invalid']],
        ] as [$field, $value]) {
            $this->postJson(self::API, $this->payload($category, [$field => $value]))
                ->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_leap_date_and_maximum_field_lengths_are_accepted(): void
    {
        [, $category] = $this->signedIn();
        $this->postJson(self::API, $this->payload($category, [
            'transaction_date' => '2028-02-29', 'description' => str_repeat('a', 255),
            'notes' => str_repeat('b', 2000),
        ]))->assertCreated()->assertJsonPath('data.transaction_date', '2028-02-29');
    }

    public function test_blank_or_omitted_notes_are_nullable_and_can_be_cleared(): void
    {
        [$user, $category] = $this->signedIn();
        $payload = $this->payload($category);
        unset($payload['notes']);
        $this->postJson(self::API, $payload)->assertCreated()->assertJsonPath('data.notes', null);
        $this->postJson(self::API, $this->payload($category, ['notes' => '   ']))
            ->assertCreated()->assertJsonPath('data.notes', null);
        $row = $this->transaction($user, $category, ['notes' => 'Remover']);
        $this->patchJson(self::API.'/'.$row->id, ['notes' => null])
            ->assertOk()->assertJsonPath('data.notes', null);
    }

    public function test_owner_and_system_fields_cannot_be_forged(): void
    {
        [$user, $category] = $this->signedIn();
        $other = User::factory()->create();
        $row = $this->transaction($user, $category);
        foreach (['user_id' => $other->id, 'id' => 999,
            'created_at' => '2000-01-01', 'updated_at' => '2000-01-01', 'deleted_at' => '2000-01-01'] as $field => $value) {
            $this->postJson(self::API, $this->payload($category, [$field => $value]))
                ->assertUnprocessable()->assertJsonValidationErrors($field);
            $this->patchJson(self::API.'/'.$row->id, [$field => $value])
                ->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->assertDatabaseCount('transactions', 1);
    }

    public function test_new_transactions_reject_foreign_inactive_missing_or_wrong_type_categories(): void
    {
        [$user, $category] = $this->signedIn();
        $foreign = $this->category(User::factory()->create());
        $inactive = $this->category($user, ['is_active' => false]);
        $income = $this->category($user, ['type' => 'income']);
        foreach ([$foreign->id, $inactive->id, $income->id, 999999] as $id) {
            $this->postJson(self::API, $this->payload($category, ['category_id' => $id]))
                ->assertUnprocessable()->assertJsonValidationErrors('category_id');
        }
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_list_is_monthly_scoped_and_uses_transaction_date_not_creation_time(): void
    {
        [$user, $category] = $this->signedIn();
        $first = $this->transaction($user, $category, ['transaction_date' => '2026-10-01', 'created_at' => '2025-01-01 00:00:00']);
        $last = $this->transaction($user, $category, ['transaction_date' => '2026-10-31']);
        $this->transaction($user, $category, ['transaction_date' => '2026-09-30']);
        $this->transaction($user, $category, ['transaction_date' => '2026-11-01']);
        $other = User::factory()->create();
        $this->transaction($other, $this->category($other));
        $this->getJson(self::API.self::MONTH)->assertOk()->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $last->id)->assertJsonPath('data.1.id', $first->id)
            ->assertJsonPath('meta.total', 2);
    }

    public function test_omitting_period_defaults_to_current_month(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-10-19 12:00:00', 'UTC'));
        [$user, $category] = $this->signedIn();
        $this->transaction($user, $category);
        $this->transaction($user, $category, ['transaction_date' => '2026-09-10']);
        $this->getJson(self::API)->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_empty_month_and_december_year_boundary_are_correct(): void
    {
        [$user, $category] = $this->signedIn();
        $this->transaction($user, $category, ['transaction_date' => '2026-12-31']);
        $this->transaction($user, $category, ['transaction_date' => '2027-01-01']);
        $this->getJson(self::API.self::MONTH)->assertOk()->assertJsonPath('data', []);
        $this->getJson(self::API.'?year=2026&month=12')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.transaction_date', '2026-12-31');
        $this->getJson(self::API.'?year=2027&month=1')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.transaction_date', '2027-01-01');
    }

    public function test_default_month_uses_brazilian_calendar_at_utc_month_boundary(): void
    {
        // Em São Paulo ainda é 31/10, embora o relógio UTC já esteja em novembro.
        $this->travelTo(CarbonImmutable::parse('2026-11-01 01:30:00', 'UTC'));
        [$user, $category] = $this->signedIn();
        $this->transaction($user, $category, ['transaction_date' => '2026-10-31']);
        $this->transaction($user, $category, ['transaction_date' => '2026-11-01']);
        $this->getJson(self::API)->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.transaction_date', '2026-10-31');
    }

    public function test_filters_can_be_combined_including_inactive_historical_category(): void
    {
        [$user, $category] = $this->signedIn();
        $income = $this->category($user, ['type' => 'income']);
        $this->transaction($user, $income, ['description' => 'Salário']);
        $match = $this->transaction($user, $category, ['description' => 'Mercado do bairro']);
        $this->transaction($user, $category, ['description' => 'Farmácia']);
        $category->update(['is_active' => false]);
        $this->getJson(self::API.self::MONTH.'&type=expense&category_id='.$category->id.'&search=Mercado')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $match->id)
            ->assertJsonPath('data.0.category.is_active', false);
        $this->getJson(self::API.self::MONTH.'&type=income')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.description', 'Salário');
    }

    public function test_search_treats_sql_wildcards_and_quotes_as_literal_text(): void
    {
        [$user, $category] = $this->signedIn();
        $this->transaction($user, $category, ['description' => 'Desconto 10%_!']);
        $this->transaction($user, $category, ['description' => 'Outra compra']);
        foreach (['%', '_', '!'] as $search) {
            $this->getJson(self::API.self::MONTH.'&search='.rawurlencode($search))
                ->assertOk()->assertJsonCount(1, 'data');
        }
        $this->getJson(self::API.self::MONTH.'&search='.rawurlencode("' OR 1=1 --"))
            ->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_pagination_has_stable_date_and_id_order(): void
    {
        [$user, $category] = $this->signedIn();
        $older = $this->transaction($user, $category);
        $newer = $this->transaction($user, $category);
        $this->getJson(self::API.self::MONTH.'&per_page=1')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $newer->id)
            ->assertJsonPath('meta.total', 2)->assertJsonPath('meta.last_page', 2);
        $this->getJson(self::API.self::MONTH.'&per_page=1&page=2')->assertOk()
            ->assertJsonPath('data.0.id', $older->id);
    }

    public function test_invalid_filters_and_foreign_category_filters_are_rejected(): void
    {
        $this->signedIn();
        $foreign = $this->category(User::factory()->create());
        foreach ([
            'year=2026' => 'month', 'month=10' => 'year',
            'year=1899&month=10' => 'year', 'year=2026&month=13' => 'month',
            'type=transfer' => 'type', 'per_page=101' => 'per_page', 'page=0' => 'page',
            'category_id='.$foreign->id => 'category_id', 'category_id=999999' => 'category_id',
            'search[]=invalid' => 'search',
        ] as $query => $field) {
            $this->getJson(self::API.'?'.$query)->assertUnprocessable()->assertJsonValidationErrors($field);
        }
    }

    public function test_user_can_read_own_transaction_with_category(): void
    {
        [$user, $category] = $this->signedIn();
        $row = $this->transaction($user, $category);
        $this->getJson(self::API.'/'.$row->id)->assertOk()
            ->assertJsonPath('data.id', $row->id)->assertJsonPath('data.category.id', $category->id)
            ->assertJsonPath('data.amount_cents', 23490);
    }

    public function test_user_cannot_read_edit_or_delete_another_users_transaction(): void
    {
        $this->signedIn();
        $other = User::factory()->create();
        $row = $this->transaction($other, $this->category($other));
        $this->getJson(self::API.'/'.$row->id)->assertNotFound();
        $this->patchJson(self::API.'/'.$row->id, ['type' => 'invalid'])->assertNotFound();
        $this->deleteJson(self::API.'/'.$row->id)->assertNotFound();
        $this->assertDatabaseHas('transactions', ['id' => $row->id, 'deleted_at' => null, 'amount_cents' => 23490]);
    }

    public function test_partial_edit_keeps_unsent_fields_and_can_change_month(): void
    {
        [$user, $category] = $this->signedIn();
        $row = $this->transaction($user, $category);
        $this->patchJson(self::API.'/'.$row->id, [
            'amount_cents' => 12345, 'transaction_date' => '2026-11-02',
        ])->assertOk()->assertJsonPath('data.amount_cents', 12345)
            ->assertJsonPath('data.description', 'Supermercado')
            ->assertJsonPath('data.category_id', $category->id);
        $this->getJson(self::API.self::MONTH)->assertJsonCount(0, 'data');
        $this->getJson(self::API.'?year=2026&month=11')->assertJsonCount(1, 'data');
    }

    public function test_type_change_requires_matching_category_and_failed_edit_is_atomic(): void
    {
        [$user, $category] = $this->signedIn();
        $income = $this->category($user, ['type' => 'income']);
        $row = $this->transaction($user, $category);
        $this->patchJson(self::API.'/'.$row->id, ['type' => 'income', 'amount_cents' => 999])
            ->assertUnprocessable()->assertJsonValidationErrors('category_id');
        $this->assertDatabaseHas('transactions', ['id' => $row->id, 'type' => 'expense', 'amount_cents' => 23490]);
        $this->patchJson(self::API.'/'.$row->id, ['type' => 'income', 'category_id' => $income->id])
            ->assertOk()->assertJsonPath('data.type', 'income')->assertJsonPath('data.category_id', $income->id);
    }

    public function test_inactive_original_category_remains_readable_and_editable_but_cannot_be_newly_assigned(): void
    {
        [$user, $category] = $this->signedIn();
        $row = $this->transaction($user, $category);
        $category->update(['is_active' => false]);
        $this->getJson(self::API.'/'.$row->id)->assertOk()->assertJsonPath('data.category.is_active', false);
        $this->patchJson(self::API.'/'.$row->id, ['description' => 'Correção histórica', 'category_id' => $category->id])
            ->assertOk()->assertJsonPath('data.description', 'Correção histórica');
        $otherInactive = $this->category($user, ['is_active' => false]);
        $foreign = $this->category(User::factory()->create());
        foreach ([$otherInactive->id, $foreign->id] as $id) {
            $this->patchJson(self::API.'/'.$row->id, ['category_id' => $id])
                ->assertUnprocessable()->assertJsonValidationErrors('category_id');
        }
    }

    public function test_invalid_edit_does_not_change_the_record(): void
    {
        [$user, $category] = $this->signedIn();
        $row = $this->transaction($user, $category);
        $this->patchJson(self::API.'/'.$row->id, ['amount_cents' => -1, 'description' => 'Não salvar'])
            ->assertUnprocessable()->assertJsonValidationErrors('amount_cents');
        $this->assertDatabaseHas('transactions', ['id' => $row->id, 'amount_cents' => 23490, 'description' => 'Supermercado']);
    }

    public function test_deletion_is_soft_idempotent_and_excluded_from_read_edit_and_sum(): void
    {
        [$user, $category] = $this->signedIn();
        $deleted = $this->transaction($user, $category, ['amount_cents' => 10]);
        $this->transaction($user, $category, ['amount_cents' => 20]);
        $this->assertSame(30, $user->transactions()->sum('amount_cents'));
        $this->deleteJson(self::API.'/'.$deleted->id)->assertNoContent();
        $this->deleteJson(self::API.'/'.$deleted->id)->assertNoContent();
        $this->assertSoftDeleted('transactions', ['id' => $deleted->id]);
        $this->assertDatabaseCount('transactions', 2);
        $this->assertSame(20, $user->transactions()->sum('amount_cents'));
        $this->getJson(self::API.self::MONTH)->assertJsonCount(1, 'data');
        $this->getJson(self::API.'/'.$deleted->id)->assertNotFound();
        $this->patchJson(self::API.'/'.$deleted->id, ['amount_cents' => 30])->assertNotFound();
    }

    public function test_cents_remain_exact_without_floating_point_arithmetic(): void
    {
        [$user, $category] = $this->signedIn();
        foreach ([10, 20, 1, 99999999999] as $amount) {
            $this->postJson(self::API, $this->payload($category, ['amount_cents' => $amount]))->assertCreated();
        }
        $this->assertSame(100000000030, $user->transactions()->sum('amount_cents'));
    }

    public function test_missing_and_malformed_transaction_ids_return_not_found(): void
    {
        $this->signedIn();
        foreach (['999999', 'abc', '-1'] as $id) {
            $this->getJson(self::API.'/'.$id)->assertNotFound();
            $this->patchJson(self::API.'/'.$id, [])->assertNotFound();
            $this->deleteJson(self::API.'/'.$id)->assertNotFound();
        }
    }

    public function test_unbudgeted_expenses_match_summary_and_paginate_with_user_month_and_soft_delete_isolation(): void
    {
        [$user, $covered] = $this->signedIn();
        $free = $this->category($user);
        $removed = $this->category($user, ['is_active' => false]);
        $budget = fn ($category, $month = 10) => $user->monthlyBudgets()->create([
            'category_id' => $category->id, 'year' => 2026, 'month' => $month, 'limit_cents' => 100000,
        ]);
        $budget($covered);
        $budget($free, 9);
        $budget($removed)->delete();
        $this->transaction($user, $covered);
        $this->transaction($user, $free);
        $this->transaction($user, $removed, ['amount_cents' => 9900]);
        for ($i = 0; $i < 27; $i++) $this->transaction($user, $free, ['amount_cents' => 100]);
        $this->transaction($user, $free, ['transaction_date' => '2026-09-25']);
        $this->transaction($user, $free)->delete();
        $this->transaction($user, $this->category($user, ['type' => 'income']));
        $other = User::factory()->create();
        $this->transaction($other, $this->category($other));

        $this->getJson(self::API.self::MONTH.'&unbudgeted=1&type=expense')->assertOk()
            ->assertJsonPath('meta.total', 29)->assertJsonCount(25, 'data')
            ->assertJsonPath('meta.total_amount_cents', 36090);
        $this->getJson(self::API.self::MONTH.'&unbudgeted=1&type=expense&page=2')->assertOk()
            ->assertJsonCount(4, 'data')->assertJsonPath('meta.total_amount_cents', 36090);
        $this->getJson('/api/v1/budgets'.self::MONTH)->assertOk()
            ->assertJsonPath('meta.summary.unbudgeted_expense_cents', 36090);
        $this->getJson(self::API.self::MONTH.'&unbudgeted=1&search=nao-existe')->assertOk()
            ->assertJsonCount(0, 'data')->assertJsonPath('meta.total_amount_cents', 0);
    }

    public function test_unbudgeted_filter_requires_a_valid_boolean(): void
    {
        $this->signedIn();
        $this->getJson(self::API.self::MONTH.'&unbudgeted=invalid')->assertUnprocessable()
            ->assertJsonValidationErrors('unbudgeted');
    }
}
