<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Database\Seeders\DemoYearSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use RuntimeException;
use Tests\TestCase;

class DemoYearSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 21)->setTime(12, 0));
    }

    public function test_full_year_preserves_the_complete_user_record_and_reconciles_every_month(): void
    {
        $user = User::factory()->create(['remember_token' => 'keep-this-token']);
        $before = $user->fresh()->getRawOriginal();
        $this->seed(DemoYearSeeder::class);
        $this->assertSame($before, $user->fresh()->getRawOriginal());
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('categories', 15);
        $this->assertDatabaseCount('monthly_budgets', 120);
        $this->actingAs($user, 'web')->withHeader('Origin', 'http://localhost:5173');
        $results = [];
        for ($month = 1; $month <= 12; $month++) {
            $entries = DB::table('transactions')->whereBetween('transaction_date', [sprintf('2026-%02d-01', $month), sprintf('2026-%02d-31', $month)])->get();
            $income = (int) $entries->where('type', 'income')->sum('amount_cents');
            $expenses = (int) $entries->where('type', 'expense')->sum('amount_cents');
            $this->assertGreaterThan(0, $income);
            $this->assertGreaterThan(0, $expenses);
            $this->assertTrue($entries->every(fn ($row) => $row->user_id === $user->id && $row->amount_cents > 0 && $row->deleted_at === null));
            foreach (['dashboard', 'reports?range=month'] as $endpoint) {
                $separator = str_contains($endpoint, '?') ? '&' : '?';
                $this->getJson('/api/v1/'.$endpoint.$separator.'year=2026&month='.$month)->assertOk()
                    ->assertJsonPath('data.totals.income_cents', $income)
                    ->assertJsonPath('data.totals.expense_cents', $expenses)
                    ->assertJsonPath('data.totals.result_cents', $income - $expenses);
            }
            $ratios = [];
            foreach ($user->monthlyBudgets()->where('month', $month)->get() as $budget) {
                $spent = (int) $entries->where('category_id', $budget->category_id)->sum('amount_cents');
                $ratios[] = $spent * 100 / $budget->limit_cents;
            }
            $this->assertNotEmpty(array_filter($ratios, fn ($ratio) => $ratio < 75));
            $this->assertNotEmpty(array_filter($ratios, fn ($ratio) => $ratio >= 75 && $ratio < 90));
            $this->assertNotEmpty(array_filter($ratios, fn ($ratio) => $ratio >= 90 && $ratio < 100));
            $this->assertNotEmpty(array_filter($ratios, fn ($ratio) => $ratio == 100));
            $this->assertNotEmpty(array_filter($ratios, fn ($ratio) => $ratio > 100));
            $results[] = $income - $expenses;
        }
        $this->assertLessThan(0, min($results));
        $this->assertGreaterThan(0, max($results));
        foreach (Category::all() as $category) {
            $this->assertContains($category->icon, Category::ICONS);
            $this->assertMatchesRegularExpression('/^#[0-9A-F]{6}$/', $category->color);
        }
    }

    public function test_old_financial_data_including_soft_deleted_records_is_replaced_and_reruns_do_not_accumulate(): void
    {
        $user = User::factory()->create();
        $category = $user->categories()->create(['name' => 'Dado antigo', 'type' => 'expense', 'icon' => 'cart', 'color' => '#1564FF']);
        $user->transactions()->create(['category_id' => $category->id, 'type' => 'expense', 'amount_cents' => 999, 'description' => 'Apagar', 'transaction_date' => '2025-01-01'])->delete();
        $user->monthlyBudgets()->create(['category_id' => $category->id, 'year' => 2025, 'month' => 1, 'limit_cents' => 1000])->delete();
        $this->seed(DemoYearSeeder::class);
        $snapshot = fn () => DB::table('transactions')->join('categories', 'categories.id', '=', 'transactions.category_id')
            ->orderBy('transaction_date')->orderBy('description')->orderBy('name')
            ->get(['categories.name', 'transactions.type', 'amount_cents', 'description', 'transaction_date'])->toJson();
        $first = $snapshot();
        $count = DB::table('transactions')->count();
        $this->assertDatabaseMissing('categories', ['name' => 'Dado antigo']);
        $this->assertDatabaseMissing('transactions', ['description' => 'Apagar']);
        $this->seed(DemoYearSeeder::class);
        $this->assertSame($count, DB::table('transactions')->count());
        $this->assertSame($first, $snapshot());
        $this->assertDatabaseCount('categories', 15);
        $this->assertDatabaseCount('monthly_budgets', 120);
    }

    public function test_failure_after_cleanup_rolls_back_the_entire_replacement(): void
    {
        $user = User::factory()->create();
        $category = $user->categories()->create(['name' => 'Preservar no rollback', 'type' => 'expense', 'icon' => 'cart', 'color' => '#1564FF']);
        $entry = $user->transactions()->create(['category_id' => $category->id, 'type' => 'expense', 'amount_cents' => 999, 'description' => 'Preservar', 'transaction_date' => '2026-01-01']);
        $budget = $user->monthlyBudgets()->create(['category_id' => $category->id, 'year' => 2026, 'month' => 1, 'limit_cents' => 1000]);
        $event = 'eloquent.creating: '.Category::class;
        Event::listen($event, fn () => throw new RuntimeException('Falha simulada'));
        try {
            $this->seed(DemoYearSeeder::class);
            $this->fail('A falha deveria interromper o seeder.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Falha simulada', $exception->getMessage());
        } finally {
            Event::forget($event);
        }
        $this->assertDatabaseCount('categories', 1);
        $this->assertDatabaseHas('transactions', ['id' => $entry->id, 'amount_cents' => 999]);
        $this->assertDatabaseHas('monthly_budgets', ['id' => $budget->id, 'limit_cents' => 1000]);
    }

    public function test_no_existing_user_is_an_error_and_does_not_create_a_default_account(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('exatamente um usuário');
        try { $this->seed(DemoYearSeeder::class); }
        finally { $this->assertDatabaseCount('users', 0); $this->assertDatabaseCount('transactions', 0); }
    }

    public function test_multiple_users_stop_before_any_cleanup(): void
    {
        $user = User::factory()->create();
        User::factory()->create();
        $category = $user->categories()->create(['name' => 'Não apagar', 'type' => 'expense', 'icon' => 'cart', 'color' => '#1564FF']);
        $this->expectException(RuntimeException::class);
        try { $this->seed(DemoYearSeeder::class); }
        finally { $this->assertDatabaseHas('categories', ['id' => $category->id]); $this->assertDatabaseCount('users', 2); }
    }

    public function test_year_follows_the_brazilian_calendar_and_all_generated_dates_are_valid(): void
    {
        $this->travelTo(\Carbon\CarbonImmutable::parse('2027-01-01 01:00:00', 'UTC'));
        User::factory()->create();
        $this->seed(DemoYearSeeder::class);
        foreach (DB::table('transactions')->pluck('transaction_date') as $date) {
            [$year, $month, $day] = array_map('intval', explode('-', $date));
            $this->assertSame(2026, $year);
            $this->assertTrue(checkdate($month, $day, $year));
        }
        $this->assertSame([2026], DB::table('monthly_budgets')->distinct()->pluck('year')->all());
    }
}
