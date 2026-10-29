<?php
namespace Tests\Feature;

use App\Models\User;
use App\Services\FinancialCycles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryHistoryNavigationTest extends TestCase
{
    use RefreshDatabase;
    protected bool $useCalendarCycleFixture = false;

    public function test_category_history_matches_report_ranges_and_custom_cut(): void
    {
        app(FinancialCycles::class)->configure(10, 0);
        $user = User::factory()->create(); $other = User::factory()->create();
        $category = $user->categories()->create(['name'=>'Moradia','type'=>'expense','icon'=>'house','color'=>'#1564FF','is_active'=>false]);
        $second = $user->categories()->create(['name'=>'Mercado','type'=>'expense','icon'=>'cart','color'=>'#1564FF','is_active'=>true]);
        $foreign = $other->categories()->create(['name'=>'Alheia','type'=>'expense','icon'=>'cart','color'=>'#1564FF','is_active'=>true]);
        foreach (['2026-01-09','2026-01-10','2026-08-09','2026-08-10','2026-09-10','2026-10-09','2026-10-10','2026-11-09','2026-11-10'] as $index=>$date) {
            $user->transactions()->create(['category_id'=>$category->id,'type'=>'expense','amount_cents'=>1000+$index,'description'=>'Casa '.$index,'transaction_date'=>$date]);
        }
        $user->transactions()->create(['category_id'=>$second->id,'type'=>'expense','amount_cents'=>999,'description'=>'Outra categoria','transaction_date'=>'2026-10-20']);
        $other->transactions()->create(['category_id'=>$foreign->id,'type'=>'expense','amount_cents'=>999,'description'=>'Outro usuário','transaction_date'=>'2026-10-20']);
        $removed = $user->transactions()->create(['category_id'=>$category->id,'type'=>'expense','amount_cents'=>999,'description'=>'Excluída','transaction_date'=>'2026-10-20']);$removed->delete();
        $this->actingAs($user);
        foreach (['month'=>['2026-10-10',2],'three_months'=>['2026-08-10',5],'year'=>['2026-01-10',7]] as $range=>[$start,$count]) {
            $query=http_build_query(['year'=>2026,'month'=>10,'range'=>$range,'type'=>'expense','category_id'=>$category->id,'per_page'=>100]);
            $response=$this->getJson('/api/v1/transactions?'.$query)->assertOk()->assertJsonCount($count,'data')
                ->assertJsonPath('meta.period.start_date',$start)->assertJsonPath('meta.period.end_date','2026-11-09')
                ->assertJsonPath('meta.period.range',$range);
            $total=array_sum(array_column($response->json('data'),'amount_cents'));
            $report=$this->getJson('/api/v1/reports?year=2026&month=10&range='.$range)->assertOk();
            $row=collect($report->json('data.by_category'))->firstWhere('category.id',$category->id);
            $this->assertSame($total,$row['amount_cents']);
        }
        $this->getJson('/api/v1/transactions?year=2026&month=10&category_id='.$foreign->id)->assertUnprocessable();
        $paged=$this->getJson('/api/v1/transactions?year=2026&month=10&range=three_months&type=expense&category_id='.$category->id.'&per_page=2')->assertOk();
        $this->assertStringContainsString('range=three_months',$paged->json('links.next'));
        $this->assertStringContainsString('category_id='.$category->id,$paged->json('links.next'));
    }

    public function test_invalid_ranges_and_multi_cycle_unbudgeted_queries_are_rejected(): void
    {
        $this->actingAs(User::factory()->create());
        $this->getJson('/api/v1/transactions?range=bad')->assertUnprocessable();
        $this->getJson('/api/v1/transactions?range=year&unbudgeted=1')->assertUnprocessable();
        $this->getJson('/api/v1/transactions?range=three_months&unbudgeted=1')->assertUnprocessable();
    }
}
