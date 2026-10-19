import test from 'node:test';
import assert from 'node:assert/strict';
import { reportData, validRange, periodLabel, comparisonLabel } from '../src/js/reports/data.js';

test('totais do mês não recebem os valores dos meses usados somente na comparação', () => {
    const report = reportData({
        totals: { income_cents: 100000, expense_cents: 3999, income_count: 1, expense_count: 1 },
        by_category: [{ category: { id: 7, name: '<Mercado>', color: '#ff503f' }, amount_cents: 3999 }],
        comparison_series: [
            { year: 2026, month: 9, income_cents: 900000, expense_cents: 600000, result_cents: 300000 },
            { year: 2026, month: 10, income_cents: 100000, expense_cents: 3999, result_cents: 96001 },
        ],
    });
    assert.equal(report.income, 100000);
    assert.equal(report.expense, 3999);
    assert.equal(report.incomeCount, 1);
    assert.deepEqual(report.byCategory[0], { key: 7, name: '<Mercado>', color: '#FF503F', amount: 3999 });
    assert.equal(report.history[0].income, 900000);
    assert.equal(report.history[1].result, 96001);
});

test('série dos gráficos mantém centavos, resultados negativos e virada de ano', () => {
    const report = reportData({ totals: { income_cents: 0, expense_cents: 658, income_count: 0, expense_count: 1 }, by_category: [],
        comparison_series: [
            { year: 2025, month: 12, income_cents: 0, expense_cents: 658, result_cents: -658 },
            { year: 2026, month: 1, income_cents: 0, expense_cents: 0, result_cents: 0 },
        ] });
    assert.deepEqual(report.history.map(item => item.month), ['2025-12', '2026-01']);
    assert.equal(report.history[0].result, -658);
    assert.equal(report.history[1].result, 0);
});

test('períodos aceitos correspondem ao contrato da API', () => {
    for (const value of ['month', 'three_months', 'year']) assert.equal(validRange(value), true);
    for (const value of ['', undefined, 'quarter', '12', '<script>', 'MONTH']) assert.equal(validRange(value), false);
});

test('datas exibidas distinguem totais do período e comparação dos gráficos', () => {
    assert.match(periodLabel('2026-10', 'month'), /Outubro.*2026/);
    assert.match(periodLabel('2026-01', 'three_months'), /Novembro.*2025.*Janeiro.*2026/);
    assert.match(periodLabel('2026-10', 'year'), /Janeiro até Outubro.*2026/);
    assert.match(comparisonLabel({ start_date: '2026-05-01', end_date: '2026-10-31' }), /Maio.*2026.*Outubro.*2026/);
    assert.equal(periodLabel('2026-01', 'year'), comparisonLabel({ start_date: '2026-01-01', end_date: '2026-01-31' }));
});
