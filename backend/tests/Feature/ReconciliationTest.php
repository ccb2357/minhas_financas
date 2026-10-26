<?php
namespace Tests\Feature;
use App\Models\User;
use App\Models\BankOperation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Client\ConnectionException;
use Tests\TestCase;

class ReconciliationTest extends TestCase
{
    use RefreshDatabase;
    private User $owner;
    private string $file;
    private array $accounts;
    private int $tokens = 0;
    protected function setUp(): void
    {
        parent::setUp();$this->owner=User::factory()->create();
        $this->accounts=[['name'=>'Nubank','account_id'=>'11111111-1111-4111-8111-111111111111'],['name'=>'Digio','account_id'=>'22222222-2222-4222-8222-222222222222'],['name'=>'Santander','account_id'=>'33333333-3333-4333-8333-333333333333']];
        $this->file=tempnam(sys_get_temp_dir(),'pluggy-test-');file_put_contents($this->file,json_encode(['accounts'=>$this->accounts]));
        config(['pluggy.accounts_file'=>$this->file,'pluggy.base_url'=>'https://api.pluggy.ai','pluggy.client_id'=>'test-client','pluggy.client_secret'=>'test-secret','pluggy.user_id'=>$this->owner->id]);
        Http::preventStrayRequests();
    }
    protected function tearDown(): void { if(is_file($this->file))unlink($this->file);parent::tearDown(); }
    private function login(): void { $this->actingAs($this->owner); }
    private function operation(int $n=1,int $bank=0,string $type='DEBIT',float|int $amount=120.80): array
    {
        return ['id'=>sprintf('00000000-0000-4000-8000-%012d',$n),'accountId'=>$this->accounts[$bank]['account_id'],'description'=>'Operação '.$n,'amount'=>$amount,'type'=>$type,'date'=>'2026-11-05T03:00:00.000Z','currencyCode'=>'BRL','status'=>'POSTED'];
    }
    private function fake(array $rows=[],bool $paged=false): void
    {
        Http::swap(new \Illuminate\Http\Client\Factory());Http::preventStrayRequests();
        $this->tokens=0;
        Http::fake(function($request)use($rows,$paged){
            if(str_ends_with($request->url(),'/auth'))return Http::response(['apiKey'=>'token-'.++$this->tokens]);
            $this->assertSame('token-'.$this->tokens,$request->header('X-API-KEY')[0]??null);
            $this->assertFalse($request->hasHeader('Authorization'));
            parse_str(parse_url($request->url(),PHP_URL_QUERY),$q);$account=$q['accountId'];
            $data=array_values(array_filter($rows,fn($r)=>$r['accountId']===$account));
            $next=null;
            if($paged&&$account===$this->accounts[0]['account_id']){
                if(!isset($q['after'])){$data=array_slice($data,0,1);$next='?accountId='.$account.'&after=A%2FB%3D';}
                else{$this->assertSame('A/B=',$q['after']);$data=array_slice($data,1);}
            }
            return Http::response(['results'=>$data,'next'=>$next]);
        });
    }
    private function sync(): \Illuminate\Testing\TestResponse { return $this->postJson('/api/v1/reconciliation/sync'); }
    private function draft(string $type='expense'): array
    {
        $cat=$this->owner->categories()->firstOrCreate(['type'=>$type,'name'=>'Categoria '.$type],['icon'=>'cart','color'=>'#1564FF','is_active'=>true]);
        return ['category_id'=>$cat->id,'type'=>$type,'amount_cents'=>12080,'description'=>'Operação conferida','transaction_date'=>'2026-11-05','notes'=>null];
    }
    public function test_all_routes_require_authentication(): void
    {
        $this->getJson('/api/v1/reconciliation')->assertUnauthorized();$this->sync()->assertUnauthorized();
        $this->postJson('/api/v1/reconciliation/1/ignore')->assertUnauthorized();$this->postJson('/api/v1/reconciliation/1/add',[])->assertUnauthorized();Http::assertNothingSent();
    }
    public function test_fresh_token_precedes_each_page_and_all_three_accounts_are_queried(): void
    {
        $this->login();$this->fake([$this->operation(1),$this->operation(2),$this->operation(3,1),$this->operation(4,2)],true);
        $this->sync()->assertOk()->assertJsonPath('data.complete',true)->assertJsonPath('data.fetched',4);
        $this->assertSame(4,$this->tokens);Http::assertSentCount(8);
        $requests=Http::recorded()->pluck(0)->values();
        for($i=0;$i<8;$i+=2){$this->assertSame('POST',$requests[$i]->method());$this->assertSame('https://api.pluggy.ai/auth',$requests[$i]->url());$this->assertSame('test-client',$requests[$i]['clientId']);$this->assertSame('test-secret',$requests[$i]['clientSecret']);$this->assertSame('GET',$requests[$i+1]->method());}
        $this->assertStringContainsString('after=A%2FB%3D',$requests[3]->url());
        $this->getJson('/api/v1/reconciliation')->assertOk()->assertJsonPath('meta.total',4);Http::assertSentCount(8);
    }
    public function test_amount_sign_never_overrides_type_and_pending_future_payments_are_listed(): void
    {
        $this->login();$rows=[$this->operation(1,0,'DEBIT',-120.80),$this->operation(2,1,'DEBIT',120.80),$this->operation(3,2,'CREDIT',-120.80),$this->operation(4,0,'CREDIT',120.80)];
        $rows[1]['date']='2027-09-15T03:00:00Z';$rows[1]['status']='PENDING';$rows[1]['description']='Pagamento de fatura';$rows[1]['categoryId']='05100000';
        $this->fake($rows);$this->sync()->assertOk()->assertJsonPath('data.complete',true);
        foreach($rows as $row)$this->assertDatabaseHas('bank_operations',['external_transaction_id'=>$row['id'],'amount_cents'=>12080,'type'=>$row['type']==='DEBIT'?'expense':'income','review_status'=>'pending']);
        $r=$this->getJson('/api/v1/reconciliation')->assertOk()->assertJsonPath('meta.total',2)->json('data');$this->assertSame('2027-09-15',$r[0]['transaction_date']);$this->assertSame('PENDING',$r[0]['source_status']);
        $this->assertSame(['expense'], array_values(array_unique(array_column($r, 'type'))));
        $this->assertDatabaseCount('transactions',0);
    }
    public function test_repeat_sync_updates_pending_without_duplicate_rows(): void
    {
        $this->login();$this->fake([$this->operation()]);$this->sync()->assertOk();
        $r=$this->operation();$r['amount']=200.01;$r['description']='Atualizada';$this->fake([$r]);$this->sync()->assertOk();
        $this->assertDatabaseCount('bank_operations',1);$this->assertDatabaseHas('bank_operations',['amount_cents'=>20001,'description'=>'Atualizada']);$this->assertDatabaseCount('transactions',0);
    }
    public function test_expense_filter_applies_before_pagination_including_existing_rows(): void
    {
        $this->login();
        $rows=[];
        for($i=1;$i<=26;$i++)$rows[]=$this->operation($i,0,'DEBIT',120.80);
        for($i=27;$i<=29;$i++)$rows[]=$this->operation($i,1,'CREDIT',-120.80);
        $this->fake($rows);$this->sync()->assertOk();
        $this->assertDatabaseCount('bank_operations',29);
        $first=$this->getJson('/api/v1/reconciliation')->assertOk()->assertJsonPath('meta.total',26)->assertJsonPath('meta.last_page',2)->assertJsonCount(25,'data')->json('data');
        $second=$this->getJson('/api/v1/reconciliation?page=2')->assertOk()->assertJsonPath('meta.total',26)->assertJsonCount(1,'data')->json('data');
        $this->assertSame(['expense'],array_values(array_unique(array_column([...$first,...$second],'type'))));
        $this->assertDatabaseCount('transactions',0);
    }
    public function test_ignore_is_persistent_idempotent_and_never_changes_financial_totals(): void
    {
        $this->login();$this->fake([$this->operation()]);$this->sync()->assertOk();$id=BankOperation::first()->id;
        $this->postJson("/api/v1/reconciliation/$id/ignore")->assertNoContent();$this->postJson("/api/v1/reconciliation/$id/ignore")->assertNoContent();
        $this->sync()->assertOk();$this->getJson('/api/v1/reconciliation')->assertOk()->assertJsonPath('meta.total',0);$this->assertDatabaseHas('bank_operations',['id'=>$id,'review_status'=>'ignored']);$this->assertDatabaseCount('transactions',0);
        foreach(['dashboard','reports','budgets']as$path){$r=$this->getJson('/api/v1/'.$path)->assertOk();if($path!=='budgets')$r->assertJsonPath('data.totals.expense_cents',0);else$r->assertJsonPath('meta.summary.total_expense_cents',0);}
    }
    public function test_add_is_atomic_idempotent_and_stores_external_id_and_cycle(): void
    {
        $this->login();DB::table('financial_cycle_settings')->where('id',1)->update(['cut_day'=>10,'initial_cut_day'=>10]);
        $this->fake([$this->operation()]);$this->sync()->assertOk();$id=BankOperation::first()->id;$draft=$this->draft();
        $first=$this->postJson("/api/v1/reconciliation/$id/add",$draft)->assertCreated()->assertJsonPath('data.cycle_key','2026-10')->json('data');
        $this->postJson("/api/v1/reconciliation/$id/add",$draft)->assertCreated()->assertJsonPath('data.id',$first['id']);
        $this->assertDatabaseCount('transactions',1);$this->assertDatabaseHas('transactions',['external_transaction_id'=>$this->operation()['id'],'amount_cents'=>12080]);
        $this->assertDatabaseHas('bank_operations',['id'=>$id,'review_status'=>'added','transaction_id'=>$first['id']]);$this->getJson('/api/v1/reconciliation')->assertOk()->assertJsonPath('meta.total',0);
        $this->getJson('/api/v1/dashboard?year=2026&month=10')->assertOk()->assertJsonPath('data.totals.expense_cents',12080);
    }
    public function test_ignore_and_add_conflict_without_overwriting_the_previous_decision(): void
    {
        $this->login();$this->fake([$this->operation(1),$this->operation(2)]);$this->sync()->assertOk();$ids=BankOperation::orderBy('id')->pluck('id');
        $this->postJson('/api/v1/reconciliation/'.$ids[0].'/ignore')->assertNoContent();$this->postJson('/api/v1/reconciliation/'.$ids[0].'/add',$this->draft())->assertConflict();
        $this->postJson('/api/v1/reconciliation/'.$ids[1].'/add',$this->draft())->assertCreated();$this->postJson('/api/v1/reconciliation/'.$ids[1].'/ignore')->assertConflict();$this->assertDatabaseCount('transactions',1);
    }
    public function test_invalid_category_rolls_back_and_client_cannot_forge_external_ids(): void
    {
        $this->login();$this->fake([$this->operation()]);$this->sync()->assertOk();$id=BankOperation::first()->id;$draft=$this->draft();
        $other=User::factory()->create();$cat=$other->categories()->create(['type'=>'expense','name'=>'Alheia','icon'=>'cart','color'=>'#1564FF','is_active'=>true]);
        $this->postJson("/api/v1/reconciliation/$id/add",[...$draft,'category_id'=>$cat->id])->assertUnprocessable();$this->assertDatabaseCount('transactions',0);$this->assertDatabaseHas('bank_operations',['id'=>$id,'review_status'=>'pending']);
        $this->postJson("/api/v1/reconciliation/$id/add",[...$draft,'external_transaction_id'=>'fake'])->assertUnprocessable();$this->postJson('/api/v1/transactions',[...$draft,'external_transaction_id'=>'fake'])->assertUnprocessable();
    }
    public function test_deleting_an_imported_transaction_does_not_reimport_it(): void
    {
        $this->login();$this->fake([$this->operation()]);$this->sync()->assertOk();$id=BankOperation::first()->id;
        $tx=$this->postJson("/api/v1/reconciliation/$id/add",$this->draft())->assertCreated()->json('data.id');$this->deleteJson('/api/v1/transactions/'.$tx)->assertNoContent();
        $this->sync()->assertOk();$this->getJson('/api/v1/reconciliation')->assertOk()->assertJsonPath('meta.total',0);$this->postJson("/api/v1/reconciliation/$id/add",$this->draft())->assertConflict();$this->assertDatabaseCount('transactions',1);
    }
    public function test_user_and_account_isolation(): void
    {
        $this->login();$other=User::factory()->create();$op=BankOperation::create(['user_id'=>$other->id,...app(\App\Services\BankOperationNormalizer::class)->normalize($this->operation(),$this->accounts[0])]);
        $this->getJson('/api/v1/reconciliation')->assertOk()->assertJsonPath('meta.total',0);$this->postJson('/api/v1/reconciliation/'.$op->id.'/ignore')->assertNotFound();
        $this->actingAs($other);$this->getJson('/api/v1/reconciliation')->assertForbidden();$this->sync()->assertForbidden();Http::assertNothingSent();
    }
    public function test_missing_or_invalid_configuration_never_calls_pluggy(): void
    {
        $this->login();file_put_contents($this->file,'{');$this->sync()->assertUnprocessable();file_put_contents($this->file,json_encode(['accounts'=>[['name'=>'Nubank','account_id'=>'wrong']]]));$this->sync()->assertUnprocessable();unlink($this->file);$this->getJson('/api/v1/reconciliation')->assertUnprocessable();Http::assertNothingSent();
    }
    public function test_partial_failure_preserves_successful_accounts_and_releases_lock_without_leaking_tokens(): void
    {
        $this->login();Http::fake(function($r){if(str_ends_with($r->url(),'/auth'))return Http::response(['apiKey'=>'PRIVATE-TOKEN']);if(str_contains($r->url(),$this->accounts[0]['account_id']))return Http::response(['results'=>[$this->operation()],'next'=>null]);return Http::response(['message'=>'PRIVATE-TOKEN'],500);});
        $response=$this->sync()->assertOk()->assertJsonPath('data.complete',false)->assertJsonCount(2,'data.errors');$this->assertStringNotContainsString('PRIVATE-TOKEN',$response->getContent());$this->assertDatabaseCount('bank_operations',1);$this->assertNull(DB::table('bank_syncs')->first()->lease);$this->assertNull(DB::table('bank_syncs')->first()->last_success_at);
    }
    public function test_auth_failure_never_issues_transaction_calls(): void
    {
        $this->login();Http::fake(['*/auth'=>Http::response(['secret'=>'test-secret'],401)]);$r=$this->sync()->assertOk()->assertJsonPath('data.complete',false);Http::assertSentCount(3);$this->assertStringNotContainsString('test-secret',$r->getContent());$this->assertDatabaseCount('bank_operations',0);
    }
    public function test_connection_error_is_sanitized(): void
    {
        $this->login();Http::fake(fn()=>throw new ConnectionException('test-secret should never be exposed'));$r=$this->sync()->assertOk()->assertJsonPath('data.complete',false);$this->assertStringNotContainsString('test-secret',$r->getContent());$this->assertNull(DB::table('bank_syncs')->first()->lease);
    }
    public function test_pagination_refuses_other_accounts_and_repeated_cursors(): void
    {
        $this->login();config(['pluggy.accounts_file'=>$this->file]);file_put_contents($this->file,json_encode(['accounts'=>[$this->accounts[0]]]));
        Http::fake(fn($r)=>str_ends_with($r->url(),'/auth')?Http::response(['apiKey'=>'key']):Http::response(['results'=>[$this->operation()],'next'=>'?accountId='.$this->accounts[1]['account_id'].'&after=bad']));
        $this->sync()->assertOk()->assertJsonPath('data.complete',false);Http::assertSentCount(2);$this->assertDatabaseCount('bank_operations',1);
        Http::swap(new \Illuminate\Http\Client\Factory());Http::preventStrayRequests();
        Http::fake(fn($r)=>str_ends_with($r->url(),'/auth')?Http::response(['apiKey'=>'key']):Http::response(['results'=>[],'next'=>'?accountId='.$this->accounts[0]['account_id'].'&after=same']));
        $this->sync()->assertOk()->assertJsonPath('data.complete',false);
    }
    public function test_later_source_changes_never_overwrite_confirmed_decisions_or_saved_amounts(): void
    {
        $this->login(); $a=$this->operation(1); $b=$this->operation(2); $a['status']=$b['status']='PENDING';
        $this->fake([$a,$b]); $this->sync()->assertOk(); $ids=BankOperation::orderBy('id')->pluck('id');
        $this->postJson('/api/v1/reconciliation/'.$ids[0].'/ignore')->assertNoContent();
        $this->postJson('/api/v1/reconciliation/'.$ids[1].'/add',$this->draft())->assertCreated();
        $a['status']=$b['status']='POSTED'; $a['amount']=$b['amount']=999.99;
        $this->fake([$a,$b]); $this->sync()->assertOk();
        $this->getJson('/api/v1/reconciliation')->assertOk()->assertJsonPath('meta.total',0);
        $this->assertDatabaseHas('bank_operations',['id'=>$ids[0],'review_status'=>'ignored']);
        $this->assertDatabaseHas('bank_operations',['id'=>$ids[1],'review_status'=>'added']);
        $this->assertDatabaseHas('transactions',['amount_cents'=>12080]); $this->assertDatabaseCount('transactions',1);
    }
    public function test_concurrent_sync_is_rejected_and_expired_lease_can_be_recovered(): void
    {
        $this->login();DB::table('bank_syncs')->insert(['user_id'=>$this->owner->id,'lease'=>'active','locked_until'=>now()->addMinutes(2)]);$this->sync()->assertConflict();Http::assertNothingSent();
        DB::table('bank_syncs')->where('user_id',$this->owner->id)->update(['locked_until'=>now()->subMinute()]);$this->fake();$this->sync()->assertOk()->assertJsonPath('data.complete',true);$this->assertNotNull(DB::table('bank_syncs')->first()->last_success_at);
    }
    public function test_local_pagination_and_configured_accounts_filter(): void
    {
        $this->login();for($i=1;$i<=29;$i++)BankOperation::create(['user_id'=>$this->owner->id,...app(\App\Services\BankOperationNormalizer::class)->normalize($this->operation($i),$this->accounts[0])]);
        $this->getJson('/api/v1/reconciliation')->assertOk()->assertJsonCount(25,'data')->assertJsonPath('meta.total',29)->assertJsonPath('meta.last_page',2);$this->getJson('/api/v1/reconciliation?page=2')->assertOk()->assertJsonCount(4,'data');
        file_put_contents($this->file,json_encode(['accounts'=>[$this->accounts[1]]]));$this->getJson('/api/v1/reconciliation')->assertOk()->assertJsonPath('meta.total',0);Http::assertNothingSent();
    }
    public function test_unexpected_page_is_not_partially_saved_and_currency_is_not_silently_converted(): void
    {
        $this->login();$r=$this->operation(2);$r['type']='UNKNOWN';$this->fake([$this->operation(),$r]);$this->sync()->assertOk()->assertJsonPath('data.complete',false);$this->assertDatabaseCount('bank_operations',0);
        $r=$this->operation();$r['currencyCode']='USD';$this->fake([$r]);$this->sync()->assertOk();$id=BankOperation::first()->id;$this->postJson("/api/v1/reconciliation/$id/add",$this->draft())->assertUnprocessable()->assertJsonValidationErrors('amount_cents');$this->postJson("/api/v1/reconciliation/$id/ignore")->assertNoContent();
    }

