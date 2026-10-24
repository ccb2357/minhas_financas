<?php
namespace App\Services;
use Carbon\CarbonImmutable;
use App\Exceptions\PluggyException as RuntimeException;

class BankOperationNormalizer
{
    public function normalize(array $row, array $account): array
    {
        if (($row['accountId'] ?? null) !== $account['account_id'] || !is_string($row['id'] ?? null) || $row['id'] === '' || strlen($row['id']) > 255
            || !is_string($row['description'] ?? null) || trim($row['description']) === ''
            || !in_array($row['type'] ?? null, ['DEBIT', 'CREDIT'], true)
            || !is_string($row['currencyCode'] ?? null) || !preg_match('/^[A-Z]{3}$/', $row['currencyCode'])
            || !is_string($row['status'] ?? null) || strlen($row['status']) > 30
            || !is_string($row['date'] ?? null) || !preg_match('/^\d{4}-\d{2}-\d{2}(?:T|$)/', $row['date'])) {
            throw new RuntimeException('A Pluggy retornou uma operação com dados inesperados.');
        }
        $date = substr($row['date'], 0, 10);
        try { $parsed = CarbonImmutable::createFromFormat('!Y-m-d', $date); }
        catch (\Exception $e) { throw new RuntimeException('A Pluggy retornou uma data inválida.'); }
        if (!$parsed || $parsed->format('Y-m-d') !== $date) throw new RuntimeException('A Pluggy retornou uma data inválida.');
        $amount = $row['amount'] ?? null;
        if (!is_int($amount) && !is_float($amount)) throw new RuntimeException('A Pluggy retornou um valor inválido.');
        if (!is_finite((float) $amount)) throw new RuntimeException('A Pluggy retornou um valor inválido.');
        $text = (string) $amount;
        if (!preg_match('/^-?(\d{1,9})(?:\.(\d{1,2}))?$/', $text, $parts)) throw new RuntimeException('A Pluggy retornou um valor fora do formato aceito.');
        $cents = (int) $parts[1] * 100 + (int) str_pad($parts[2] ?? '', 2, '0');
        return ['external_transaction_id' => $row['id'], 'account_id' => $account['account_id'], 'bank_name' => $account['name'],
            'description' => mb_substr(trim($row['description']), 0, 255), 'type' => $row['type'] === 'DEBIT' ? 'expense' : 'income',
            'amount_cents' => $cents, 'currency_code' => $row['currencyCode'], 'transaction_date' => $date, 'source_status' => $row['status']];
    }
}
