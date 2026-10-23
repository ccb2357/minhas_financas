<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected bool $useCalendarCycleFixture = true;

    protected function setUp(): void
    {
        parent::setUp();
        if ($this->useCalendarCycleFixture && \Illuminate\Support\Facades\Schema::hasTable('financial_cycle_settings')) {
            \Illuminate\Support\Facades\DB::table('financial_cycle_settings')->where('id', 1)->update(['initial_cut_day' => 1, 'cut_day' => 1]);
        }
    }
}
