<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_profile(): void
    {
        $this->getJson('/api/v1/me')
            ->assertUnauthorized();
    }

    public function test_login_requires_email_and_password(): void
    {
        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/auth/login', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password']);

        $this->assertGuest('web');
    }

    public function test_wrong_password_does_not_authenticate(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('SenhaCorretaDeTeste123!'),
        ]);

        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'SenhaErradaDeTeste123!',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);

        $this->assertGuest('web');
    }

    public function test_user_can_login_access_profile_and_logout(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('SenhaCorretaDeTeste123!'),
        ]);

        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'SenhaCorretaDeTeste123!',
                'remember' => false,
            ])
            ->assertOk()
            ->assertJsonPath('id', $user->id)
            ->assertJsonMissingPath('password');

        $this->assertAuthenticatedAs($user, 'web');

        $this->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('email', $user->email)
            ->assertJsonMissingPath('password');

        $this->postJson('/api/v1/auth/logout')
            ->assertNoContent();

        $this->assertGuest('web');

        // Descarta o usuário mantido pelo Sanctum entre chamadas do teste.
        Auth::guard('sanctum')->forgetUser();

        $this->getJson('/api/v1/me')
            ->assertUnauthorized();
    }
}