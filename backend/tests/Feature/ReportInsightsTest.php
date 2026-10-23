<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ReportInsightsTest extends TestCase
{
    use RefreshDatabase;

    private int $sequence = 0;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-20 12:00:00', 'America/Sao_Paulo'));
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    private function signIn(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web')->withHeader('Origin', 'http://localhost:5173');
        return $user;
    }

    private function category(User $user, string $type = 'expense'): Category
    {
        return $user->categories()->create(['name' => 'Categoria '.(++$this->sequence),
            'type' => $type, 'icon' => 'cart', 'color' => '#2463EB', 'is_active' => true]);
    }

    private function entry(User $user, Category $category, int $cents, string $date = '2026-10-19'): Transaction
    {
        return $user->transactions()->create(['category_id' => $category->id, 'type' => $category->type->value,
            'amount_cents' => $cents, 'transaction_date' => $date, 'description' => 'Lançamento '.(++$this->sequence)]);
    }

    private function report(string $range = 'month', int $year = 2026, int $month = 10): array
    {
        return $this->getJson('/api/v1/reports?'.http_build_query(compact('range', 'year', 'month')))->assertOk()->json('data');
    }

    public function test_empty_report_has_null_insights_zero_previous_totals_and_undefined_percentages(): void
    {
        $this->signIn();
        $data = $this->report();
        $this->assertNull($data['insights']['largest_expense']);
        $this->assertNull($data['insights']['most_used_expense_category']);
        $this->assertSame(['income_cents' => 0, 'expense_cents' => 0, 'result_cents' => 0, 'income_count' => 0, 'expense_count' => 0], $data['previous_period']['totals']);
        foreach ($data['changes'] as $change) {
            $this->assertSame(0, $change['difference_cents']);
            $this->assertNull($change['percent']);
        }
    }

    public function test_month_compares_the_previous_calendar_month_with_exclusive_end_boundaries(): void
    {
        $user = $this->signIn();
        $expense = $this->category($user);
        $this->entry($user, $expense, 90000, '2026-08-31');
        $this->entry($user, $expense, 100, '2026-09-01');
        $this->entry($user, $expense, 200, '2026-09-30');
        $this->entry($user, $expense, 600, '2026-10-01');
        $this->entry($user, $expense, 90000, '2026-11-01');
        $data = $this->report();
        $this->assertSame('2026-09-01', $data['previous_period']['start_date']);
        $this->assertSame('2026-09-30', $data['previous_period']['end_date']);
        $this->assertSame(1, $data['previous_period']['month_count']);
        $this->assertSame(300, $data['previous_period']['totals']['expense_cents']);
        $this->assertSame(600, $data['totals']['expense_cents']);
        $this->assertSame(300, $data['changes']['expense']['difference_cents']);
        $this->assertEquals(100, $data['changes']['expense']['percent']);
    }

    public function test_three_months_compares_the_previous_three_without_overlapping(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        foreach (['2026-05-01', '2026-06-01', '2026-07-31'] as $date) $this->entry($user, $category, 100, $date);
        foreach (['2026-08-01', '2026-09-01', '2026-10-31'] as $date) $this->entry($user, $category, 200, $date);
        $this->entry($user, $category, 9999, '2026-04-30');
        $data = $this->report('three_months');
        $this->assertSame('2026-05-01', $data['previous_period']['start_date']);
        $this->assertSame('2026-07-31', $data['previous_period']['end_date']);
        $this->assertSame(3, $data['previous_period']['month_count']);
        $this->assertSame(300, $data['previous_period']['totals']['expense_cents']);
        $this->assertSame(600, $data['totals']['expense_cents']);
        $this->assertSame(3, count($data['comparison_series']));
    }

    public function test_three_month_comparison_crosses_year_boundary(): void
    {
        $this->signIn();
        $data = $this->report('three_months', 2026, 1);
        $this->assertSame('2025-08-01', $data['previous_period']['start_date']);
        $this->assertSame('2025-10-31', $data['previous_period']['end_date']);
        $this->assertSame('2025-11-01', $data['period']['start_date']);
        $this->assertSame('2026-01-31', $data['period']['end_date']);
    }

    public function test_year_compares_january_to_selected_month_of_previous_year(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->entry($user, $category, 10, '2025-01-01');
        $this->entry($user, $category, 20, '2025-10-31');
        $this->entry($user, $category, 90000, '2025-11-01');
        $this->entry($user, $category, 90000, '2025-12-31');
        $this->entry($user, $category, 60, '2026-01-01');
        $data = $this->report('year');
        $this->assertSame('2025-01-01', $data['previous_period']['start_date']);
        $this->assertSame('2025-10-31', $data['previous_period']['end_date']);
        $this->assertSame(10, $data['previous_period']['month_count']);
        $this->assertSame(30, $data['previous_period']['totals']['expense_cents']);
        $this->assertSame(60, $data['totals']['expense_cents']);
        $this->assertCount(10, $data['monthly_series']);
        $this->assertCount(10, $data['comparison_series']);
    }

    public function test_year_january_december_and_leap_february_have_correct_previous_dates(): void
    {
        $this->signIn();
        foreach ([[2026, 1, '2025-01-31', 1], [2026, 12, '2025-12-31', 12],
            [2025, 2, '2024-02-29', 2], [2024, 2, '2023-02-28', 2]] as [$year, $month, $end, $count]) {
            $data = $this->report('year', $year, $month);
            $this->assertSame($end, $data['previous_period']['end_date']);
            $this->assertSame($count, $data['previous_period']['month_count']);
        }
    }

    public function test_largest_expense_is_an_individual_expense_not_category_total_or_income(): void
    {
        $user = $this->signIn();
        $frequent = $this->category($user);
        $largestCategory = $this->category($user);
        $income = $this->category($user, 'income');
        $this->entry($user, $frequent, 2000);
        $this->entry($user, $frequent, 2000);
        $largest = $this->entry($user, $largestCategory, 3900);
        $this->entry($user, $income, 999999);
        $this->entry($user, $largestCategory, 999999, '2026-09-30');
        $data = $this->report();
        $this->assertSame($largest->id, $data['insights']['largest_expense']['id']);
        $this->assertSame(3900, $data['insights']['largest_expense']['amount_cents']);
        $this->assertSame($largestCategory->id, $data['insights']['largest_expense']['category']['id']);
        $this->assertSame($frequent->id, $data['by_category'][0]['category']['id']);
    }

    public function test_largest_expense_ties_use_date_then_id_descending(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->entry($user, $category, 100, '2026-10-02');
        $this->entry($user, $category, 100, '2026-10-20');
        $expected = $this->entry($user, $category, 100, '2026-10-20');
        $this->assertSame($expected->id, $this->report()['insights']['largest_expense']['id']);
    }

    public function test_most_used_expense_category_uses_frequency_instead_of_value(): void
    {
        $user = $this->signIn();
        $frequent = $this->category($user);
        $expensive = $this->category($user);
        $income = $this->category($user, 'income');
        for ($i = 0; $i < 3; $i++) $this->entry($user, $frequent, 1);
        $this->entry($user, $expensive, 100000);
        for ($i = 0; $i < 4; $i++) $this->entry($user, $income, 1);
        $result = $this->report()['insights']['most_used_expense_category'];
        $this->assertSame($frequent->id, $result['category']['id']);
        $this->assertSame(3, $result['transaction_count']);
        $this->assertSame(3, $result['amount_cents']);
    }

    public function test_category_frequency_ties_use_amount_then_id_ascending(): void
    {
        $user = $this->signIn();
        $first = $this->category($user);
        $second = $this->category($user);
        $this->entry($user, $first, 10);
        $secondEntry = $this->entry($user, $second, 20);
        $this->assertSame($second->id, $this->report()['insights']['most_used_expense_category']['category']['id']);
        $secondEntry->update(['amount_cents' => 10]);
        $this->assertSame($first->id, $this->report()['insights']['most_used_expense_category']['category']['id']);
    }

    public function test_income_only_period_has_no_expense_insights(): void
    {
        $user = $this->signIn();
        $this->entry($user, $this->category($user, 'income'), 100);
        $data = $this->report();
        $this->assertNull($data['insights']['largest_expense']);
        $this->assertNull($data['insights']['most_used_expense_category']);
    }

    public function test_all_new_fields_are_scoped_to_owner_and_ignore_supplied_user_id(): void
    {
        $user = $this->signIn();
        $own = $this->category($user);
        $entry = $this->entry($user, $own, 10);
        $this->entry($user, $own, 20, '2026-09-01');
        $other = User::factory()->create();
        $foreign = $this->category($other);
        $this->entry($other, $foreign, 999999);
        $this->entry($other, $foreign, 999999, '2026-09-01');
        $data = $this->getJson('/api/v1/reports?year=2026&month=10&user_id='.$other->id)->assertOk()->json('data');
        $this->assertSame($entry->id, $data['insights']['largest_expense']['id']);
        $this->assertSame($own->id, $data['insights']['most_used_expense_category']['category']['id']);
        $this->assertSame(20, $data['previous_period']['totals']['expense_cents']);
        $this->assertSame(-10, $data['changes']['expense']['difference_cents']);
    }

    public function test_soft_deleted_entries_are_excluded_from_insights_and_previous_totals(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->entry($user, $category, 999)->delete();
        $this->entry($user, $category, 999, '2026-09-01')->delete();
        $data = $this->report();
        $this->assertNull($data['insights']['largest_expense']);
        $this->assertNull($data['insights']['most_used_expense_category']);
        $this->assertSame(0, $data['previous_period']['totals']['expense_cents']);
    }

    public function test_inactive_category_remains_identifiable_in_both_insights(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->entry($user, $category, 100);
        $category->update(['name' => 'Histórica', 'is_active' => false, 'color' => '#E92B3B']);
        $data = $this->report();
        foreach ([$data['insights']['largest_expense']['category'], $data['insights']['most_used_expense_category']['category']] as $returned) {
            $this->assertSame('Histórica', $returned['name']);
            $this->assertSame(false, $returned['is_active']);
            $this->assertSame('#E92B3B', $returned['color']);
        }
    }

    public function test_changes_preserve_exact_cents_and_round_only_presentation_percentages(): void
    {
        $user = $this->signIn();
        $category = $this->category($user, 'income');
        $this->entry($user, $category, 300, '2026-09-30');
        $this->entry($user, $category, 400);
        $data = $this->report();
        $this->assertSame(100, $data['changes']['income']['difference_cents']);
        $this->assertSame(33.33, $data['changes']['income']['percent']);
        $this->assertNull($data['changes']['expense']['percent']);
        $this->assertSame(33.33, $data['changes']['result']['percent']);
    }

    public function test_result_comparison_with_zero_or_negative_base_has_no_percentage(): void
    {
        $user = $this->signIn();
        $expense = $this->category($user);
        $income = $this->category($user, 'income');
        $previous = $this->entry($user, $expense, 100, '2026-09-30');
        $this->entry($user, $income, 100);
        $data = $this->report();
        $this->assertSame(200, $data['changes']['result']['difference_cents']);
        $this->assertNull($data['changes']['result']['percent']);
        $previous->delete();
        $this->assertNull($this->report()['changes']['result']['percent']);
    }

    public function test_positive_result_can_become_negative_without_clamping_the_change(): void
    {
        $user = $this->signIn();
        $this->entry($user, $this->category($user, 'income'), 100, '2026-09-30');
        $this->entry($user, $this->category($user), 100);
        $data = $this->report();
        $this->assertSame(-200, $data['changes']['result']['difference_cents']);
        $this->assertEquals(-200, $data['changes']['result']['percent']);
    }

    public function test_calendar_status_marks_past_current_and_future_periods(): void
    {
        $this->signIn();
        foreach ([[9, 'past', false], [10, 'in_progress', true], [11, 'future', false]] as [$month, $state, $partial]) {
            $data = $this->report('month', 2026, $month);
            $this->assertSame(['state' => $state, 'is_partial' => $partial, 'as_of_date' => '2026-10-20'], $data['period_status']);
        }
        $this->assertSame('in_progress', $this->report('year', 2026, 12)['period_status']['state']);
        $this->assertSame('past', $this->report('year', 2025, 12)['period_status']['state']);
    }

    public function test_status_uses_brazilian_date_at_utc_boundary_and_month_last_day(): void
    {
        $this->signIn();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-11-01 01:00:00', 'UTC'));
        $data = $this->report();
        $this->assertSame('2026-10-31', $data['period_status']['as_of_date']);
        $this->assertSame(true, $data['period_status']['is_partial']);
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-11-01 03:00:00', 'UTC'));
        $this->assertSame('past', $this->report()['period_status']['state']);
    }

    public function test_status_does_not_silently_discard_future_dated_entries_in_selected_period(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $future = $this->entry($user, $category, 1000, '2026-10-31');
        $data = $this->report();
        $this->assertTrue($data['period_status']['is_partial']);
        $this->assertSame(1000, $data['totals']['expense_cents']);
        $this->assertSame($future->id, $data['insights']['largest_expense']['id']);
    }

    public function test_changes_and_insights_update_after_edits_moves_and_deletions(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $entry = $this->entry($user, $category, 100);
        $this->assertSame(100, $this->report()['changes']['expense']['difference_cents']);
        $entry->update(['amount_cents' => 300]);
        $this->assertSame(300, $this->report()['insights']['largest_expense']['amount_cents']);
        $entry->update(['transaction_date' => '2026-09-30']);
        $data = $this->report();
        $this->assertSame(-300, $data['changes']['expense']['difference_cents']);
        $this->assertNull($data['insights']['largest_expense']);
        $entry->delete();
        $this->assertSame(0, $this->report()['previous_period']['totals']['expense_cents']);
    }

    public function test_large_aggregates_and_delta_remain_integer_cents(): void
    {
        $user = $this->signIn();
        $category = $this->category($user);
        $this->entry($user, $category, 99999999999, '2026-09-30');
        $this->entry($user, $category, 99999999999);
        $this->entry($user, $category, 99999999999);
        $this->entry($user, $category, 1);
        $data = $this->report();
        $this->assertSame(199999999999, $data['totals']['expense_cents']);
        $this->assertSame(100000000000, $data['changes']['expense']['difference_cents']);
        $this->assertSame(99999999999, $data['previous_period']['totals']['expense_cents']);
        $this->assertSame(99999999999, $data['insights']['largest_expense']['amount_cents']);
    }

    public function test_supported_calendar_boundaries_do_not_break_comparison(): void
    {
        $this->signIn();
        foreach ([1900, 2100] as $year) foreach (['month', 'three_months', 'year'] as $range) {
            $data = $this->report($range, $year, 1);
            $this->assertNull($data['insights']['largest_expense']);
            $this->assertSame(0, $data['previous_period']['totals']['expense_cents']);
        }
    }

    public function test_insights_follow_month_three_months_and_year_scopes(): void
    {
        $user = $this->signIn();
        $frequent = $this->category($user);
        $september = $this->category($user);
        $july = $this->category($user);
        $octoberEntry = $this->entry($user, $frequent, 10, '2026-10-01');
        $this->entry($user, $frequent, 20, '2026-08-01');
        $septemberEntry = $this->entry($user, $september, 100, '2026-09-30');
        $julyEntry = $this->entry($user, $july, 1000, '2026-07-31');
        $this->entry($user, $july, 999999, '2025-12-31');
        $this->entry($user, $july, 999999, '2026-11-01');
        foreach ([['month', $octoberEntry->id, 1], ['three_months', $septemberEntry->id, 2], ['year', $julyEntry->id, 2]] as [$range, $id, $count]) {
            $data = $this->report($range);
            $this->assertSame($id, $data['insights']['largest_expense']['id']);
            $this->assertSame($frequent->id, $data['insights']['most_used_expense_category']['category']['id']);
            $this->assertSame($count, $data['insights']['most_used_expense_category']['transaction_count']);
        }
    }

    public function test_january_uses_december_and_drop_to_zero_has_minus_one_hundred_percent(): void
    {
        $user = $this->signIn();
        $this->entry($user, $this->category($user), 100, '2025-12-31');
        $data = $this->report('month', 2026, 1);
        $this->assertSame('2025-12-01', $data['previous_period']['start_date']);
        $this->assertSame('2025-12-31', $data['previous_period']['end_date']);
        $this->assertSame(-100, $data['changes']['expense']['difference_cents']);
        $this->assertEquals(-100, $data['changes']['expense']['percent']);
    }

    public function test_insights_do_not_expose_owner_password_or_deleted_fields(): void
    {
        $user = $this->signIn();
        $this->entry($user, $this->category($user), 100);
        $data = $this->report();
        foreach (['user_id', 'password', 'remember_token', 'deleted_at'] as $key) {
            $this->assertArrayNotHasKey($key, $data['insights']['largest_expense']);
            $this->assertArrayNotHasKey($key, $data['insights']['most_used_expense_category']['category']);
        }
    }

    public function test_insights_are_not_paginated_and_queries_remain_bounded(): void
    {
        $user = $this->signIn();
        $frequent = $this->category($user);
        for ($i = 0; $i < 110; $i++) $this->entry($user, $frequent, 1);
        for ($i = 0; $i < 12; $i++) $this->entry($user, $this->category($user), 200);
        DB::enableQueryLog();
        DB::flushQueryLog();
        try {
            $data = $this->report('year');
            $this->assertSame(110, $data['insights']['most_used_expense_category']['transaction_count']);
            $this->assertSame(200, $data['insights']['largest_expense']['amount_cents']);
            $selects = collect(DB::getQueryLog())->filter(fn ($query) => str_starts_with(strtolower($query['query']), 'select'));
            // Includes the fixed cost of loading the persisted cycle calendar.
            $this->assertLessThanOrEqual(9, $selects->count());
        } finally {
            DB::disableQueryLog();
        }
    }
}
