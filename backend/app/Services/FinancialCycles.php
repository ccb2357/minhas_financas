<?php

namespace App\Services;

use Carbon\CarbonImmutable as Date;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;

/** Global app calendar. User ownership remains on transactions/categories/budgets. */
class FinancialCycles
{
    public function today(): Date { return Date::today('America/Sao_Paulo'); }
    public function label(int $year, int $month): Date { return Date::create($year, $month, 1, 0, 0, 0, 'America/Sao_Paulo'); }
    private function date(string $value): Date { return Date::parse($value, 'America/Sao_Paulo')->startOfDay(); }
    private function cut(Date $month, int $day): Date { return $month->startOfMonth()->day(min($day, $month->daysInMonth)); }

    private function settings(bool $lock = false): object
    {
        $query = DB::table('financial_cycle_settings')->where('id', 1);
        $setting = ($lock ? $query->lockForUpdate() : $query)->first();
        if (!$setting || $setting->cut_day === null) {
            throw new HttpResponseException(response()->json([
                'message' => 'Defina a data de corte para organizar suas finanças.', 'code' => 'CYCLE_SETUP_REQUIRED',
            ], 428));
        }
        return $setting;
    }

    public function present(object $cycle): array
    {
        return ['id' => (int) $cycle->id, 'year' => (int) $cycle->year, 'month' => (int) $cycle->month,
            'key' => sprintf('%04d-%02d', $cycle->year, $cycle->month),
            'start_date' => $cycle->start_date, 'end_date' => $cycle->end_date, 'cut_day' => (int) $cycle->cut_day];
    }

    private function insert(Date $label, Date $start, Date $end, int $day): void
    {
        DB::table('financial_cycles')->insert(['year' => $label->year, 'month' => $label->month,
            'start_date' => $start->toDateString(), 'end_date' => $end->toDateString(), 'cut_day' => $day]);
    }

    /** Persist consecutive cycles under one singleton lock, never recompute started cycles. */
    public function between(Date $first, Date $last): Collection
    {
        $first = $first->startOfMonth(); $last = $last->startOfMonth();
        $cache = request()->attributes->get('financial_cycles.cache', collect());
        $slice = $cache->filter(fn ($p) => ($p->year * 12 + $p->month) >= ($first->year * 12 + $first->month)
            && ($p->year * 12 + $p->month) <= ($last->year * 12 + $last->month))->sortBy('start_date')->values();
        if ($slice->count() === (int) $first->diffInMonths($last) + 1) return $slice;
        $result = DB::transaction(function () use ($first, $last): Collection {
            $settings = $this->settings(true);
            $earliest = DB::table('financial_cycles')->orderBy('start_date')->first();
            $latest = DB::table('financial_cycles')->orderByDesc('start_date')->first();
            if (!$earliest) {
                $today = $this->today(); $label = $today->startOfMonth();
                if ($today->lt($this->cut($label, $settings->initial_cut_day))) $label = $label->subMonth();
                $this->insert($label, $this->cut($label, $settings->initial_cut_day),
                    $this->cut($label->addMonth(), $settings->initial_cut_day)->subDay(), $settings->initial_cut_day);
                $earliest = $latest = DB::table('financial_cycles')->first();
            }
            $back = $this->label($earliest->year, $earliest->month);
            $start = $this->date($earliest->start_date);
            while ($back->gt($first)) {
                $back = $back->subMonth();
                $previousStart = $this->cut($back, $settings->initial_cut_day);
                $this->insert($back, $previousStart, $start->subDay(), $settings->initial_cut_day);
                $start = $previousStart;
            }
            $forward = $this->label($latest->year, $latest->month);
            $end = $this->date($latest->end_date);
            while ($forward->lt($last)) {
                $forward = $forward->addMonth();
                // On a cut change the next cycle starts exactly where the current ends.
                // It closes on the NEW cut in the following month: no gap or overlap.
                $nextEnd = $this->cut($forward->addMonth(), $settings->cut_day)->subDay();
                $this->insert($forward, $end->addDay(), $nextEnd, $settings->cut_day);
                $end = $nextEnd;
            }
            return DB::table('financial_cycles')->where('start_date', '<=', $last->endOfMonth()->toDateString())
                ->whereRaw('(year * 12 + month) >= ?', [$first->year * 12 + $first->month])
                ->whereRaw('(year * 12 + month) <= ?', [$last->year * 12 + $last->month])
                ->orderBy('start_date')->get();
        }, 3);
        request()->attributes->set('financial_cycles.cache', $cache->merge($result)->keyBy('id')->values());
        return $result;
    }

