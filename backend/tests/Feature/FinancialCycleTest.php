<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\FinancialCycles;
use Carbon\CarbonImmutable as Date;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FinancialCycleTest extends TestCase
{
    use RefreshDatabase;
    protected bool $useCalendarCycleFixture = false;
    protected function setUp(): void { parent::setUp(); Date::setTestNow(Date::parse('2026-10-23 12:00:00', 'America/Sao_Paulo')); }
    protected function tearDown(): void { Date::setTestNow(); parent::tearDown(); }
    private function login(): User { $u = User::factory()->create(); $this->actingAs($u); return $u; }
    private function configure(int $day, int $version = 0): array {
        return $this->putJson('/api/v1/financial-cycle', ['cut_day' => $day, 'version' => $version])->assertOk()->json('data');
    }
    private function entry(User $u, string $date, int $amount, string $type = 'expense', ?object $category = null): object {
        $category ??= $u->categories()->firstOrCreate(['name' => 'Categoria '.$type, 'type' => $type], ['icon' => 'cart', 'color' => '#1564FF', 'is_active' => true]);
        return $u->transactions()->create(['category_id' => $category->id, 'type' => $type, 'amount_cents' => $amount, 'description' => 'Teste '.$date, 'transaction_date' => $date]);
    }
    public function test_setup_has_no_hardcoded_day_and_is_required(): void {
        $this->login(); $this->getJson('/api/v1/financial-cycle')->assertOk()->assertJsonPath('data.configured', false);
        foreach (['dashboard','transactions','reports','budgets'] as $route) $this->getJson('/api/v1/'.$route)->assertStatus(428)->assertJsonPath('code', 'CYCLE_SETUP_REQUIRED');
        $this->assertDatabaseCount('financial_cycles', 0);
    }
    public function test_configuration_requires_authentication(): void {
        $this->getJson('/api/v1/financial-cycle')->assertUnauthorized();
        $this->putJson('/api/v1/financial-cycle', ['cut_day' => 10, 'version' => 0])->assertUnauthorized();
    }
    public function test_first_setup_uses_selected_day_and_before_cut_uses_previous_cycle(): void {
        $this->login(); Date::setTestNow(Date::parse('2026-10-05 12:00:00', 'America/Sao_Paulo'));
        $d=$this->configure(10);$this->assertSame('2026-09-10',$d['current']['start_date']);$this->assertSame('2026-10-09',$d['current']['end_date']);
        $this->getJson('/api/v1/dashboard')->assertOk()->assertJsonPath('data.period.key','2026-09');
    }
    public function test_cut_uses_brazilian_date_near_midnight(): void {
        $this->login();$this->configure(10);
        Date::setTestNow(Date::parse('2026-11-10T01:00:00Z'));
        $this->getJson('/api/v1/financial-cycle')->assertOk()->assertJsonPath('data.current.key','2026-10');
        Date::setTestNow(Date::parse('2026-11-10T03:00:00Z'));
        $this->getJson('/api/v1/financial-cycle')->assertOk()->assertJsonPath('data.current.key','2026-11');
    }
    public function test_change_preserves_current_and_past_and_reflows_future_without_gaps(): void {
        $this->login();$a=$this->configure(10);$before=DB::table('financial_cycles')->where('start_date','<=','2026-10-23')->get()->toArray();
        $d=$this->configure(15,1);$this->assertSame($a['current'],$d['current']);$this->assertSame(15,$d['pending_cut_day']);
        $this->assertSame('2026-11-10',$d['next']['start_date']);$this->assertSame('2026-12-14',$d['next']['end_date']);
        $this->assertEquals($before,DB::table('financial_cycles')->where('start_date','<=','2026-10-23')->get()->toArray());
        $this->assertContiguous();
        Date::setTestNow(Date::parse('2026-11-10 12:00:00','America/Sao_Paulo'));
        $this->getJson('/api/v1/financial-cycle')->assertOk()->assertJsonPath('data.pending_cut_day',null)->assertJsonPath('data.current.start_date','2026-11-10')->assertJsonPath('data.current.end_date','2026-12-14')->assertJsonPath('data.next.start_date','2026-12-15');
    }
    public function test_earlier_cut_has_short_transition_and_can_cancel_before_next_cycle(): void {
        $this->login();$this->configure(10);$d=$this->configure(5,1);
        $this->assertSame('2026-11-10',$d['next']['start_date']);$this->assertSame('2026-12-04',$d['next']['end_date']);$this->assertContiguous();
        $d=$this->configure(10,2);$this->assertNull($d['pending_cut_day']);$this->assertSame('2026-12-09',$d['next']['end_date']);$this->assertContiguous();
    }
    public function test_repeated_changes_after_rollover_freeze_transition_cycle(): void {
        $this->login();$this->configure(10);$this->configure(15,1);
        Date::setTestNow(Date::parse('2026-11-20 12:00:00','America/Sao_Paulo'));
        $d=$this->configure(7,2);$this->assertSame('2026-11-10',$d['current']['start_date']);$this->assertSame('2026-12-14',$d['current']['end_date']);
        $this->assertSame('2026-12-15',$d['next']['start_date']);$this->assertSame('2027-01-06',$d['next']['end_date']);$this->assertContiguous();
    }
    public function test_day_31_clamps_without_overflow_and_handles_leap_year(): void {
        $this->login();$this->configure(31);
        foreach ([['2024-01','2024-01-31','2024-02-28'],['2024-02','2024-02-29','2024-03-30'],['2026-02','2026-02-28','2026-03-30'],['2026-12','2026-12-31','2027-01-30']] as [$label,$start,$end]) {
            [$y,$m]=explode('-',$label);$p=app(FinancialCycles::class)->forLabel(app(FinancialCycles::class)->label((int)$y,(int)$m));
            $this->assertSame($start,$p->start_date);$this->assertSame($end,$p->end_date);
        }
        $this->assertContiguous();
    }
    public function test_invalid_day_and_stale_version_are_rejected(): void {
        $this->login();foreach ([0,32,10.5,[],null,'x'] as $day) $this->putJson('/api/v1/financial-cycle',['cut_day'=>$day,'version'=>0])->assertUnprocessable()->assertJsonValidationErrors('cut_day');
        $this->configure(12);$this->putJson('/api/v1/financial-cycle',['cut_day'=>20,'version'=>0])->assertUnprocessable();
        $this->getJson('/api/v1/financial-cycle')->assertOk()->assertJsonPath('data.current.cut_day',12);
    }
    public function test_dashboard_history_and_reports_share_cycle_boundaries_and_user_scope(): void {
        $u=$this->login();$this->configure(10);
        foreach ([['2026-10-09',100],['2026-10-10',200],['2026-11-01',300],['2026-11-09',400],['2026-11-10',500]] as [$date,$amount]) $this->entry($u,$date,$amount);
        $this->entry($u,'2026-10-15',2500,'income');$this->entry(User::factory()->create(),'2026-10-15',9999);
        $this->getJson('/api/v1/dashboard?year=2026&month=10')->assertOk()->assertJsonPath('data.period.start_date','2026-10-10')->assertJsonPath('data.period.end_date','2026-11-09')->assertJsonPath('data.totals.expense_cents',900)->assertJsonPath('data.totals.result_cents',1600)->assertJsonPath('data.previous_month.expense_cents',100);
        $this->getJson('/api/v1/transactions?year=2026&month=10')->assertOk()->assertJsonPath('meta.total',4)->assertJsonPath('meta.period.end_date','2026-11-09');
        $this->getJson('/api/v1/reports?year=2026&month=10&range=month')->assertOk()->assertJsonPath('data.totals.expense_cents',900)->assertJsonPath('data.totals.result_cents',1600)->assertJsonPath('data.period.end_date','2026-11-09')->assertJsonPath('data.insights.largest_expense.amount_cents',400);
    }
    public function test_three_cycles_and_year_use_cycle_dates_instead_of_calendar_dates(): void {
        $u=$this->login();$this->configure(10);$this->entry($u,'2026-01-05',100);$this->entry($u,'2026-01-10',200);$this->entry($u,'2026-11-09',400);$this->entry($u,'2026-11-10',800);
        $this->getJson('/api/v1/reports?year=2026&month=10&range=year')->assertOk()->assertJsonPath('data.period.start_date','2026-01-10')->assertJsonPath('data.period.end_date','2026-11-09')->assertJsonPath('data.totals.expense_cents',600)->assertJsonCount(12,'data.income_expense_series')->assertJsonPath('data.income_expense_period.end_date','2027-01-09');
        $this->getJson('/api/v1/reports?year=2026&month=10&range=three_months')->assertOk()->assertJsonPath('data.period.start_date','2026-08-10')->assertJsonPath('data.totals.expense_cents',400);
    }
    public function test_budgets_and_unbudgeted_modal_use_same_cycle_and_survive_future_rescheduling(): void {
        $u=$this->login();$this->configure(10);$cat=$u->categories()->create(['name'=>'Mercado','type'=>'expense','icon'=>'cart','color'=>'#1564FF','is_active'=>true]);
        $created=$this->postJson('/api/v1/budgets',['category_id'=>$cat->id,'year'=>2026,'month'=>10,'limit_cents'=>1000])->assertCreated()->json('data');
        $this->assertNotNull($created['financial_cycle_id']);
        $this->entry($u,'2026-11-09',300,'expense',$cat);$this->entry($u,'2026-11-10',900,'expense',$cat);$this->entry($u,'2026-11-01',700);
        $this->getJson('/api/v1/budgets?year=2026&month=10')->assertOk()->assertJsonPath('meta.summary.spent_cents',300)->assertJsonPath('meta.summary.unbudgeted_expense_cents',700);
        $this->getJson('/api/v1/transactions?year=2026&month=10&unbudgeted=1')->assertOk()->assertJsonPath('meta.total',1)->assertJsonPath('meta.total_amount_cents',700);
        $future=$this->postJson('/api/v1/budgets',['category_id'=>$cat->id,'year'=>2026,'month'=>11,'limit_cents'=>2000])->assertCreated()->json('data');
        $this->configure(15,1);
        $this->getJson('/api/v1/budgets/'.$future['id'])->assertOk()->assertJsonPath('data.financial_cycle_id',$future['financial_cycle_id'])->assertJsonPath('data.spent_cents',900);
    }
    public function test_saved_transaction_returns_correct_cycle_before_cut(): void {
        $u=$this->login();$this->configure(10);$cat=$u->categories()->create(['name'=>'Mercado','type'=>'expense','icon'=>'cart','color'=>'#1564FF','is_active'=>true]);
        $this->postJson('/api/v1/transactions',['category_id'=>$cat->id,'type'=>'expense','amount_cents'=>100,'description'=>'Antes do corte','transaction_date'=>'2026-11-05'])->assertCreated()->assertJsonPath('data.cycle_key','2026-10');
    }
    public function test_configuration_is_global_but_financial_data_is_not_shared(): void {
        $this->login();$a=$this->configure(17);$u=User::factory()->create();$this->actingAs($u);
        $this->getJson('/api/v1/financial-cycle')->assertOk()->assertJsonPath('data.current.cut_day',17);
        $this->getJson('/api/v1/dashboard')->assertOk()->assertJsonPath('data.totals.expense_cents',0);
    }
    private function assertContiguous(): void {
        $all=DB::table('financial_cycles')->orderBy('start_date')->get();
        foreach ($all as $i=>$p) { $this->assertLessThanOrEqual($p->end_date,$p->start_date); if ($i) $this->assertSame(Date::parse($all[$i-1]->end_date)->addDay()->toDateString(),$p->start_date); }
    }
}
