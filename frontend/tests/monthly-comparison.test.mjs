import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyComparisonOption } from '../src/js/dashboard/monthly-comparison.js';

test('relatórios adaptam a largura para um mês e preservam pares para três ou doze meses', () => {
    for (const count of [1, 3, 12]) {
        const history = Array.from({ length: count }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, '0')}`, income: 10000 + i, expense: 5000 + i }));
        const option = monthlyComparisonOption(history, { adaptive: true });
        assert.equal(option.xAxis.data.length, count);
        assert.ok(option.series.every(series => series.data.length === count));
        if (count === 1) {
            assert.equal(option.series[0].barWidth, '42%');
            assert.equal(option.series[0].barMaxWidth, undefined);
        }
    }
    assert.equal(monthlyComparisonOption([{ month: '2026-10', income: 0, expense: 0 }]).series[0].barMaxWidth, 26);
});

test('compara entradas e despesas reais em centavos, inclusive em meses negativos e na virada do ano', () => {
    const history = [
        { month: '2025-12', income: 840000, expense: 1230000, result: -390000 },
        { month: '2026-01', income: 860000, expense: 510000, result: 350000 },
    ];
    const option = monthlyComparisonOption(history);
    assert.deepEqual(option.xAxis.data, ['Dez', 'Jan']);
    assert.deepEqual(option.series.map(row => row.name), ['Entradas', 'Despesas']);
    assert.deepEqual(option.series[0].data, [840000, 860000]);
    assert.deepEqual(option.series[1].data, [1230000, 510000]);
    assert.equal(option.tooltip.show, false);
    assert.equal(option.tooltip.showContent, false);
    assert.equal(option.tooltip.triggerOn, 'none');
    assert.notEqual(option.series[0].itemStyle.color, option.series[1].itemStyle.color);
    assert.equal(option.legend.selectedMode, false);
});

test('meses zerados não inventam valores e as séries não alteram o histórico', () => {
    const history = Array.from({ length: 6 }, (_, index) => ({ month: `2026-0${index + 1}`, income: 0, expense: 0, result: 0 }));
    const before = structuredClone(history);
    const option = monthlyComparisonOption(history);
    assert.equal(option.xAxis.data.length, 6);
    assert.ok(option.series.every(series => series.data.every(value => value === 0)));
    assert.deepEqual(history, before);
});


test('tooltip permanece desativado no dashboard e nos três filtros de relatórios', () => {
    for (const count of [1, 3, 6, 12]) {
        const history = Array.from({ length: count }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, '0')}`, income: 10000, expense: 5000 }));
        const option = monthlyComparisonOption(history, { adaptive: count !== 6 });
        assert.deepEqual(option.tooltip, { show: false, showContent: false, triggerOn: 'none' });
        assert.ok(option.series.every(series => series.label.show));
    }
});
