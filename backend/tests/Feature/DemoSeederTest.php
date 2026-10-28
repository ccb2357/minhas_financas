<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\FinancialCycles;
use App\Services\Goals;
use Carbon\CarbonImmutable as Date;
use Database\Seeders\DemoSeeder;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class DemoSeederTest extends TestCase
{
    use RefreshDatabase;
    protected bool $useCalendarCycleFixture = false;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Date::parse('2026-10-28 12:00:00', 'America/Sao_Paulo'));
    }

    public function test_creates_two_years_and_balanced_goal_ledgers_from_shared_categories(): void
    {
        $this->seed(DemoSeeder::class);
        $user = User::where('email', 'demo@demo.com')->sole();
        $this->assertTrue(Hash::check('demo', $user->password));
        $this->assertSame(53, $user->categories()->count());
        $this->assertSame(15, $user->categories()->where('type', 'income')->count());
        $this->assertSame(38, $user->categories()->where('type', 'expense')->count());
        $this->assertSame(432, $user->monthlyBudgets()->count());
        $this->assertGreaterThan(1000, $user->transactions()->count());
        $this->assertSame('2024-11-10', $user->transactions()->min('transaction_date'));
        $this->assertLessThanOrEqual('2026-10-28', $user->transactions()->max('transaction_date'));
        $this->assertSame(24, $user->monthlyBudgets()->distinct()->count('financial_cycle_id'));
        $this->assertSame(0, DB::table('transactions as t')->join('categories as c', 'c.id', '=', 't.category_id')
            ->whereColumn('t.user_id', '!=', 'c.user_id')->count());
        $budgets = DB::table('monthly_budgets as b')->join('financial_cycles as c', 'c.id', '=', 'b.financial_cycle_id')
            ->select('b.*', 'c.start_date', 'c.end_date')->get();
        $over = $under = 0;
        foreach ($budgets as $budget) {
            $spent = (int) DB::table('transactions')->where('user_id', $user->id)->where('category_id', $budget->category_id)
                ->whereBetween('transaction_date', [$budget->start_date, $budget->end_date])->sum('amount_cents');
            $over += (int) ($spent > $budget->limit_cents);
            $under += (int) ($spent < $budget->limit_cents);
        }
        $this->assertGreaterThan(0, $over); $this->assertGreaterThan(0, $under);
        $this->assertGreaterThan(0, DB::table('transactions as t')->where('type', 'expense')->whereNotExists(function ($q): void {
            $q->selectRaw('1')->from('monthly_budgets as b')->whereColumn('b.user_id', 't.user_id')->whereColumn('b.category_id', 't.category_id');
        })->count());
        $goals = DB::table('goals')->get();
        $this->assertCount(8, $goals);
        $this->assertSame(4, $goals->where('status', 'active')->count());
        $this->assertSame(3, $goals->whereNotNull('completed_at')->count());
        foreach ($goals as $goal) {
            $moves = DB::table('goal_movements')->where('goal_id', $goal->id)->orderBy('movement_date')->orderBy('id')->get();
            $balance = 0;
            foreach ($moves as $move) {
                $balance += ($move->type === 'withdrawal' ? -1 : 1) * (int) $move->amount_cents;
                $this->assertGreaterThanOrEqual(0, $balance);
                $this->assertLessThanOrEqual('2026-10-28', $move->movement_date);
            }
            $this->assertSame((int) $goal->saved_cents, $balance);
            if ($goal->completed_at) $this->assertGreaterThanOrEqual((int) $goal->target_cents, $balance);
        }
        $this->assertSame(2, DB::table('goal_movements')->where('type', 'withdrawal')->count());
    }

    public function test_default_seeder_works_and_repeat_does_not_change_any_data(): void
    {
        $this->seed(DatabaseSeeder::class);
        $tables = ['users', 'categories', 'transactions', 'monthly_budgets', 'goals', 'goal_movements', 'financial_cycle_settings', 'financial_cycles'];
        $before = [];
        foreach ($tables as $table) $before[$table] = DB::table($table)->orderBy('id')->get()->toJson();
        $this->seed(DemoSeeder::class);
        foreach ($tables as $table) $this->assertSame($before[$table], DB::table($table)->orderBy('id')->get()->toJson(), $table);
    }

    public function test_preserves_other_users_and_day_31_configuration(): void
    {
        $calendar = app(FinancialCycles::class); $calendar->configure(31, 0);
        $owner = User::factory()->create();
        $category = $owner->categories()->create(['name' => 'Original', 'type' => 'expense', 'icon' => 'cart', 'color' => '#1564FF', 'is_active' => true]);
        $entry = $owner->transactions()->create(['category_id' => $category->id, 'type' => 'expense', 'amount_cents' => 12345, 'description' => 'Original', 'transaction_date' => '2026-10-15']);
        $original = $entry->fresh()->getRawOriginal(); $userBefore = $owner->fresh()->getRawOriginal();
        $setting = (array) DB::table('financial_cycle_settings')->first();
        $periods = DB::table('financial_cycles')->get();
        $this->seed(DemoSeeder::class);
        $this->assertSame($original, $entry->fresh()->getRawOriginal());
        $this->assertSame($userBefore, $owner->fresh()->getRawOriginal());
        $this->assertSame(1, $owner->categories()->count());
        $this->assertSame($setting, (array) DB::table('financial_cycle_settings')->first());
        foreach ($periods as $period) $this->assertEquals($period, DB::table('financial_cycles')->find($period->id));
        $demo = User::where('email', 'demo@demo.com')->sole();
        $this->assertSame(432, $demo->monthlyBudgets()->count());
        $this->assertLessThanOrEqual('2026-10-28', $demo->transactions()->max('transaction_date'));
    }

    public function test_error_rolls_back_everything(): void
    {
        $mock = Mockery::mock(Goals::class);
        $mock->shouldReceive('create')->once()->andThrow(new RuntimeException('Falha simulada'));
        $this->app->instance(Goals::class, $mock);
        try { $this->seed(DemoSeeder::class); $this->fail('A falha deveria ser propagada.'); }
        catch (RuntimeException $error) { $this->assertSame('Falha simulada', $error->getMessage()); }
        foreach (['users', 'categories', 'transactions', 'monthly_budgets', 'goals', 'financial_cycles'] as $table) $this->assertDatabaseCount($table, 0);
        $this->assertNull(DB::table('financial_cycle_settings')->value('cut_day'));
    }

    public function test_current_cycle_start_has_no_future_operations(): void
    {
        $this->travelTo(Date::parse('2026-02-10 09:00:00', 'America/Sao_Paulo'));
        $this->seed(DemoSeeder::class);
        $this->assertLessThanOrEqual('2026-02-10', DB::table('transactions')->max('transaction_date'));
        $this->assertLessThanOrEqual('2026-02-10', DB::table('goal_movements')->max('movement_date'));
        $this->assertSame(24, DB::table('monthly_budgets')->distinct()->count('financial_cycle_id'));
    }
}
