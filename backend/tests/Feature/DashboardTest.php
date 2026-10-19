<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private const API = '/api/v1/dashboard';
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

    public function test_dashboard_requires_authentication(): void
    {
        $this->getJson(self::API)->assertUnauthorized();
    }

    public function test_empty_account_has_zero_totals_and_six_calendar_months(): void
    {
        $this->signIn();
        $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonPath('data.period', ['year' => 2026, 'month' => 10, 'start_date' => '2026-10-01', 'end_date' => '2026-10-31'])
            ->assertJsonPath('data.totals', ['income_cents' => 0, 'expense_cents' => 0, 'result_cents' => 0, 'income_count' => 0, 'expense_count' => 0])
            ->assertJsonCount(6, 'data.last_six_months')
            ->assertJsonPath('data.last_six_months.0.month', 5)
            ->assertJsonPath('data.last_six_months.5.month', 10)
            ->assertJsonPath('data.previous_month.month', 9)
            ->assertJsonPath('data.by_category', [])
            ->assertJsonPath('data.latest_transactions', []);
    }

    public function test_totals_and_counts_use_exact_integer_cents(): void
    {
        $user = $this->signIn();
        $income = $this->category($user, 'income');
        $expense = $this->category($user);
        $this->entry($user, $income, 500000);
        $this->entry($user, $income, 3999);
        $this->entry($user, $expense, 6584);
        $this->entry($user, $expense, 658);
        $response = $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonPath('data.totals.income_cents', 503999)
            ->assertJsonPath('data.totals.expense_cents', 7242)
            ->assertJsonPath('data.totals.result_cents', 496757)
            ->assertJsonPath('data.totals.income_count', 2)
            ->assertJsonPath('data.totals.expense_count', 2);
        foreach ($response->json('data.totals') as $value) $this->assertIsInt($value);
    }

    public function test_negative_result_is_not_clamped_or_carried_over(): void
    {
        $user = $this->signIn();
        $income = $this->category($user, 'income');
        $expense = $this->category($user);
        $this->entry($user, $income, 100000, '2026-09-01');
        $this->entry($user, $expense, 3999);
        $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonPath('data.totals.result_cents', -3999)
            ->assertJsonPath('data.previous_month.result_cents', 100000);
    }

    public function test_all_widgets_are_scoped_to_the_authenticated_user(): void
    {
        $user = $this->signIn();
        $mine = $this->category($user);
        $own = $this->entry($user, $mine, 100);
        $other = User::factory()->create();
        $foreign = $this->category($other);
        $this->entry($other, $foreign, 999999);
        $this->entry($other, $foreign, 888888, '2026-09-01');
        $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonPath('data.totals.expense_cents', 100)
            ->assertJsonPath('data.previous_month.expense_cents', 0)
            ->assertJsonCount(1, 'data.by_category')
            ->assertJsonPath('data.by_category.0.category.id', $mine->id)
            ->assertJsonCount(1, 'data.latest_transactions')
            ->assertJsonPath('data.latest_transactions.0.id', $own->id)
            ->assertJsonPath('data.last_six_months.5.expense_cents', 100)
            ->assertJsonMissing(['name' => $foreign->name]);
    }

    public function test_soft_deleted_transactions_are_excluded_from_every_widget(): void
    {
        $user = $this->signIn();
        $expense = $this->category($user);
        $this->entry($user, $expense, 3999)->delete();
        $this->entry($user, $expense, 1000, '2026-09-01')->delete();
        $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonPath('data.totals.expense_cents', 0)
            ->assertJsonPath('data.previous_month.expense_cents', 0)
            ->assertJsonPath('data.last_six_months.5.expense_cents', 0)
            ->assertJsonPath('data.by_category', [])
            ->assertJsonPath('data.latest_transactions', []);
    }

    public function test_period_uses_transaction_date_and_both_month_boundaries(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->entry($user, $category, 100, '2026-09-30');
        $first = $this->entry($user, $category, 200, '2026-10-01');
        $last = $this->entry($user, $category, 300, '2026-10-31');
        $this->entry($user, $category, 400, '2026-11-01');
        $first->forceFill(['created_at' => '2025-01-01'])->save();
        $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonPath('data.totals.expense_cents', 500)
            ->assertJsonPath('data.totals.expense_count', 2)
            ->assertJsonPath('data.previous_month.expense_cents', 100)
            ->assertJsonPath('data.latest_transactions.0.id', $last->id)
            ->assertJsonPath('data.latest_transactions.1.id', $first->id);
    }

    public function test_category_chart_contains_only_expenses_sorted_by_total_with_stable_ties(): void
    {
        $user = $this->signIn();
        $a = $this->category($user);
        $b = $this->category($user);
        $c = $this->category($user);
        $income = $this->category($user, 'income');
        $this->entry($user, $a, 100);
        $this->entry($user, $a, 200);
        $this->entry($user, $b, 500);
        $this->entry($user, $c, 500);
        $this->entry($user, $income, 9000);
        $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonCount(3, 'data.by_category')
            ->assertJsonPath('data.by_category.0.category.id', $b->id)
            ->assertJsonPath('data.by_category.1.category.id', $c->id)
            ->assertJsonPath('data.by_category.2.category.id', $a->id)
            ->assertJsonPath('data.by_category.2.amount_cents', 300)
            ->assertJsonPath('data.by_category.2.transaction_count', 2);
    }

    public function test_inactive_categories_keep_their_historical_values_and_identity(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->entry($user, $category, 685288);
        $category->update(['name' => 'Mercado', 'color' => '#FF503F', 'is_active' => false]);
        $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonPath('data.totals.expense_cents', 685288)
            ->assertJsonPath('data.by_category.0.category.name', 'Mercado')
            ->assertJsonPath('data.by_category.0.category.color', '#FF503F')
            ->assertJsonPath('data.by_category.0.category.is_active', false)
            ->assertJsonPath('data.latest_transactions.0.category.id', $category->id);
    }

    public function test_latest_transactions_are_limited_to_four_and_sorted_by_date_then_id(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $ids = [];
        for ($i = 0; $i < 6; $i++) $ids[] = $this->entry($user, $category, 100)->id;
        $newestDate = $this->entry($user, $category, 100, '2026-10-31');
        $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonCount(4, 'data.latest_transactions')
            ->assertJsonPath('data.latest_transactions.0.id', $newestDate->id)
            ->assertJsonPath('data.latest_transactions.1.id', $ids[5])
            ->assertJsonPath('data.latest_transactions.3.id', $ids[3])
            ->assertJsonMissingPath('data.latest_transactions.0.user_id')
            ->assertJsonMissingPath('data.latest_transactions.0.category.user_id');
    }

    public function test_six_month_series_crosses_year_and_fills_empty_months(): void
    {
        $user = $this->signIn();
        $income = $this->category($user, 'income');
        $expense = $this->category($user);
        $this->entry($user, $income, 999, '2025-08-31'); // fora da janela
        $this->entry($user, $income, 1000, '2025-09-01');
        $this->entry($user, $expense, 2000, '2025-12-31');
        $this->entry($user, $income, 3000, '2026-02-28');
        $this->getJson(self::API.'?year=2026&month=2')->assertOk()
            ->assertJsonPath('data.period.end_date', '2026-02-28')
            ->assertJsonCount(6, 'data.last_six_months')
            ->assertJsonPath('data.last_six_months.0.year', 2025)
            ->assertJsonPath('data.last_six_months.0.month', 9)
            ->assertJsonPath('data.last_six_months.0.income_cents', 1000)
            ->assertJsonPath('data.last_six_months.1.result_cents', 0)
            ->assertJsonPath('data.last_six_months.3.result_cents', -2000)
            ->assertJsonPath('data.last_six_months.5.income_cents', 3000)
            ->assertJsonPath('data.totals.income_cents', 3000);
    }

    public function test_previous_month_can_have_zero_or_negative_result(): void
    {
        $user = $this->signIn();
        $expense = $this->category($user);
        $this->entry($user, $expense, 100, '2026-09-15');
        $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonPath('data.previous_month.result_cents', -100)
            ->assertJsonPath('data.totals.result_cents', 0);
    }

    public function test_default_month_follows_brazilian_calendar_at_utc_boundary(): void
    {
        $this->signIn();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-11-01 01:00:00', 'UTC'));
        try {
            $this->getJson(self::API)->assertOk()
                ->assertJsonPath('data.period.year', 2026)
                ->assertJsonPath('data.period.month', 10);
        } finally {
            CarbonImmutable::setTestNow();
        }
    }

    public function test_invalid_or_partial_periods_have_portuguese_validation_errors(): void
    {
        $this->signIn();
        foreach (['year=2026', 'month=10', 'year=1899&month=1', 'year=2101&month=1',
            'year=2026&month=0', 'year=2026&month=13', 'year=2026&month=1.5',
            'year[]=2026&month=10', 'year=texto&month=10', 'year=&month=10'] as $query) {
            $response = $this->getJson(self::API.'?'.$query)->assertUnprocessable();
            $this->assertStringContainsString('Informe', $response->json('message'));
        }
    }

    public function test_boundary_years_and_leap_february_are_valid(): void
    {
        $this->signIn();
        foreach ([['year=1900&month=1', '1900-01-31'], ['year=2100&month=12', '2100-12-31'], ['year=2024&month=2', '2024-02-29']] as [$query, $end]) {
            $this->getJson(self::API.'?'.$query)->assertOk()
                ->assertJsonPath('data.period.end_date', $end)
                ->assertJsonCount(6, 'data.last_six_months');
        }
    }

    public function test_totals_are_not_limited_to_a_transaction_list_page(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        for ($i = 0; $i < 110; $i++) $this->entry($user, $category, 1);
        $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonPath('data.totals.expense_cents', 110)
            ->assertJsonPath('data.totals.expense_count', 110)
            ->assertJsonPath('data.by_category.0.amount_cents', 110)
            ->assertJsonPath('data.by_category.0.transaction_count', 110)
            ->assertJsonCount(4, 'data.latest_transactions');
    }

    public function test_aggregate_can_exceed_the_single_transaction_limit_without_rounding(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->entry($user, $category, 99999999999);
        $this->entry($user, $category, 99999999999);
        $this->entry($user, $category, 1);
        $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonPath('data.totals.expense_cents', 199999999999)
            ->assertJsonPath('data.totals.result_cents', -199999999999)
            ->assertJsonPath('data.by_category.0.amount_cents', 199999999999);
    }

    public function test_summary_reflects_edits_month_changes_and_deletions_without_cache(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $transaction = $this->entry($user, $category, 100);
        $transaction->update(['amount_cents' => 200]);
        $this->getJson(self::API.self::OCTOBER)->assertOk()->assertJsonPath('data.totals.expense_cents', 200);
        $transaction->update(['transaction_date' => '2026-09-30']);
        $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonPath('data.totals.expense_cents', 0)
            ->assertJsonPath('data.previous_month.expense_cents', 200);
        $transaction->delete();
        $this->getJson(self::API.self::OCTOBER)->assertOk()->assertJsonPath('data.previous_month.expense_cents', 0);
    }

    public function test_data_queries_are_bounded_without_one_query_per_category(): void
    {
        $user = $this->signIn();
        for ($i = 0; $i < 12; $i++) $this->entry($user, $this->category($user), 100);
        DB::enableQueryLog();
        DB::flushQueryLog();
        try {
            $this->getJson(self::API.self::OCTOBER)->assertOk();
            $queries = collect(DB::getQueryLog())->filter(fn ($query) => str_starts_with(strtolower($query['query']), 'select'));
            $this->assertLessThanOrEqual(6, $queries->count());
        } finally {
            DB::disableQueryLog();
        }
    }
}
