<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\MonthlyBudget;
use Illuminate\Database\UniqueConstraintViolationException;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BudgetTest extends TestCase
{
    use RefreshDatabase;

    private const API = '/api/v1/budgets';
    private const OCTOBER = '?year=2026&month=10';
    private int $sequence = 0;

    private function signIn(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web')->withHeader('Origin', 'http://localhost:5173');
        return $user;
    }

    private function category(User $user, string $type = 'expense', array $attributes = []): Category
    {
        return $user->categories()->create(array_replace([
            'name' => 'Categoria '.(++$this->sequence), 'type' => $type,
            'icon' => 'cart', 'color' => '#2463EB',
        ], $attributes));
    }

    private function entry(User $user, Category $category, int $cents, string $date = '2026-10-19'): Transaction
    {
        return $user->transactions()->create([
            'category_id' => $category->id, 'type' => $category->type->value,
            'amount_cents' => $cents, 'transaction_date' => $date,
            'description' => 'Lançamento '.(++$this->sequence),
        ]);
    }

    private function budget(User $user, Category $category, int $limit = 10000, int $year = 2026, int $month = 10): MonthlyBudget
    {
        return $user->monthlyBudgets()->create(['category_id' => $category->id, 'year' => $year, 'month' => $month, 'limit_cents' => $limit]);
    }

    private function payload(Category $category, array $attributes = []): array
    {
        return array_replace(['category_id' => $category->id, 'year' => 2026, 'month' => 10, 'limit_cents' => 10000], $attributes);
    }

    public function test_all_budget_endpoints_require_authentication(): void
    {
        $this->getJson(self::API)->assertUnauthorized();
        $this->postJson(self::API, [])->assertUnauthorized();
        $this->getJson(self::API.'/1')->assertUnauthorized();
        $this->patchJson(self::API.'/1', [])->assertUnauthorized();
        $this->deleteJson(self::API.'/1')->assertUnauthorized();
    }

    public function test_empty_month_has_no_budget_and_no_division_by_zero(): void
    {
        $this->signIn();
        $this->getJson(self::API.self::OCTOBER)->assertOk()->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.total', 0)->assertJsonFragment(['year' => 2026, 'month' => 10])
            ->assertJsonPath('meta.summary.budget_count', 0)->assertJsonPath('meta.summary.limit_cents', 0)
            ->assertJsonPath('meta.summary.spent_cents', 0)->assertJsonPath('meta.summary.remaining_cents', 0)
            ->assertJsonPath('meta.summary.used_percent', null)->assertJsonPath('meta.summary.status', 'no_budget')
            ->assertJsonPath('meta.summary.total_expense_cents', 0)->assertJsonPath('meta.summary.unbudgeted_expense_cents', 0);
    }

    public function test_user_can_create_a_monthly_budget_with_integer_cents_and_category(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $response = $this->postJson(self::API, $this->payload($category, ['limit_cents' => 6852884]))->assertCreated()
            ->assertJsonPath('data.limit_cents', 6852884)->assertJsonPath('data.category.id', $category->id)
            ->assertJsonPath('data.year', 2026)->assertJsonPath('data.month', 10)
            ->assertJsonPath('data.spent_cents', 0)->assertJsonPath('data.remaining_cents', 6852884)
            ->assertJsonPath('data.used_percent', 0)->assertJsonPath('data.status', 'within_limit')
            ->assertJsonMissingPath('data.user_id')->assertJsonMissingPath('data.deleted_at');
        $this->assertDatabaseHas('monthly_budgets', ['id' => $response->json('data.id'), 'user_id' => $user->id, 'limit_cents' => 6852884]);
    }

    public function test_required_fields_have_portuguese_validation_messages(): void
    {
        $this->signIn();
        $response = $this->postJson(self::API, [])->assertUnprocessable()->assertJsonValidationErrors(['category_id', 'year', 'month', 'limit_cents']);
        $this->assertStringContainsString('Informe um limite', $response->json('errors.limit_cents.0'));
        $this->assertDatabaseCount('monthly_budgets', 0);
    }

    public function test_limit_must_be_a_positive_json_integer_within_the_existing_money_limit(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        foreach ([0, -1, '10000', 1.5, 1.0, true, false, [], null, 100000000000] as $limit) {
            $this->postJson(self::API, $this->payload($category, ['limit_cents' => $limit]), [], JSON_PRESERVE_ZERO_FRACTION)->assertUnprocessable()->assertJsonValidationErrors('limit_cents');
        }
        $this->assertDatabaseCount('monthly_budgets', 0);
        $this->postJson(self::API, $this->payload($category, ['limit_cents' => 99999999999]))->assertCreated()->assertJsonPath('data.limit_cents', 99999999999);
    }

    public function test_new_budgets_reject_foreign_inactive_income_and_missing_categories(): void
    {
        $user = $this->signIn();
        $other = User::factory()->create();
        $categories = [$this->category($other), $this->category($user, 'income'), $this->category($user, 'expense', ['is_active' => false])];
        foreach ($categories as $category) $this->postJson(self::API, $this->payload($category))->assertUnprocessable()->assertJsonValidationErrors('category_id');
        $this->postJson(self::API, ['category_id' => 999999, 'year' => 2026, 'month' => 10, 'limit_cents' => 100])->assertUnprocessable()->assertJsonValidationErrors('category_id');
        $this->assertDatabaseCount('monthly_budgets', 0);
    }

    public function test_client_cannot_forge_owner_system_or_calculated_fields(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        foreach (['user_id' => 999, 'id' => 999, 'type' => 'income', 'created_at' => '2026-01-01', 'updated_at' => '2026-01-01',
            'deleted_at' => '2026-01-01', 'spent_cents' => 100, 'remaining_cents' => 100, 'used_percent' => 80, 'status' => 'within_limit'] as $field => $value) {
            $this->postJson(self::API, $this->payload($category, [$field => $value]))->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->assertDatabaseCount('monthly_budgets', 0);
    }

    public function test_one_active_budget_per_category_and_month_is_enforced(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $original = $this->budget($user, $category);
        $this->postJson(self::API, $this->payload($category, ['limit_cents' => 20000]))->assertUnprocessable()->assertJsonValidationErrors('category_id');
        $this->assertDatabaseCount('monthly_budgets', 1);
        $this->assertSame(10000, $original->fresh()->limit_cents);
    }

    public function test_database_enforces_unique_budget_without_request_validation(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->budget($user, $category);
        $this->expectException(UniqueConstraintViolationException::class);
        $this->budget($user, $category);
    }

    public function test_same_category_can_have_independent_limits_in_other_months_and_years(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        foreach ([[2026, 10, 100], [2026, 11, 200], [2027, 10, 300]] as [$year, $month, $limit]) {
            $this->postJson(self::API, $this->payload($category, ['year' => $year, 'month' => $month, 'limit_cents' => $limit]))->assertCreated()->assertJsonPath('data.limit_cents', $limit);
        }
        $this->getJson(self::API.self::OCTOBER)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.limit_cents', 100);
    }

    public function test_spending_includes_expenses_registered_before_the_budget_was_created(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->entry($user, $category, 3999);
        $this->postJson(self::API, $this->payload($category))->assertCreated()
            ->assertJsonPath('data.spent_cents', 3999)->assertJsonPath('data.remaining_cents', 6001)
            ->assertJsonPath('data.used_percent', 39.99);
    }

    public function test_spending_uses_category_type_owner_and_calendar_month(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $otherCategory = $this->category($user);
        $income = $this->category($user, 'income');
        $other = User::factory()->create();
        $this->entry($user, $category, 100, '2026-10-01');
        $this->entry($user, $category, 200, '2026-10-31');
        $this->entry($user, $category, 999, '2026-09-30');
        $this->entry($user, $category, 999, '2026-11-01');
        $this->entry($user, $otherCategory, 999);
        $this->entry($user, $income, 999);
        $this->entry($other, $this->category($other), 999);
        $budget = $this->budget($user, $category);
        $this->getJson(self::API.'/'.$budget->id)->assertOk()->assertJsonPath('data.spent_cents', 300)->assertJsonPath('data.remaining_cents', 9700);
    }

    public function test_alert_thresholds_and_over_budget_progress_are_based_on_original_cents(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $budget = $this->budget($user, $category);
        $entry = $this->entry($user, $category, 1);
        foreach ([[7999, 79.99, 'within_limit'], [8000, 80, 'near_limit'], [9999, 99.99, 'near_limit'],
            [10000, 100, 'at_limit'], [10001, 100.01, 'over_limit'], [25000, 250, 'over_limit']] as [$spent, $percent, $status]) {
            $entry->update(['amount_cents' => $spent]);
            $this->getJson(self::API.'/'.$budget->id)->assertOk()->assertJsonPath('data.spent_cents', $spent)
                ->assertJsonPath('data.remaining_cents', 10000 - $spent)->assertJsonPath('data.used_percent', $percent)->assertJsonPath('data.status', $status);
        }
    }

    public function test_one_cent_limit_is_valid_and_never_divides_by_zero(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $budget = $this->budget($user, $category, 1);
        $this->entry($user, $category, 2);
        $this->getJson(self::API.'/'.$budget->id)->assertOk()->assertJsonPath('data.used_percent', 200)
            ->assertJsonPath('data.remaining_cents', -1)->assertJsonPath('data.status', 'over_limit');
    }

    public function test_list_and_summary_isolate_users_even_if_another_owner_is_supplied(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $mine = $this->budget($user, $category);
        $this->entry($user, $category, 100);
        $other = User::factory()->create();
        $foreignCategory = $this->category($other);
        $this->budget($other, $foreignCategory, 999999);
        $this->entry($other, $foreignCategory, 999999);
        $this->getJson(self::API.self::OCTOBER.'&user_id='.$other->id)->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id)->assertJsonPath('meta.summary.limit_cents', 10000)
            ->assertJsonPath('meta.summary.spent_cents', 100)->assertJsonPath('meta.summary.total_expense_cents', 100);
    }

    public function test_summary_separates_budgeted_spending_from_unbudgeted_expenses(): void
    {
        $user = $this->signIn();
        $a = $this->category($user); $b = $this->category($user); $unbudgeted = $this->category($user);
        $this->budget($user, $a, 10000); $this->budget($user, $b, 20000);
        $this->entry($user, $a, 3000); $this->entry($user, $b, 9000); $this->entry($user, $unbudgeted, 7000);
        $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonPath('meta.summary.budget_count', 2)->assertJsonPath('meta.summary.limit_cents', 30000)
            ->assertJsonPath('meta.summary.spent_cents', 12000)->assertJsonPath('meta.summary.remaining_cents', 18000)
            ->assertJsonPath('meta.summary.used_percent', 40)->assertJsonPath('meta.summary.total_expense_cents', 19000)
            ->assertJsonPath('meta.summary.unbudgeted_expense_cents', 7000);
    }

    public function test_month_without_budgets_still_reports_unbudgeted_expenses(): void
    {
        $user = $this->signIn();
        $this->entry($user, $this->category($user), 3999);
        $this->getJson(self::API.self::OCTOBER)->assertOk()->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.summary.spent_cents', 0)->assertJsonPath('meta.summary.total_expense_cents', 3999)
            ->assertJsonPath('meta.summary.unbudgeted_expense_cents', 3999)->assertJsonPath('meta.summary.used_percent', null);
    }

    public function test_budget_can_update_only_its_limit_and_recalculates_progress(): void
    {
        $user = $this->signIn(); $category = $this->category($user);
        $budget = $this->budget($user, $category); $this->entry($user, $category, 8000);
        $this->patchJson(self::API.'/'.$budget->id, ['limit_cents' => 20000])->assertOk()
            ->assertJsonPath('data.limit_cents', 20000)->assertJsonPath('data.spent_cents', 8000)
            ->assertJsonPath('data.used_percent', 40)->assertJsonPath('data.status', 'within_limit');
        $this->patchJson(self::API.'/'.$budget->id, ['limit_cents' => 5000])->assertOk()
            ->assertJsonPath('data.remaining_cents', -3000)->assertJsonPath('data.status', 'over_limit');
    }

    public function test_invalid_edit_does_not_change_limit_or_budget_identity(): void
    {
        $user = $this->signIn(); $category = $this->category($user); $budget = $this->budget($user, $category);
        foreach ([['limit_cents' => 0], ['limit_cents' => '100'], [], ['limit_cents' => 20000, 'year' => 2027],
            ['limit_cents' => 20000, 'month' => 11], ['limit_cents' => 20000, 'category_id' => $category->id],
            ['limit_cents' => 20000, 'user_id' => 999], ['limit_cents' => 20000, 'spent_cents' => 999]] as $data) {
            $this->patchJson(self::API.'/'.$budget->id, $data)->assertUnprocessable();
            $this->assertSame(10000, $budget->fresh()->limit_cents);
        }
        $this->assertSame(2026, $budget->fresh()->year);
    }

    public function test_inactive_original_category_remains_visible_and_limit_can_be_edited(): void
    {
        $user = $this->signIn(); $category = $this->category($user); $budget = $this->budget($user, $category);
        $this->entry($user, $category, 3999); $category->update(['is_active' => false, 'name' => 'Mercado antigo']);
        $this->getJson(self::API.self::OCTOBER)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.category.is_active', false);
        $this->patchJson(self::API.'/'.$budget->id, ['limit_cents' => 5000])->assertOk()
            ->assertJsonPath('data.spent_cents', 3999)->assertJsonPath('data.category.name', 'Mercado antigo');
    }

    public function test_foreign_budget_read_edit_and_delete_are_not_found_before_validation(): void
    {
        $user = $this->signIn(); $other = User::factory()->create(); $budget = $this->budget($other, $this->category($other));
        $this->getJson(self::API.'/'.$budget->id)->assertNotFound();
        $this->patchJson(self::API.'/'.$budget->id, ['limit_cents' => 0])->assertNotFound();
        $this->deleteJson(self::API.'/'.$budget->id)->assertNotFound();
        $this->assertSame(10000, $budget->fresh()->limit_cents);
        $this->assertFalse($budget->fresh()->trashed());
    }

    public function test_missing_and_malformed_ids_return_not_found(): void
    {
        $this->signIn();
        foreach (['999999', '0', '-1', 'abc', '1.5'] as $id) {
            $this->getJson(self::API.'/'.$id)->assertNotFound();
            $this->patchJson(self::API.'/'.$id, ['limit_cents' => 100])->assertNotFound();
            $this->deleteJson(self::API.'/'.$id)->assertNotFound();
        }
    }

    public function test_delete_is_soft_idempotent_and_does_not_delete_expenses(): void
    {
        $user = $this->signIn(); $category = $this->category($user); $budget = $this->budget($user, $category);
        $entry = $this->entry($user, $category, 3999);
        $this->deleteJson(self::API.'/'.$budget->id)->assertNoContent();
        $this->deleteJson(self::API.'/'.$budget->id)->assertNoContent();
        $this->assertSoftDeleted('monthly_budgets', ['id' => $budget->id]);
        $this->getJson(self::API.'/'.$budget->id)->assertNotFound();
        $this->patchJson(self::API.'/'.$budget->id, ['limit_cents' => 100])->assertNotFound();
        $this->getJson(self::API.self::OCTOBER)->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.summary.unbudgeted_expense_cents', 3999);
        $this->assertDatabaseHas('transactions', ['id' => $entry->id, 'deleted_at' => null, 'amount_cents' => 3999]);
        $this->getJson('/api/v1/dashboard'.self::OCTOBER)->assertOk()->assertJsonPath('data.totals.expense_cents', 3999);
    }

    public function test_recreating_a_removed_budget_restores_its_id_with_the_new_limit(): void
    {
        $user = $this->signIn(); $category = $this->category($user); $budget = $this->budget($user, $category);
        $this->entry($user, $category, 3999); $budget->delete();
        $this->postJson(self::API, $this->payload($category, ['limit_cents' => 20000]))->assertCreated()
            ->assertJsonPath('data.id', $budget->id)->assertJsonPath('data.limit_cents', 20000)->assertJsonPath('data.spent_cents', 3999);
        $this->assertDatabaseCount('monthly_budgets', 1);
        $this->assertFalse($budget->fresh()->trashed());
    }

    public function test_recreation_requires_an_active_category_even_when_old_budget_exists(): void
    {
        $user = $this->signIn(); $category = $this->category($user); $budget = $this->budget($user, $category);
        $budget->delete(); $category->update(['is_active' => false]);
        $this->postJson(self::API, $this->payload($category))->assertUnprocessable()->assertJsonValidationErrors('category_id');
        $this->assertSoftDeleted('monthly_budgets', ['id' => $budget->id]);
    }

    public function test_pagination_is_stable_and_summary_covers_all_pages(): void
    {
        $user = $this->signIn(); $ids = [];
        for ($i = 0; $i < 27; $i++) {
            $category = $this->category($user); $ids[] = $this->budget($user, $category, 100)->id; $this->entry($user, $category, 1);
        }
        $this->getJson(self::API.self::OCTOBER)->assertOk()->assertJsonCount(25, 'data')
            ->assertJsonPath('data.0.id', $ids[0])->assertJsonPath('meta.total', 27)
            ->assertJsonPath('meta.summary.limit_cents', 2700)->assertJsonPath('meta.summary.spent_cents', 27);
        $this->getJson(self::API.self::OCTOBER.'&page=2')->assertOk()->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $ids[25])->assertJsonPath('meta.summary.budget_count', 27)
            ->assertJsonPath('meta.summary.limit_cents', 2700)->assertJsonPath('meta.summary.spent_cents', 27);
    }

    public function test_invalid_periods_pagination_and_creation_dates_are_rejected(): void
    {
        $user = $this->signIn(); $category = $this->category($user);
        foreach (['year=2026', 'month=10', 'year=2026&month=13', 'year=1899&month=10', 'year=2101&month=1',
            'year[]=2026&month=10', 'year=2026&month=1.5', 'page=0', 'per_page=101', 'per_page[]=25'] as $query) {
            $this->getJson(self::API.'?'.$query)->assertUnprocessable();
        }
        foreach ([['year' => 1899], ['month' => 0], ['month' => 13], ['year' => []], ['year' => 2101]] as $data) {
            $this->postJson(self::API, $this->payload($category, $data))->assertUnprocessable();
        }
        $this->assertDatabaseCount('monthly_budgets', 0);
    }

    public function test_default_period_uses_brazilian_month_at_utc_boundary(): void
    {
        $this->signIn(); CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-11-01 01:00:00', 'UTC'));
        try {
            $this->getJson(self::API)->assertOk()->assertJsonPath('meta.period.year', 2026)->assertJsonPath('meta.period.month', 10);
        } finally { CarbonImmutable::setTestNow(); }
    }

    public function test_leap_february_and_year_boundaries_use_transaction_date(): void
    {
        $user = $this->signIn(); $category = $this->category($user);
        $budget = $this->budget($user, $category, 10000, 2024, 2);
        $first = $this->entry($user, $category, 100, '2024-02-01'); $first->forceFill(['created_at' => '2026-10-01'])->save();
        $this->entry($user, $category, 200, '2024-02-29'); $this->entry($user, $category, 999, '2024-01-31'); $this->entry($user, $category, 999, '2024-03-01');
        $this->getJson(self::API.'/'.$budget->id)->assertOk()->assertJsonPath('data.spent_cents', 300);
        foreach ([[1900, 1], [2100, 12]] as [$year, $month]) {
            $this->postJson(self::API, $this->payload($category, ['year' => $year, 'month' => $month]))->assertCreated();
        }
    }

    public function test_deleted_expenses_are_ignored_and_deleted_budgets_do_not_affect_other_limits(): void
    {
        $user = $this->signIn(); $a = $this->category($user); $b = $this->category($user);
        $this->budget($user, $a); $removed = $this->budget($user, $b); $removed->delete();
        $this->entry($user, $a, 999)->delete(); $this->entry($user, $a, 100); $this->entry($user, $b, 200);
        $this->getJson(self::API.self::OCTOBER)->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.spent_cents', 100)->assertJsonPath('meta.summary.limit_cents', 10000)
            ->assertJsonPath('meta.summary.spent_cents', 100)->assertJsonPath('meta.summary.total_expense_cents', 300)
            ->assertJsonPath('meta.summary.unbudgeted_expense_cents', 200);
    }

    public function test_expense_edits_moves_and_deletion_update_the_budget_without_cache(): void
    {
        $user = $this->signIn(); $category = $this->category($user); $budget = $this->budget($user, $category);
        $entry = $this->entry($user, $category, 100); $entry->update(['amount_cents' => 200]);
        $this->getJson(self::API.'/'.$budget->id)->assertOk()->assertJsonPath('data.spent_cents', 200);
        $entry->update(['transaction_date' => '2026-11-01']);
        $this->getJson(self::API.'/'.$budget->id)->assertOk()->assertJsonPath('data.spent_cents', 0);
        $entry->update(['transaction_date' => '2026-10-01']); $entry->delete();
        $this->getJson(self::API.'/'.$budget->id)->assertOk()->assertJsonPath('data.spent_cents', 0);
    }

    public function test_aggregated_expenses_can_exceed_one_transaction_limit_without_losing_cents(): void
    {
        $user = $this->signIn(); $category = $this->category($user); $budget = $this->budget($user, $category, 99999999999);
        $this->entry($user, $category, 99999999999); $this->entry($user, $category, 99999999999); $this->entry($user, $category, 1);
        $this->getJson(self::API.'/'.$budget->id)->assertOk()->assertJsonPath('data.spent_cents', 199999999999)
            ->assertJsonPath('data.remaining_cents', -100000000000)->assertJsonPath('data.status', 'over_limit');
        $this->getJson(self::API.self::OCTOBER)->assertOk()->assertJsonPath('meta.summary.spent_cents', 199999999999);
    }

    public function test_queries_are_bounded_without_one_spending_query_per_budget(): void
    {
        $user = $this->signIn();
        for ($i = 0; $i < 15; $i++) { $category = $this->category($user); $this->budget($user, $category); $this->entry($user, $category, 100); }
        DB::enableQueryLog(); DB::flushQueryLog();
        try {
            $this->getJson(self::API.self::OCTOBER)->assertOk();
            $selects = collect(DB::getQueryLog())->filter(fn ($query) => str_starts_with(strtolower($query['query']), 'select'));
            // Includes the fixed cost of loading the persisted cycle calendar.
            $this->assertLessThanOrEqual(9, $selects->count());
        } finally { DB::disableQueryLog(); }
    }

    public function test_expense_creation_never_requires_a_budget(): void
    {
        $user = $this->signIn(); $category = $this->category($user);
        $this->postJson('/api/v1/transactions', ['category_id' => $category->id, 'type' => 'expense', 'amount_cents' => 3999,
            'description' => 'Sem orçamento prévio', 'transaction_date' => '2026-10-19'])->assertCreated();
        $this->assertDatabaseCount('monthly_budgets', 0);
        $this->getJson(self::API.self::OCTOBER)->assertOk()->assertJsonPath('meta.summary.unbudgeted_expense_cents', 3999);
    }

    public function test_model_relationships_keep_budget_ownership_and_category(): void
    {
        $user = $this->signIn(); $category = $this->category($user); $budget = $this->budget($user, $category);
        $this->assertSame($user->id, $budget->user->id); $this->assertSame($category->id, $budget->category->id);
        $this->assertSame($budget->id, $category->monthlyBudgets()->first()->id);
        $this->assertSame($budget->id, $user->monthlyBudgets()->first()->id);
    }

    public function test_notes_can_be_created_edited_cleared_and_copied(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $response = $this->postJson(self::API, $this->payload($category, ['notes' => "Reserva para mercado\nInclui limpeza"]))->assertCreated();
        $id = $response->json('data.id');
        $response->assertJsonPath('data.notes', "Reserva para mercado\nInclui limpeza");
        $this->patchJson(self::API.'/'.$id, ['limit_cents' => 20000, 'notes' => 'Revisado'])->assertOk()->assertJsonPath('data.notes', 'Revisado');
        $this->patchJson(self::API.'/'.$id, ['limit_cents' => 25000])->assertOk()->assertJsonPath('data.notes', 'Revisado');
        $this->postJson(self::API.'/copy', ['source_year' => 2026, 'source_month' => 10, 'year' => 2026, 'month' => 11])->assertCreated();
        $this->assertDatabaseHas('monthly_budgets', ['user_id' => $user->id, 'month' => 11, 'notes' => 'Revisado']);
        $this->patchJson(self::API.'/'.$id, ['limit_cents' => 25000, 'notes' => null])->assertOk()->assertJsonPath('data.notes', null);
    }

    public function test_notes_reject_invalid_type_and_excess_length(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        foreach ([['invalid'], str_repeat('a', 2001)] as $notes) {
            $this->postJson(self::API, $this->payload($category, ['notes' => $notes]))->assertUnprocessable()->assertJsonValidationErrors('notes');
        }
    }
}