    public function test_pluggy_date_from_is_a_rolling_three_month_window_and_preserves_pagination(): void
    {
        Http::fake(fn ($request) => str_ends_with($request->url(), '/auth')
            ? Http::response(['apiKey' => 'test-key'])
            : Http::response(['results' => [], 'next' => null]));
        $client = app(\App\Services\PluggyClient::class);
        $account = $this->accounts[0]['account_id'];
        try {
            foreach ([['2026-10-26 12:00:00', '2026-07-26'], ['2026-05-31 12:00:00', '2026-02-28'], ['2026-01-01 01:00:00', '2025-09-30']] as [$now, $expected]) {
                \Carbon\CarbonImmutable::setTestNow(\Carbon\CarbonImmutable::parse($now, 'UTC'));
                $client->page($account);
                Http::assertSent(function ($request) use ($account, $expected) {
                    parse_str(parse_url($request->url(), PHP_URL_QUERY) ?? '', $query);
                    return str_contains($request->url(), '/v2/transactions?')
                        && ($query['accountId'] ?? null) === $account
                        && ($query['dateFrom'] ?? null) === $expected;
                });
            }
            $next = '?accountId='.$account.'&dateFrom=2025-09-30&after=A%2FB%3D';
            $client->page($account, $next);
            Http::assertSent(fn ($request) => str_ends_with($request->url(), '/v2/transactions'.$next));
            Http::assertSentCount(8);
        } finally {
            \Carbon\CarbonImmutable::setTestNow();
        }
    }
}
