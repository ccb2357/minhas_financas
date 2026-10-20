<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    private const OLD_PASSWORD = 'Senha atual segura 123';
    private const NEW_PASSWORD = 'Minha nova senha segura 456';

    private function signIn(array $attributes = []): User
    {
        $user = User::factory()->create(array_replace(['password' => self::OLD_PASSWORD], $attributes));
        $this->actingAs($user, 'web')->withHeader('Origin', 'http://localhost:5173');
        return $user;
    }

    private function passwordPayload(array $attributes = []): array
    {
        return array_replace(['current_password' => self::OLD_PASSWORD,
            'password' => self::NEW_PASSWORD, 'password_confirmation' => self::NEW_PASSWORD], $attributes);
    }

    public function test_both_endpoints_require_authentication(): void
    {
        $this->patchJson('/api/v1/me', [])->assertUnauthorized();
        $this->putJson('/api/v1/me/password', [])->assertUnauthorized();
    }

    public function test_name_can_be_updated_without_resending_email_or_password(): void
    {
        $user = $this->signIn();
        $oldHash = $user->password;
        $this->patchJson('/api/v1/me', ['name' => '  Christopher Silva  '])->assertOk()
            ->assertExactJson(['id' => $user->id, 'name' => 'Christopher Silva', 'email' => $user->email]);
        $this->assertSame($oldHash, $user->fresh()->password);
        $this->assertAuthenticatedAs($user, 'web');
    }

    public function test_email_change_requires_current_password_and_is_atomic(): void
    {
        $user = $this->signIn();
        $this->patchJson('/api/v1/me', ['name' => 'Não salvar', 'email' => 'novo@example.com'])
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->assertSame($user->name, $user->fresh()->name);
        $this->assertSame($user->email, $user->fresh()->email);
    }

    public function test_wrong_password_cannot_change_email(): void
    {
        $user = $this->signIn();
        $this->patchJson('/api/v1/me', ['email' => 'novo@example.com', 'current_password' => 'incorreta'])
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->assertSame($user->email, $user->fresh()->email);
    }

    public function test_email_is_normalized_and_verification_is_reset_only_when_changed(): void
    {
        $user = $this->signIn(['email' => 'antigo@example.com', 'email_verified_at' => now()]);
        $this->patchJson('/api/v1/me', ['email' => ' NOVO@EXAMPLE.COM ', 'current_password' => self::OLD_PASSWORD])
            ->assertOk()->assertJsonPath('email', 'novo@example.com');
        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertSame($user->name, $user->fresh()->name);
    }

    public function test_same_email_does_not_require_password_or_clear_verification(): void
    {
        $user = $this->signIn(['email' => 'meu@example.com', 'email_verified_at' => now()]);
        $this->patchJson('/api/v1/me', ['name' => 'Novo nome', 'email' => ' MEU@EXAMPLE.COM '])->assertOk();
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_email_must_be_unique_and_failure_preserves_name(): void
    {
        User::factory()->create(['email' => 'ocupado@example.com']);
        $user = $this->signIn();
        $this->patchJson('/api/v1/me', ['name' => 'Não salvar', 'email' => 'OCUPADO@example.com', 'current_password' => self::OLD_PASSWORD])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertSame($user->name, $user->fresh()->name);
    }

    public function test_empty_or_invalid_profile_returns_portuguese_errors(): void
    {
        $user = $this->signIn();
        $this->patchJson('/api/v1/me', [])->assertUnprocessable()
            ->assertJsonPath('errors.name.0', 'Informe o nome ou o e-mail que deseja atualizar.');
        $this->patchJson('/api/v1/me', ['name' => '', 'email' => 'invalid'])
            ->assertUnprocessable()->assertJsonValidationErrors(['name', 'email']);
        $this->patchJson('/api/v1/me', ['name' => ['invalid'], 'email' => ['invalid']])
            ->assertUnprocessable()->assertJsonValidationErrors(['name', 'email']);
        $this->assertSame($user->name, $user->fresh()->name);
    }

    public function test_profile_field_lengths_are_limited(): void
    {
        $this->signIn();
        $this->patchJson('/api/v1/me', ['name' => str_repeat('a', 256), 'email' => str_repeat('a', 250).'@example.com'])
            ->assertUnprocessable()->assertJsonValidationErrors(['name', 'email']);
        $this->patchJson('/api/v1/me', ['name' => str_repeat('a', 255)])->assertOk();
    }

    public function test_owner_and_security_fields_cannot_be_forged_in_profile(): void
    {
        $other = User::factory()->create();
        $user = $this->signIn();
        $this->patchJson('/api/v1/me', ['name' => 'Não salvar', 'id' => $other->id, 'user_id' => $other->id,
            'password' => 'Forged password', 'password_confirmation' => 'Forged password',
            'remember_token' => 'forged', 'email_verified_at' => now()->toISOString(),
            'created_at' => now()->toISOString(), 'updated_at' => now()->toISOString()])
            ->assertUnprocessable()->assertJsonValidationErrors(['id', 'user_id', 'password', 'password_confirmation',
                'remember_token', 'email_verified_at', 'created_at', 'updated_at']);
        $this->assertSame($user->name, $user->fresh()->name);
        $this->assertSame($other->name, $other->fresh()->name);
    }

    public function test_unknown_profile_fields_are_not_persisted_or_returned(): void
    {
        $user = $this->signIn();
        $this->patchJson('/api/v1/me', ['name' => 'Meu nome', 'is_admin' => true])
            ->assertOk()->assertExactJson(['id' => $user->id, 'name' => 'Meu nome', 'email' => $user->email]);
    }

    public function test_password_fields_are_required_with_portuguese_messages(): void
    {
        $this->signIn();
        $this->putJson('/api/v1/me/password', [])->assertUnprocessable()
            ->assertJsonPath('errors.current_password.0', 'Informe sua senha atual.')
            ->assertJsonPath('errors.password.0', 'Informe a nova senha.')
            ->assertJsonPath('errors.password_confirmation.0', 'Confirme a nova senha.');
    }

    public function test_wrong_current_password_cannot_change_hash_or_end_session(): void
    {
        $user = $this->signIn();
        $hash = $user->password;
        $this->putJson('/api/v1/me/password', $this->passwordPayload(['current_password' => 'incorreta']))
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->assertSame($hash, $user->fresh()->password);
        $this->assertAuthenticatedAs($user, 'web');
    }

    public function test_short_same_and_unconfirmed_passwords_are_rejected(): void
    {
        $user = $this->signIn();
        foreach ([['password' => 'curta'], ['password_confirmation' => 'diferente'],
            ['password' => self::OLD_PASSWORD, 'password_confirmation' => self::OLD_PASSWORD],
            ['password' => ['invalid']]] as $invalid) {
            $this->putJson('/api/v1/me/password', $this->passwordPayload($invalid))
                ->assertUnprocessable()->assertJsonValidationErrors('password');
        }
        $this->assertTrue(Hash::check(self::OLD_PASSWORD, $user->fresh()->password));
    }

    public function test_bcrypt_byte_limit_prevents_unicode_truncation(): void
    {
        $this->signIn();
        foreach ([str_repeat('a', 73), str_repeat('á', 37)] as $password) {
            $this->putJson('/api/v1/me/password', $this->passwordPayload(['password' => $password, 'password_confirmation' => $password]))
                ->assertUnprocessable()->assertJsonValidationErrors('password');
        }
    }

    public function test_valid_password_is_hashed_token_rotates_and_current_session_ends(): void
    {
        $user = $this->signIn(['remember_token' => Str::random(60)]);
        $oldToken = $user->remember_token;
        $this->withSession(['draft_marker' => 'remove']);
        $this->putJson('/api/v1/me/password', $this->passwordPayload())->assertNoContent();
        $fresh = $user->fresh();
        $this->assertTrue(Hash::check(self::NEW_PASSWORD, $fresh->password));
        $this->assertFalse(Hash::check(self::OLD_PASSWORD, $fresh->password));
        $this->assertNotSame(self::NEW_PASSWORD, $fresh->password);
        $this->assertNotSame($oldToken, $fresh->remember_token);
        $this->assertSame($user->email, $fresh->email);
        $this->assertSame($user->name, $fresh->name);
        $this->assertGuest('web');
        $this->assertNull(session('draft_marker'));
        // Descarta o guard em memória entre requisições do mesmo teste.
        Auth::forgetGuards();
        $this->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_twelve_character_password_is_accepted(): void
    {
        $user = $this->signIn();
        $password = 'abcdefghijkl';
        $this->putJson('/api/v1/me/password', $this->passwordPayload(['password' => $password, 'password_confirmation' => $password]))->assertNoContent();
        $this->assertTrue(Hash::check($password, $user->fresh()->password));
    }

    public function test_seventy_two_byte_password_is_accepted(): void
    {
        $user = $this->signIn();
        $password = str_repeat('á', 36);
        $this->putJson('/api/v1/me/password', $this->passwordPayload(['password' => $password, 'password_confirmation' => $password]))->assertNoContent();
        $this->assertTrue(Hash::check($password, $user->fresh()->password));
    }

    public function test_password_endpoint_cannot_modify_other_fields_or_other_users(): void
    {
        $other = User::factory()->create();
        $user = $this->signIn();
        $this->putJson('/api/v1/me/password', $this->passwordPayload(['id' => $other->id, 'user_id' => $other->id,
            'name' => 'Outro', 'email' => 'outro@example.com', 'remember_token' => 'forged',
            'email_verified_at' => now()->toISOString(), 'created_at' => now()->toISOString(), 'updated_at' => now()->toISOString()]))
            ->assertUnprocessable()->assertJsonValidationErrors(['id', 'user_id', 'name', 'email', 'remember_token', 'email_verified_at', 'created_at', 'updated_at']);
        $this->assertSame($user->password, $user->fresh()->password);
        $this->assertSame($other->password, $other->fresh()->password);
    }

    public function test_null_byte_is_rejected_instead_of_reaching_bcrypt(): void
    {
        $user = $this->signIn();
        $password = "senha longa com\0byte";
        $this->putJson('/api/v1/me/password', $this->passwordPayload(['password' => $password, 'password_confirmation' => $password]))
            ->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->assertSame($user->password, $user->fresh()->password);
    }

    public function test_hash_looking_password_is_treated_as_a_literal_password(): void
    {
        $user = $this->signIn();
        $password = Hash::make('Conteudo que nao e a senha');
        $this->putJson('/api/v1/me/password', $this->passwordPayload(['password' => $password, 'password_confirmation' => $password]))
            ->assertNoContent();
        $this->assertNotSame($password, $user->fresh()->password);
        $this->assertTrue(Hash::check($password, $user->fresh()->password));
    }

    public function test_profile_password_attempts_are_rate_limited(): void
    {
        $this->signIn();
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->patchJson('/api/v1/me', ['email' => 'novo@example.com', 'current_password' => 'incorreta'])->assertUnprocessable();
        }
        $this->patchJson('/api/v1/me', ['email' => 'novo@example.com', 'current_password' => self::OLD_PASSWORD])->assertStatus(429);
    }

    public function test_failed_password_attempts_are_rate_limited(): void
    {
        $this->signIn();
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->putJson('/api/v1/me/password', $this->passwordPayload(['current_password' => 'incorreta']))->assertUnprocessable();
        }
        $this->putJson('/api/v1/me/password', $this->passwordPayload())->assertStatus(429);
    }
}
