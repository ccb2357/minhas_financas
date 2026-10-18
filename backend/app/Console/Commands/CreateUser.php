<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreateUser extends Command
{
    protected $signature = 'app:create-user';

    protected $description = 'Cria um usuário de acesso ao Minhas Finanças';

    public function handle(): int
    {
        $name = trim((string) $this->ask('Nome'));
        $email = trim((string) $this->ask('E-mail'));
        $password = (string) $this->secret('Senha (mínimo de 12 caracteres)');
        $confirmation = (string) $this->secret('Confirme a senha');

        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'password_confirmation' => $confirmation,
        ], [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:254', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12', 'confirmed'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        if (strlen($password) > 72) {
            $this->error('A senha deve ter no máximo 72 bytes.');

            return self::FAILURE;
        }

        User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
        ]);

        $this->info('Usuário criado com sucesso.');

        return self::SUCCESS;
    }
}