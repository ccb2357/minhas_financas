<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class GoalTest extends TestCase
{
    use RefreshDatabase;
    private User $owner;
    protected function setUp(): void { parent::setUp(); $this->owner = User::factory()->create(); }
    private function login(): void { $this->actingAs($this->owner); }
    private function payload(array $data = []): array { return array_merge(['name' => 'Viagem', 'icon' => 'airplane', 'target_cents' => 100000, 'deadline' => null, 'request_key' => (string) Str::uuid()], $data); }
    private function create(array $data = []): array { return $this->postJson('/api/v1/goals', $this->payload($data))->assertCreated()->json('data'); }
    private function movement(array $goal, int $cents, string $type = 'contribution', array $extra = []): array
    {
        return $this->postJson('/api/v1/goals/'.$goal['id'].'/movements', array_merge(['version' => $goal['version'], 'type' => $type, 'amount_cents' => $cents, 'movement_date' => '2026-10-26', 'notes' => null, 'request_key' => (string) Str::uuid()], $extra))->assertCreated()->json('data');
    }
    private function path(array $goal): string { return '/api/v1/goals/'.$goal['id']; }
    private function metadata(array $goal, array $extra = []): array { return array_merge(['name' => $goal['name'], 'icon' => $goal['icon'], 'target_cents' => $goal['target_cents'], 'deadline' => $goal['deadline'], 'version' => $goal['version']], $extra); }

    public function test_all_goal_routes_require_authentication(): void
    {
        foreach ([['GET','/goals'],['POST','/goals'],['GET','/goals/1'],['PATCH','/goals/1'],['DELETE','/goals/1'],['POST','/goals/1/state'],['GET','/goals/1/movements'],['POST','/goals/1/movements'],['PATCH','/goals/1/movements/1'],['DELETE','/goals/1/movements/1']] as [$method,$path]) $this->json($method,'/api/v1'.$path)->assertUnauthorized();
    }
    public function test_goal_and_movements_are_owned_and_do_not_require_a_financial_cycle(): void
    {
        $this->login(); DB::table('financial_cycle_settings')->delete();
        $goal = $this->create(); $goal = $this->movement($goal, 25000);
        $this->getJson('/api/v1/goals')->assertOk()->assertJsonPath('meta.total',1)->assertJsonPath('data.0.saved_cents',25000);
        $this->getJson($this->path($goal).'/movements')->assertOk()->assertJsonPath('meta.total',1);
        $this->assertDatabaseCount('financial_cycles',0); $this->assertDatabaseCount('transactions',0); $this->assertDatabaseCount('monthly_budgets',0);
        $this->actingAs(User::factory()->create());
        $this->getJson('/api/v1/goals')->assertOk()->assertJsonPath('meta.total',0);
        foreach ([['GET',$this->path($goal)],['PATCH',$this->path($goal)],['DELETE',$this->path($goal)],['POST',$this->path($goal).'/state'],['GET',$this->path($goal).'/movements'],['POST',$this->path($goal).'/movements']] as [$method,$path]) {
            $body = $method === 'PATCH' ? $this->metadata($goal) : ($method === 'POST' && str_ends_with($path,'/movements') ? ['version'=>$goal['version'],'type'=>'contribution','amount_cents'=>100,'movement_date'=>'2026-10-26','request_key'=>(string)Str::uuid()] : ['version'=>$goal['version'],'action'=>'archive']);
            $this->json($method,$path,$body)->assertNotFound();
        }
    }
    public function test_contributions_and_withdrawals_never_change_cycle_totals_and_persist_between_cycles(): void
    {
        $this->login();$before=$this->getJson('/api/v1/dashboard?year=2026&month=10')->assertOk()->json('data.totals');
        $goal=$this->create();$goal=$this->movement($goal,60000);$goal=$this->movement($goal,10000,'withdrawal');
        $this->assertSame(50000,$goal['saved_cents']);$this->assertEquals(50,$goal['progress_percent']);
        $this->getJson('/api/v1/dashboard?year=2026&month=10')->assertOk()->assertJsonPath('data.totals',$before);
        $this->assertDatabaseCount('transactions',0);$this->assertDatabaseCount('monthly_budgets',0);
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2027-01-15'));
        try{$this->getJson($this->path($goal))->assertOk()->assertJsonPath('data.saved_cents',50000);}finally{CarbonImmutable::setTestNow();}
    }
    public function test_overfunding_caps_bar_without_discarding_money_and_completion_is_explicit(): void
    {
        $this->login();$goal=$this->create();
        $this->postJson($this->path($goal).'/state',['version'=>1,'action'=>'complete'])->assertUnprocessable();
        $goal=$this->movement($goal,125000);$this->assertSame(125000,$goal['saved_cents']);$this->assertEquals(100,$goal['progress_percent']);$this->assertSame('active',$goal['status']);$this->assertTrue($goal['target_reached']);
        $done=$this->postJson($this->path($goal).'/state',['version'=>$goal['version'],'action'=>'complete'])->assertOk()->assertJsonPath('data.saved_cents',125000)->assertJsonPath('data.status','archived')->json('data');
        $this->assertNotNull($done['completed_at']);$this->assertNotNull($done['archived_at']);$this->assertDatabaseCount('goal_movements',1);$this->assertDatabaseCount('transactions',0);
    }
    public function test_archived_goals_are_read_only_and_can_be_reopened(): void
    {
        $this->login();$goal=$this->movement($this->create(),50000);
        $goal=$this->postJson($this->path($goal).'/state',['version'=>$goal['version'],'action'=>'archive'])->assertOk()->json('data');
        $this->patchJson($this->path($goal),$this->metadata($goal))->assertConflict();
        $this->postJson($this->path($goal).'/movements',['version'=>$goal['version'],'type'=>'contribution','amount_cents'=>1,'movement_date'=>'2026-10-26','request_key'=>(string)Str::uuid()])->assertConflict();
        $entry=DB::table('goal_movements')->first();
        $this->deleteJson($this->path($goal).'/movements/'.$entry->id,['version'=>$goal['version']])->assertConflict();
        $this->getJson('/api/v1/goals?status=active')->assertJsonPath('meta.total',0);
        $this->getJson('/api/v1/goals?status=archived')->assertJsonPath('meta.total',1);
        $goal=$this->postJson($this->path($goal).'/state',['version'=>$goal['version'],'action'=>'reopen'])->assertOk()->assertJsonPath('data.saved_cents',50000)->json('data');
        $this->movement($goal,10000);$this->assertDatabaseCount('goal_movements',2);
    }
    public function test_withdrawal_editing_and_deletion_cannot_make_balance_negative(): void
    {
        $this->login();$goal=$this->movement($this->create(),60000);$deposit=DB::table('goal_movements')->first();$goal=$this->movement($goal,40000,'withdrawal');
        $base=['version'=>$goal['version'],'movement_date'=>'2026-10-26','type'=>'contribution','amount_cents'=>30000];
        $this->patchJson($this->path($goal).'/movements/'.$deposit->id,$base)->assertUnprocessable();
        $this->deleteJson($this->path($goal).'/movements/'.$deposit->id,['version'=>$goal['version']])->assertUnprocessable();
        $this->postJson($this->path($goal).'/movements',['version'=>$goal['version'],'type'=>'withdrawal','amount_cents'=>20001,'movement_date'=>'2026-10-26','request_key'=>(string)Str::uuid()])->assertUnprocessable();
        $goal=$this->patchJson($this->path($goal).'/movements/'.$deposit->id,[...$base,'amount_cents'=>50000])->assertOk()->assertJsonPath('data.saved_cents',10000)->json('data');
        $withdrawal=DB::table('goal_movements')->where('type','withdrawal')->first();
        $goal=$this->deleteJson($this->path($goal).'/movements/'.$withdrawal->id,['version'=>$goal['version']])->assertOk()->assertJsonPath('data.saved_cents',50000)->json('data');
        $this->deleteJson($this->path($goal).'/movements/'.$deposit->id,['version'=>$goal['version']])->assertOk()->assertJsonPath('data.saved_cents',0);
    }
    public function test_retries_are_idempotent_and_different_payloads_cannot_reuse_a_request_key(): void
    {
        $this->login();$payload=$this->payload();$goal=$this->postJson('/api/v1/goals',$payload)->assertCreated()->json('data');
        $this->postJson('/api/v1/goals',$payload)->assertCreated()->assertJsonPath('data.id',$goal['id']);$this->assertDatabaseCount('goals',1);
        $this->postJson('/api/v1/goals',[...$payload,'name'=>'Outra'])->assertConflict();
        $movement=['version'=>1,'type'=>'contribution','amount_cents'=>25000,'movement_date'=>'2026-10-26','notes'=>'Inicial','request_key'=>(string)Str::uuid()];
        $this->postJson($this->path($goal).'/movements',$movement)->assertCreated();
        $this->postJson($this->path($goal).'/movements',$movement)->assertCreated()->assertJsonPath('data.saved_cents',25000);
        $this->postJson($this->path($goal).'/movements',[...$movement,'amount_cents'=>50000])->assertConflict();$this->assertDatabaseCount('goal_movements',1);
    }
    public function test_stale_versions_protect_metadata_movements_and_archiving(): void
    {
        $this->login();$goal=$this->create();$current=$this->movement($goal,1000);
        $this->patchJson($this->path($goal),$this->metadata($goal))->assertConflict();
        $this->postJson($this->path($goal).'/state',['version'=>1,'action'=>'archive'])->assertConflict();
        $this->postJson($this->path($goal).'/movements',['version'=>1,'type'=>'withdrawal','amount_cents'=>100,'movement_date'=>'2026-10-26','request_key'=>(string)Str::uuid()])->assertConflict();
        $this->getJson($this->path($goal))->assertJsonPath('data.saved_cents',1000)->assertJsonPath('data.status','active');
    }
    public function test_deletion_requires_no_movements_even_when_balance_is_zero(): void
    {
        $this->login();$empty=$this->create();$this->deleteJson($this->path($empty),['version'=>1])->assertNoContent();
        $goal=$this->movement($this->create(),500);$goal=$this->movement($goal,500,'withdrawal');
        $this->deleteJson($this->path($goal),['version'=>$goal['version']])->assertUnprocessable();$this->assertDatabaseCount('goals',1);$this->assertDatabaseCount('goal_movements',2);
    }
    public function test_money_metadata_dates_and_authoritative_fields_are_validated(): void
    {
        $this->login();foreach([0,-1,1.5,'100',100000000000] as $invalid)$this->postJson('/api/v1/goals',$this->payload(['target_cents'=>$invalid]))->assertUnprocessable();
        foreach([['name'=>'   '],['icon'=>'<script>'],['deadline'=>'2026-02-30'],['saved_cents'=>900],['user_id'=>999],['status'=>'archived']] as $invalid)$this->postJson('/api/v1/goals',$this->payload($invalid))->assertUnprocessable();
        $goal=$this->create(['deadline'=>'2027-06-30']);$goal=$this->patchJson($this->path($goal),$this->metadata($goal,['deadline'=>null,'name'=>'Reserva']))->assertOk()->assertJsonPath('data.deadline',null)->json('data');
        $this->movement($goal,99999999999);$current=$this->getJson($this->path($goal))->json('data');
        $this->postJson($this->path($goal).'/movements',['version'=>$current['version'],'type'=>'contribution','amount_cents'=>1,'movement_date'=>'2026-10-26','request_key'=>(string)Str::uuid()])->assertUnprocessable();
    }
    public function test_movement_id_must_belong_to_the_specified_goal(): void
    {
        $this->login();$a=$this->movement($this->create(),100);$b=$this->movement($this->create(),200);$entry=DB::table('goal_movements')->where('goal_id',$a['id'])->first();
        $this->deleteJson($this->path($b).'/movements/'.$entry->id,['version'=>$b['version']])->assertNotFound();
        $this->assertDatabaseCount('goal_movements',2);$this->getJson($this->path($b))->assertJsonPath('data.saved_cents',200);
    }
    public function test_goal_and_movement_lists_are_paginated(): void
    {
        $this->login();$goal=$this->create();for($i=0;$i<26;$i++)$goal=$this->movement($goal,100);
        $this->getJson($this->path($goal).'/movements')->assertJsonCount(25,'data')->assertJsonPath('meta.total',26);
        $this->getJson($this->path($goal).'/movements?page=2')->assertJsonCount(1,'data');
        for($i=0;$i<25;$i++)$this->create();
        $this->getJson('/api/v1/goals')->assertJsonCount(25,'data')->assertJsonPath('meta.total',26);
        $this->getJson('/api/v1/goals?page=2')->assertJsonCount(1,'data');
    }
}
