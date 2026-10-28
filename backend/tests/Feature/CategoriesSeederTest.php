<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Database\Seeders\CategoriesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class CategoriesSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_categories_without_changing_existing_financial_data_and_is_repeatable(): void
    {
        $user = User::factory()->create();
        $before = $user->fresh()->getRawOriginal();
        $existing = $user->categories()->create(['name' => 'Salário', 'type' => 'income', 'icon' => 'wallet', 'color' => '#123456', 'is_active' => false]);
        $transaction = $user->transactions()->create(['category_id' => $existing->id, 'type' => 'income', 'amount_cents' => 50000, 'description' => 'Preservar', 'transaction_date' => '2026-10-24']);
        $original = $existing->fresh()->getRawOriginal();
        $this->seed(CategoriesSeeder::class);
        $this->seed(CategoriesSeeder::class);
        $this->assertDatabaseCount('categories', 53);
        $this->assertSame(15, $user->categories()->where('type', 'income')->count());
        $this->assertSame(38, $user->categories()->where('type', 'expense')->count());
        $this->assertSame($original, $existing->fresh()->getRawOriginal());
        $this->assertSame($before, $user->fresh()->getRawOriginal());
        $this->assertDatabaseCount('transactions', 1);
        $this->assertDatabaseHas('transactions', ['id' => $transaction->id, 'amount_cents' => 50000]);
        $this->assertDatabaseCount('monthly_budgets', 0);
        foreach (Category::all() as $category) {
            $this->assertSame($user->id, $category->user_id);
            $this->assertContains($category->icon, Category::ICONS);
            $this->assertMatchesRegularExpression('/^#[0-9A-F]{6}$/', $category->color);
        }
    }

    public function test_no_user_does_not_create_an_account(): void
    {
        $this->expectException(RuntimeException::class);
        try { $this->seed(CategoriesSeeder::class); }
        finally { $this->assertDatabaseCount('users', 0); $this->assertDatabaseCount('categories', 0); }
    }

    public function test_multiple_users_do_not_receive_categories_implicitly(): void
    {
        User::factory()->count(2)->create();
        $this->expectException(RuntimeException::class);
        try { $this->seed(CategoriesSeeder::class); }
        finally { $this->assertDatabaseCount('categories', 0); }
    }
}
