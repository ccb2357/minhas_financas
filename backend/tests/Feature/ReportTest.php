<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    private const API = '/api/v1/reports';
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

    public function test_reports_require_authentication(): void
    {
        $this->getJson(self::API)->assertUnauthorized();
    }

    public function test_empty_report_has_zero_totals_and_explicit_comparison_period(): void
    {
        $this->signIn();
        $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonPath('data.period', ['range' => 'month', 'year' => 2026, 'month' => 10, 'start_date' => '2026-10-01', 'end_date' => '2026-10-31', 'month_count' => 1])
            ->assertJsonPath('data.totals', ['income_cents' => 0, 'expense_cents' => 0, 'result_cents' => 0, 'income_count' => 0, 'expense_count' => 0])
            ->assertJsonPath('data.by_category', [])
            ->assertJsonCount(1, 'data.monthly_series')
            ->assertJsonCount(6, 'data.comparison_series')
            ->assertJsonPath('data.comparison_period.start_date', '2026-05-01')
            ->assertJsonPath('data.comparison_period.end_date', '2026-10-31');
    }

    public function test_month_totals_and_categories_do_not_include_the_comparison_months(): void
    {
        $user = $this->signIn();
        $income = $this->category($user, 'income');
        $expense = $this->category($user);
        $this->entry($user, $income, 500000, '2026-09-30');
        $this->entry($user, $expense, 3999, '2026-09-01');
        $this->entry($user, $income, 6852884);
        $this->entry($user, $expense, 6584);
        $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonPath('data.totals.income_cents', 6852884)
            ->assertJsonPath('data.totals.expense_cents', 6584)
            ->assertJsonPath('data.totals.result_cents', 6846300)
            ->assertJsonPath('data.totals.income_count', 1)
            ->assertJsonPath('data.totals.expense_count', 1)
            ->assertJsonPath('data.by_category.0.amount_cents', 6584)
            ->assertJsonPath('data.comparison_series.4.income_cents', 500000)
            ->assertJsonPath('data.comparison_series.5.income_cents', 6852884);
    }

    public function test_three_months_includes_selected_month_and_previous_two(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->entry($user, $category, 999, '2026-07-31');
        $this->entry($user, $category, 100, '2026-08-01');
        $this->entry($user, $category, 200, '2026-09-15');
        $this->entry($user, $category, 300, '2026-10-31');
        $this->entry($user, $category, 999, '2026-11-01');
        $response = $this->getJson(self::API.self::OCTOBER.'&range=three_months')->assertOk()
            ->assertJsonPath('data.period.start_date', '2026-08-01')
            ->assertJsonPath('data.period.end_date', '2026-10-31')
            ->assertJsonPath('data.period.month_count', 3)
            ->assertJsonPath('data.totals.expense_cents', 600)
            ->assertJsonPath('data.totals.expense_count', 3)
            ->assertJsonCount(3, 'data.monthly_series')
            ->assertJsonPath('data.monthly_series.0.month', 8)
            ->assertJsonPath('data.monthly_series.2.month', 10);
        $this->assertSame($response->json('data.monthly_series'), $response->json('data.comparison_series'));
    }

    public function test_three_months_crosses_december_and_january(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->entry($user, $category, 100, '2025-11-01');
        $this->entry($user, $category, 200, '2025-12-31');
        $this->entry($user, $category, 300, '2026-01-31');
        $this->getJson(self::API.'?year=2026&month=1&range=three_months')->assertOk()
            ->assertJsonPath('data.period.start_date', '2025-11-01')
            ->assertJsonPath('data.totals.expense_cents', 600)
            ->assertJsonPath('data.monthly_series.0.year', 2025)
            ->assertJsonPath('data.monthly_series.2.year', 2026);
    }

    public function test_year_means_january_through_selected_month_without_future_months(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->entry($user, $category, 999, '2025-12-31');
        $this->entry($user, $category, 100, '2026-01-01');
        $this->entry($user, $category, 200, '2026-10-31');
        $this->entry($user, $category, 999, '2026-11-01');
        $this->getJson(self::API.self::OCTOBER.'&range=year')->assertOk()
            ->assertJsonPath('data.period.start_date', '2026-01-01')
            ->assertJsonPath('data.period.end_date', '2026-10-31')
            ->assertJsonPath('data.period.month_count', 10)
            ->assertJsonPath('data.totals.expense_cents', 300)
            ->assertJsonPath('data.totals.expense_count', 2)
            ->assertJsonCount(10, 'data.monthly_series')
            ->assertJsonCount(10, 'data.comparison_series');
    }

    public function test_year_january_and_december_have_one_and_twelve_months(): void
    {
        $this->signIn();
        foreach ([1, 12] as $month) {
            $this->getJson(self::API.'?year=2026&month='.$month.'&range=year')->assertOk()
                ->assertJsonPath('data.period.month_count', $month)
                ->assertJsonCount($month, 'data.monthly_series');
        }
    }

    public function test_series_fills_empty_months_and_preserves_negative_results(): void
    {
        $user = $this->signIn();
        $expense = $this->category($user);
        $income = $this->category($user, 'income');
        $this->entry($user, $expense, 3999, '2026-08-15');
        $this->entry($user, $income, 1000, '2026-10-10');
        $this->getJson(self::API.self::OCTOBER.'&range=three_months')->assertOk()
            ->assertJsonPath('data.monthly_series.0.result_cents', -3999)
            ->assertJsonPath('data.monthly_series.1.result_cents', 0)
            ->assertJsonPath('data.monthly_series.2.result_cents', 1000)
            ->assertJsonPath('data.totals.result_cents', -2999);
    }

    public function test_all_ranges_isolate_users_even_when_another_user_id_is_supplied(): void
    {
        $user = $this->signIn();
        $mine = $this->category($user);
        $this->entry($user, $mine, 100);
        $other = User::factory()->create();
        $foreign = $this->category($other);
        $this->entry($other, $foreign, 999999);
        $this->entry($other, $foreign, 888888, '2026-09-01');
        foreach (['month', 'three_months', 'year'] as $range) {
            $this->getJson(self::API.self::OCTOBER.'&range='.$range.'&user_id='.$other->id)->assertOk()
                ->assertJsonPath('data.totals.expense_cents', 100)
                ->assertJsonCount(1, 'data.by_category')
                ->assertJsonPath('data.by_category.0.category.id', $mine->id)
                ->assertJsonMissing(['name' => $foreign->name]);
        }
    }

    public function test_soft_deleted_transactions_do_not_contribute_to_any_range(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        foreach (['2026-01-01', '2026-09-01', '2026-10-01'] as $date) {
            $this->entry($user, $category, 999, $date)->delete();
        }
        foreach (['month', 'three_months', 'year'] as $range) {
            $response = $this->getJson(self::API.self::OCTOBER.'&range='.$range)->assertOk()
                ->assertJsonPath('data.totals.expense_cents', 0)
                ->assertJsonPath('data.by_category', []);
            foreach ($response->json('data.comparison_series') as $month) $this->assertSame(0, $month['expense_cents']);
        }
    }

    public function test_category_chart_aggregates_expenses_and_has_stable_order(): void
    {
        $user = $this->signIn();
        $a = $this->category($user);
        $b = $this->category($user);
        $c = $this->category($user);
        $income = $this->category($user, 'income');
        $this->entry($user, $a, 100, '2026-09-01');
        $this->entry($user, $a, 200);
        $this->entry($user, $b, 500);
        $this->entry($user, $c, 500);
        $this->entry($user, $income, 99999);
        $this->getJson(self::API.self::OCTOBER.'&range=three_months')->assertOk()
            ->assertJsonCount(3, 'data.by_category')
            ->assertJsonPath('data.by_category.0.category.id', $b->id)
            ->assertJsonPath('data.by_category.1.category.id', $c->id)
            ->assertJsonPath('data.by_category.2.category.id', $a->id)
            ->assertJsonPath('data.by_category.2.amount_cents', 300)
            ->assertJsonPath('data.by_category.2.transaction_count', 2);
    }

    public function test_inactive_category_keeps_historical_values_and_current_identity(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->entry($user, $category, 685288, '2026-09-01');
        $category->update(['name' => 'Mercado', 'color' => '#FF503F', 'is_active' => false]);
        $this->getJson(self::API.self::OCTOBER.'&range=year')->assertOk()
            ->assertJsonPath('data.by_category.0.category.name', 'Mercado')
            ->assertJsonPath('data.by_category.0.category.color', '#FF503F')
            ->assertJsonPath('data.by_category.0.category.is_active', false)
            ->assertJsonPath('data.by_category.0.amount_cents', 685288)
            ->assertJsonMissingPath('data.by_category.0.category.user_id');
    }

    public function test_date_boundaries_use_transaction_date_instead_of_creation_date(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $first = $this->entry($user, $category, 100, '2024-02-01');
        $first->forceFill(['created_at' => '2026-10-01'])->save();
        $this->entry($user, $category, 200, '2024-02-29');
        $this->entry($user, $category, 999, '2024-01-31');
        $this->entry($user, $category, 999, '2024-03-01');
        $this->getJson(self::API.'?year=2024&month=2')->assertOk()
            ->assertJsonPath('data.period.end_date', '2024-02-29')
            ->assertJsonPath('data.totals.expense_cents', 300)
            ->assertJsonPath('data.totals.expense_count', 2);
    }

    public function test_default_month_uses_brazilian_calendar_at_utc_boundary(): void
    {
        $this->signIn();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-11-01 01:00:00', 'UTC'));
        try {
            $this->getJson(self::API)->assertOk()
                ->assertJsonPath('data.period.year', 2026)
                ->assertJsonPath('data.period.month', 10)
                ->assertJsonPath('data.period.range', 'month');
            $this->getJson(self::API.'?range=year')->assertOk()
                ->assertJsonPath('data.period.start_date', '2026-01-01')
                ->assertJsonPath('data.period.end_date', '2026-10-31');
        } finally {
            CarbonImmutable::setTestNow();
        }
    }

    public function test_invalid_ranges_and_partial_periods_return_portuguese_errors(): void
    {
        $this->signIn();
        foreach (['year=2026', 'month=10', 'year=1899&month=1', 'year=2101&month=1',
            'year=2026&month=0', 'year=2026&month=13', 'year=2026&month=1.5',
            'year[]=2026&month=10', 'year=&month=10', 'range=', 'range=quarter',
            'range[]=month', 'range=12', 'range=MONTH'] as $query) {
            $response = $this->getJson(self::API.'?'.$query)->assertUnprocessable();
            $this->assertMatchesRegularExpression('/Informe|Selecione/', $response->json('message'));
        }
    }

    public function test_supported_boundary_years_work_for_every_range(): void
    {
        $this->signIn();
        foreach ([1900, 2100] as $year) {
            foreach (['month', 'three_months', 'year'] as $range) {
                $this->getJson(self::API.'?year='.$year.'&month=1&range='.$range)->assertOk()
                    ->assertJsonPath('data.period.year', $year);
            }
        }
    }

    public function test_large_aggregates_and_small_cents_remain_exact_json_integers(): void
    {
        $user = $this->signIn();
        $expense = $this->category($user);
        $income = $this->category($user, 'income');
        $this->entry($user, $expense, 99999999999, '2026-09-01');
        $this->entry($user, $expense, 99999999999);
        $this->entry($user, $expense, 1);
        $this->entry($user, $income, 10);
        $this->entry($user, $income, 20);
        $response = $this->getJson(self::API.self::OCTOBER.'&range=three_months')->assertOk()
            ->assertJsonPath('data.totals.expense_cents', 199999999999)
            ->assertJsonPath('data.totals.income_cents', 30)
            ->assertJsonPath('data.totals.result_cents', -199999999969);
        foreach ($response->json('data.totals') as $value) $this->assertIsInt($value);
    }

    public function test_monthly_category_and_overall_totals_reconcile_for_all_ranges(): void
    {
        $user = $this->signIn();
        $expense = $this->category($user);
        $income = $this->category($user, 'income');
        for ($month = 1; $month <= 12; $month++) {
            $date = '2026-'.str_pad((string) $month, 2, '0', STR_PAD_LEFT).'-01';
            $this->entry($user, $expense, $month, $date);
            $this->entry($user, $income, $month * 10, $date);
        }
        foreach (['month', 'three_months', 'year'] as $range) {
            $data = $this->getJson(self::API.self::OCTOBER.'&range='.$range)->assertOk()->json('data');
            foreach (['income_cents', 'expense_cents', 'result_cents', 'income_count', 'expense_count'] as $field) {
                $this->assertSame($data['totals'][$field], array_sum(array_column($data['monthly_series'], $field)));
            }
            $this->assertSame($data['totals']['expense_cents'], array_sum(array_column($data['by_category'], 'amount_cents')));
            $this->assertSame($data['totals']['expense_count'], array_sum(array_column($data['by_category'], 'transaction_count')));
        }
    }

    public function test_report_updates_after_edit_move_and_soft_delete_without_cache(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $entry = $this->entry($user, $category, 100);
        $entry->update(['amount_cents' => 200]);
        $this->getJson(self::API.self::OCTOBER)->assertOk()->assertJsonPath('data.totals.expense_cents', 200);
        $entry->update(['transaction_date' => '2026-09-01']);
        $this->getJson(self::API.self::OCTOBER)->assertOk()->assertJsonPath('data.totals.expense_cents', 0);
        $this->getJson(self::API.self::OCTOBER.'&range=three_months')->assertOk()->assertJsonPath('data.totals.expense_cents', 200);
        $entry->delete();
        $this->getJson(self::API.self::OCTOBER.'&range=year')->assertOk()->assertJsonPath('data.totals.expense_cents', 0);
    }

    public function test_report_uses_all_records_not_just_a_transaction_page(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        for ($i = 0; $i < 110; $i++) $this->entry($user, $category, 1);
        $this->getJson(self::API.self::OCTOBER)->assertOk()
            ->assertJsonPath('data.totals.expense_cents', 110)
            ->assertJsonPath('data.totals.expense_count', 110)
            ->assertJsonPath('data.by_category.0.transaction_count', 110);
    }

    public function test_report_queries_remain_bounded_with_many_categories(): void
    {
        $user = $this->signIn();
        for ($i = 0; $i < 12; $i++) $this->entry($user, $this->category($user), 100);
        DB::enableQueryLog();
        DB::flushQueryLog();
        try {
            $this->getJson(self::API.self::OCTOBER.'&range=year')->assertOk();
            $selects = collect(DB::getQueryLog())->filter(fn ($query) => str_starts_with(strtolower($query['query']), 'select'));
            $this->assertLessThanOrEqual(4, $selects->count());
        } finally {
            DB::disableQueryLog();
        }
    }

    public function test_month_report_matches_dashboard_totals_categories_and_comparison(): void
    {
        $user = $this->signIn();
        $expense = $this->category($user);
        $income = $this->category($user, 'income');
        $this->entry($user, $expense, 3999);
        $this->entry($user, $income, 6852884);
        $this->entry($user, $expense, 658, '2026-09-01');
        $report = $this->getJson(self::API.self::OCTOBER)->assertOk()->json('data');
        $dashboard = $this->getJson('/api/v1/dashboard'.self::OCTOBER)->assertOk()->json('data');
        $this->assertSame($dashboard['totals'], $report['totals']);
        $this->assertSame($dashboard['by_category'], $report['by_category']);
        $this->assertSame($dashboard['last_six_months'], $report['comparison_series']);
    }
}
