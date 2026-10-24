<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class BankOperation extends Model
{
    protected $guarded = ['id'];
    protected function casts(): array { return ['amount_cents' => 'integer', 'transaction_date' => 'immutable_date:Y-m-d', 'reviewed_at' => 'immutable_datetime']; }
}