    public function forLabel(Date $label): object { return $this->between($label, $label)->first(); }
    public function forDate(?string $date = null): object
    {
        $day = $date ? $this->date($date) : $this->today();
        return $this->between($day->startOfMonth()->subMonth(), $day->startOfMonth())
            ->first(fn ($cycle) => $cycle->start_date <= $day->toDateString() && $cycle->end_date >= $day->toDateString());
    }
    public function selected(array $filters): Date
    {
        if (isset($filters['year'], $filters['month'])) return $this->label((int) $filters['year'], (int) $filters['month']);
        $cycle = $this->forDate();
        return $this->label($cycle->year, $cycle->month);
    }
    public function start(object $cycle): Date { return $this->date($cycle->start_date); }
    public function endExclusive(object $cycle): Date { return $this->date($cycle->end_date)->addDay(); }

    public function configuration(?Date $selected = null): array
    {
        $raw = DB::table('financial_cycle_settings')->where('id', 1)->first();
        if (!$raw || $raw->cut_day === null) return ['configured' => false, 'version' => 0, 'current' => null, 'next' => null, 'pending_cut_day' => null];
        $current = $this->forDate();
        $currentLabel = $this->label($current->year, $current->month);
        $first = $selected ? $selected->startOfYear()->subYear() : $currentLabel->subMonths(12);
        $last = $selected ? $selected->startOfYear()->addYear()->subMonth() : $currentLabel->addMonths(12);
        $periods = $this->between($first, $last);
        $next = $this->forLabel($currentLabel->addMonth());
        return ['configured' => true, 'version' => (int) $raw->version, 'current' => $this->present($current),
            'next' => $this->present($next), 'pending_cut_day' => (int) $next->cut_day !== (int) $current->cut_day ? (int) $next->cut_day : null,
            'cycles' => $periods->map(fn ($p) => $this->present($p))->values()->all()];
    }

    public function configure(int $day, int $expectedVersion): array
    {
        DB::transaction(function () use ($day, $expectedVersion): void {
            // A manual reset can remove the singleton while keeping migrations.
            // Restore only its empty state; the cut day still comes from the UI.
            DB::table('financial_cycle_settings')->insertOrIgnore(['id' => 1]);
            $settings = DB::table('financial_cycle_settings')->where('id', 1)->lockForUpdate()->first();
            if ((int) $settings->version !== $expectedVersion) {
                throw ValidationException::withMessages(['cut_day' => 'A configuração mudou em outra sessão. Feche e abra este modal para atualizar.']);
            }
            if ($settings->cut_day === null) {
                DB::table('financial_cycle_settings')->where('id', 1)->update(['initial_cut_day' => $day, 'cut_day' => $day, 'version' => $expectedVersion + 1]);
            } else {
                $current = $this->forDate();
                DB::table('financial_cycle_settings')->where('id', 1)->update(['cut_day' => $day, 'version' => $expectedVersion + 1]);
                $future = DB::table('financial_cycles')->where('start_date', '>', $current->end_date)->orderBy('start_date')->get();
                $end = $this->date($current->end_date);
                foreach ($future as $cycle) {
                    $newEnd = $this->cut($this->label($cycle->year, $cycle->month)->addMonth(), $day)->subDay();
                    DB::table('financial_cycles')->where('id', $cycle->id)->update([
                        'start_date' => $end->addDay()->toDateString(), 'end_date' => $newEnd->toDateString(), 'cut_day' => $day]);
                    $end = $newEnd;
                }
            }
            // Backfill any pre-existing monthly budgets explicitly into cycle identities.
            foreach (DB::table('monthly_budgets')->whereNull('financial_cycle_id')->select('year', 'month')->distinct()->get() as $period) {
                $cycle = $this->forLabel($this->label($period->year, $period->month));
                DB::table('monthly_budgets')->where('year', $period->year)->where('month', $period->month)->update(['financial_cycle_id' => $cycle->id]);
            }
        }, 3);
        request()->attributes->remove('financial_cycles.cache');
        return $this->configuration();
    }
}
