<?php
namespace Tests\Feature;
use App\Models\User;
use App\Services\BudgetWriter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;
class BudgetCopyTest extends TestCase
{
    use RefreshDatabase;
    private const API='/api/v1/budgets/copy';
    private function source(int $count=3): array {
        $u=User::factory()->create();$this->actingAs($u);$cats=[];$rows=[];
        for($i=1;$i<=$count;$i++){$c=$u->categories()->create(['name'=>'Categoria '.$i,'type'=>'expense','icon'=>'cart','color'=>'#1564FF','is_active'=>true]);$cats[]=$c;$rows[]=$u->monthlyBudgets()->create(['category_id'=>$c->id,'year'=>2026,'month'=>10,'limit_cents'=>$i*1000]);}
        return [$u,$cats,$rows];
    }
    private function payload(array $extra=[]): array {return array_replace(['source_year'=>2026,'source_month'=>10,'year'=>2026,'month'=>11],$extra);}
    private function entry($u,$c,string $date,int $amount):void {$u->transactions()->create(['category_id'=>$c->id,'type'=>'expense','description'=>'Teste','transaction_date'=>$date,'amount_cents'=>$amount]);}
    public function test_requires_authentication():void {$this->postJson(self::API,$this->payload())->assertUnauthorized();}
    public function test_all_pages_are_copied_and_source_and_transactions_preserved():void {
        [$u,$cats,$rows]=$this->source(30);$this->entry($u,$cats[0],'2026-10-20',999);$this->entry($u,$cats[0],'2026-11-20',200);
        $this->getJson('/api/v1/budgets?year=2026&month=10')->assertJsonCount(25,'data')->assertJsonPath('meta.total',30);
        $this->postJson(self::API,$this->payload())->assertCreated()->assertJsonPath('data.copied_count',30)->assertJsonPath('data.limit_cents',465000)->assertJsonPath('data.year',2026)->assertJsonPath('data.month',11);
        foreach($rows as $row){$this->assertSame(10,$row->fresh()->month);$this->assertDatabaseHas('monthly_budgets',['user_id'=>$u->id,'category_id'=>$row->category_id,'month'=>11,'limit_cents'=>$row->limit_cents]);}
        $this->assertDatabaseCount('monthly_budgets',60);$this->assertDatabaseCount('transactions',2);
        $target=$u->monthlyBudgets()->where('category_id',$cats[0]->id)->where('month',11)->first();$this->getJson('/api/v1/budgets/'.$target->id)->assertJsonPath('data.spent_cents',200);
    }
    public function test_one_conflict_aborts_the_whole_copy_without_overwriting():void {
        [$u,$cats]=$this->source();$target=$u->monthlyBudgets()->create(['category_id'=>$cats[1]->id,'year'=>2026,'month'=>11,'limit_cents'=>777]);
        $this->postJson(self::API,$this->payload())->assertUnprocessable()->assertJsonValidationErrors('month');$this->assertSame(777,$target->fresh()->limit_cents);$this->assertDatabaseCount('monthly_budgets',4);$this->assertSame(1,$u->monthlyBudgets()->where('month',11)->count());
    }
    public function test_same_cycle_empty_source_and_repeat_are_rejected():void {
        $this->source();$this->postJson(self::API,$this->payload(['month'=>10]))->assertUnprocessable();$this->postJson(self::API,$this->payload(['source_month'=>9]))->assertUnprocessable();
        $this->postJson(self::API,$this->payload())->assertCreated();$this->postJson(self::API,$this->payload())->assertUnprocessable();$this->assertDatabaseCount('monthly_budgets',6);
    }
    public function test_only_owned_and_non_deleted_source_budgets_are_copied():void {
        [$u,,$rows]=$this->source();$this->actingAs(User::factory()->create());$this->postJson(self::API,$this->payload())->assertUnprocessable();
        $this->actingAs($u);$rows[0]->delete();$this->postJson(self::API,$this->payload())->assertCreated()->assertJsonPath('data.copied_count',2)->assertJsonPath('data.limit_cents',5000);$this->assertDatabaseMissing('monthly_budgets',['user_id'=>$u->id,'category_id'=>$rows[0]->category_id,'month'=>11]);
    }
    public function test_inactive_category_aborts_everything():void {
        [,$cats]=$this->source();$cats[1]->update(['is_active'=>false]);$this->postJson(self::API,$this->payload())->assertUnprocessable();$this->assertDatabaseCount('monthly_budgets',3);
    }
    public function test_removed_target_is_restored_and_other_categories_created():void {
        [$u,$cats]=$this->source(2);$target=$u->monthlyBudgets()->create(['category_id'=>$cats[0]->id,'year'=>2026,'month'=>11,'limit_cents'=>777]);$target->delete();
        $this->postJson(self::API,$this->payload())->assertCreated()->assertJsonPath('data.copied_count',2)->assertJsonPath('data.limit_cents',3000);$this->assertSame(1000,$target->fresh()->limit_cents);$this->assertNull($target->fresh()->deleted_at);$this->assertDatabaseCount('monthly_budgets',4);
    }
    public function test_failure_after_first_save_rolls_back_all_writes():void {
        $this->source();$calls=0;$writer=\Mockery::mock(BudgetWriter::class)->makePartial();$writer->shouldReceive('save')->andReturnUsing(function($u,$data)use(&$calls){if(++$calls===2)throw ValidationException::withMessages(['month'=>'Falha de teste.']);return(new BudgetWriter)->save($u,$data);});$this->app->instance(BudgetWriter::class,$writer);
        $this->postJson(self::API,$this->payload())->assertUnprocessable();$this->assertDatabaseCount('monthly_budgets',3);
    }
    public function test_periods_and_controlled_fields_are_validated():void {
        $this->source();foreach([['source_year'=>1899],['source_month'=>13],['year'=>2101],['month'=>0],['source_year'=>null],['source_month'=>null]]as $extra)$this->postJson(self::API,$this->payload($extra))->assertUnprocessable();
        foreach(['category_id','limit_cents','user_id','financial_cycle_id','spent_cents']as $key)$this->postJson(self::API,$this->payload([$key=>1]))->assertUnprocessable()->assertJsonValidationErrors($key);$this->assertDatabaseCount('monthly_budgets',3);
    }
    public function test_financial_cycle_dates_are_used_for_destination_spending():void {
        DB::table('financial_cycle_settings')->where('id',1)->update(['initial_cut_day'=>10,'cut_day'=>10]);[$u,$cats,$rows]=$this->source(2);$this->entry($u,$cats[0],'2026-11-09',999);$this->entry($u,$cats[0],'2026-11-10',200);
        $this->postJson(self::API,$this->payload())->assertCreated()->assertJsonPath('data.period.start_date','2026-11-10');$target=$u->monthlyBudgets()->where('category_id',$cats[0]->id)->where('month',11)->first();$this->getJson('/api/v1/budgets/'.$target->id)->assertJsonPath('data.spent_cents',200);$this->getJson('/api/v1/budgets/'.$rows[0]->id)->assertJsonPath('data.spent_cents',999);
    }
}
