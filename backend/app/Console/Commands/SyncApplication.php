<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class SyncApplication extends Command
{
    protected $signature = 'app:sync {--force : Permite executar migrations em produção sem confirmação}';

    protected $description = 'Limpa os caches do Laravel e executa as migrations pendentes';

    public function handle(): int
    {
        $steps = [
            ['config:clear'],
            ['cache:clear'],
            ['route:clear'],
            ['view:clear'],
            ['event:clear'],
            ['clear-compiled'],
            $this->option('force') ? ['migrate', '--force'] : ['migrate'],
        ];

        foreach ($steps as $arguments) {
            $this->newLine();
            $this->info('Executando: php artisan '.implode(' ', $arguments));
            // A fresh process after config:clear reloads .env instead of reusing
            // the configuration already bootstrapped by this parent command.
            $php = [PHP_BINARY];
            if ($ini = php_ini_loaded_file()) {
                array_push($php, '-c', $ini);
            }
            $process = new Process([...$php, base_path('artisan'), ...$arguments, '--no-interaction'], base_path());
            $process->setTimeout(null);
            $code = $process->run(fn ($type, $output) => $this->output->write($output));
            if ($code !== 0) {
                $this->error('Sincronização interrompida. Corrija o erro acima e execute app:sync novamente.');
                if ($arguments[0] === 'migrate' && ! $this->option('force')) {
                    $this->comment('Em produção, execute: php artisan app:sync --force');
                }
                return $code;
            }
        }

        $this->newLine();
        $this->info('Caches limpos e migrations concluídas. Ambiente atualizado.');
        return self::SUCCESS;
    }
}
