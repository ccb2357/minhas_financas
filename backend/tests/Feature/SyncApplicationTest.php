<?php

namespace Tests\Feature;

use PDO;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class SyncApplicationTest extends TestCase
{
    private string $directory;

    protected function setUp(): void
    {
        parent::setUp();
        $this->directory = sys_get_temp_dir().'/mf-sync-'.bin2hex(random_bytes(6));
        mkdir($this->directory);
        touch($this->directory.'/old.sqlite');
        touch($this->directory.'/new.sqlite');
    }

    protected function tearDown(): void
    {
        foreach (glob($this->directory.'/*') as $file) unlink($file);
        rmdir($this->directory);
        parent::tearDown();
    }

    private function runCommand(array $arguments, array $environment = []): Process
    {
        $php = [PHP_BINARY];
        if ($ini = php_ini_loaded_file()) array_push($php, '-c', $ini);
        $process = new Process([...$php, base_path('artisan'), ...$arguments, '--no-interaction'], base_path(), array_merge([
            'APP_ENV' => 'testing', 'DB_CONNECTION' => 'sqlite',
            'DB_DATABASE' => $this->directory.'/new.sqlite', 'DB_URL' => false,
            'CACHE_STORE' => 'array',
            'APP_CONFIG_CACHE' => $this->directory.'/config.php',
            'APP_ROUTES_CACHE' => $this->directory.'/routes.php',
            'APP_EVENTS_CACHE' => $this->directory.'/events.php',
            'APP_SERVICES_CACHE' => $this->directory.'/services.php',
            'APP_PACKAGES_CACHE' => $this->directory.'/packages.php',
        ], $environment));
        $process->setTimeout(60);
        $process->run();
        return $process;
    }

    public function test_reloads_configuration_before_migrating_and_can_repeat_without_losing_data(): void
    {
        $cached = $this->runCommand(['config:cache'], ['DB_DATABASE' => $this->directory.'/old.sqlite']);
        $this->assertTrue($cached->isSuccessful(), $cached->getOutput().$cached->getErrorOutput());
        $result = $this->runCommand(['app:sync']);
        $this->assertTrue($result->isSuccessful(), $result->getOutput().$result->getErrorOutput());
        $db = new PDO('sqlite:'.$this->directory.'/new.sqlite');
        $this->assertGreaterThan(0, (int) $db->query('SELECT COUNT(*) FROM migrations')->fetchColumn());
        $old = new PDO('sqlite:'.$this->directory.'/old.sqlite');
        $this->assertSame(0, (int) $old->query("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='migrations'")->fetchColumn());
        $db->exec("INSERT INTO users (name,email,password) VALUES ('Preservar','sync@example.com','hash')");
        $again = $this->runCommand(['app:sync']);
        $this->assertTrue($again->isSuccessful(), $again->getOutput().$again->getErrorOutput());
        $this->assertSame(1, (int) $db->query('SELECT COUNT(*) FROM users')->fetchColumn());
    }

    public function test_production_requires_force_and_accepts_it_explicitly(): void
    {
        $refused = $this->runCommand(['app:sync'], ['APP_ENV' => 'production']);
        $this->assertFalse($refused->isSuccessful());
        $this->assertStringContainsString('app:sync --force', $refused->getOutput());
        $allowed = $this->runCommand(['app:sync', '--force'], ['APP_ENV' => 'production']);
        $this->assertTrue($allowed->isSuccessful(), $allowed->getOutput().$allowed->getErrorOutput());
    }

    public function test_a_failed_cache_clear_stops_before_migrations_and_returns_failure(): void
    {
        $result = $this->runCommand(['app:sync'], ['CACHE_STORE' => 'database']);
        $this->assertFalse($result->isSuccessful());
        $this->assertStringContainsString('Sincronização interrompida', $result->getOutput());
        $db = new PDO('sqlite:'.$this->directory.'/new.sqlite');
        $this->assertSame(0, (int) $db->query("SELECT COUNT(*) FROM sqlite_master WHERE name='migrations'")->fetchColumn());
    }
}
