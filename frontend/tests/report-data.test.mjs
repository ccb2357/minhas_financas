import test from 'node:test';
import assert from 'node:assert/strict';
import { reportData, validRange, periodLabel, comparisonLabel, changePresentation, expenseFrequencyLabel } from '../src/js/reports/data.js';

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
    assert.match(comparisonLabel({ start_date: '2026-05-01', end_date: '2026-10-31' }), /01.*mai.*2026.*31.*out.*2026/);
    assert.match(comparisonLabel({ start_date: '2026-01-10', end_date: '2026-02-09' }), /10.*jan.*2026.*09.*fev.*2026/);
});

test('variação usa o percentual da API e preserva a diferença em centavos', () => {
    assert.deepEqual(changePresentation({ percent: 33.33, difference_cents: 100 }, 'income'), { label: '+33,33%', difference: 100, tone: 'favorable' });
    assert.deepEqual(changePresentation({ percent: -200, difference_cents: -200 }, 'result'), { label: '−200%', difference: -200, tone: 'unfavorable' });
    assert.equal(changePresentation({ percent: 0, difference_cents: 0 }, 'income').label, '0%');
});

test('redução de despesas é favorável e aumento é desfavorável', () => {
    assert.equal(changePresentation({ percent: -12, difference_cents: -1200 }, 'expense').tone, 'favorable');
    assert.equal(changePresentation({ percent: 12, difference_cents: 1200 }, 'expense').tone, 'unfavorable');
    assert.equal(changePresentation({ percent: 0, difference_cents: 0 }, 'expense').tone, 'neutral');
});

test('sem base positiva não inventa percentual mesmo quando há diferença em reais', () => {
    assert.deepEqual(changePresentation({ percent: null, difference_cents: 100000000000 }, 'income'), { label: 'Sem base para %', difference: 100000000000, tone: 'favorable' });
    for (const percent of [undefined, NaN, Infinity]) assert.equal(changePresentation({ percent, difference_cents: 0 }, 'result').label, 'Sem base para %');
});

test('frequência usa quantidade de despesas como denominador e trata singular e vazio', () => {
    assert.equal(expenseFrequencyLabel(1, 3), '1 lançamento de saída (33,33% das saídas)');
    assert.equal(expenseFrequencyLabel(12, 20), '12 lançamentos de saída (60% das saídas)');
    assert.equal(expenseFrequencyLabel(0, 0), 'Sem despesas no período');
});
