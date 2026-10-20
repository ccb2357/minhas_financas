<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdatePasswordRequest;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $data = $request->safe()->only(['name', 'email']);
        try {
            $user = DB::transaction(function () use ($request, $data): User {
                $user = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
                if (array_key_exists('email', $data) && $data['email'] !== $user->email) {
                    $this->checkPassword($request->input('current_password'), $user);
                    $user->email_verified_at = null;
                }
                $user->fill($data)->save();
                return $user;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            // Também cobre duas alterações concorrentes para o mesmo e-mail.
            throw ValidationException::withMessages(['email' => 'Este e-mail já está em uso.']);
        }

        return response()->json(['id' => $user->id, 'name' => $user->name, 'email' => $user->email]);
    }

    public function password(UpdatePasswordRequest $request): Response
    {
        DB::transaction(function () use ($request): void {
            $user = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $this->checkPassword($request->input('current_password'), $user);
            $user->password = Hash::make($request->validated('password'));
            $user->remember_token = Str::random(60);
            $user->save();
        }, 3);

        // Após alterar a senha, exige novo login neste navegador.
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }

    private function checkPassword(mixed $password, User $user): void
    {
        if (!is_string($password) || !Hash::check($password, $user->password)) {
            throw ValidationException::withMessages(['current_password' => 'A senha atual está incorreta.']);
        }
    }
}
