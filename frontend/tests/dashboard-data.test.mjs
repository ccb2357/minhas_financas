import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardData, resultChange } from '../src/js/dashboard/data.js';
import { formatMoney } from '../src/js/shared/money.js';
import { monthLabel } from '../src/js/shared/calendar.js';

test('Dashboard usa centavos da API sem converter nem recalcular os totais', () => {
    const result = dashboardData({
        totals: { income_cents: 6852884, expense_cents: 3999, result_cents: 6848885, income_count: 1, expense_count: 1 },
        by_category: [{ category: { id: 7, name: '<Mercado>', color: '#ff503f' }, amount_cents: 3999 }],
        last_six_months: [{ year: 2026, month: 1, income_cents: 0, expense_cents: 658, result_cents: -658 }],
    });
    assert.equal(result.result, 6848885);
    assert.equal(result.income, 6852884);
    assert.equal(result.expenseCount, 1);
    assert.deepEqual(result.byCategory[0], { key: 7, name: '<Mercado>', color: '#FF503F', amount: 3999 });
    assert.deepEqual(result.history[0], { month: '2026-01', income: 0, expense: 658, result: -658 });
});

test('comparação só usa mês anterior positivo e mantém sinal da variação', () => {
    assert.equal(resultChange(12000, 10000), 20);
    assert.equal(resultChange(8000, 10000), -20);
    assert.equal(resultChange(-5000, 10000), -150);
    assert.equal(resultChange(0, 10000), -100);
    assert.equal(resultChange(10000, 0), null);
    assert.equal(resultChange(10000, -10000), null);
});

test('totais formatam negativos e somas maiores que o limite individual sem perder centavos', () => {
    assert.equal(formatMoney(3999), 'R$\u00a039,99');
    assert.equal(formatMoney(-3999), '−R$\u00a039,99');
    assert.equal(formatMoney(0), 'R$\u00a00,00');
    assert.equal(formatMoney(199999999999), 'R$\u00a01.999.999.999,99');
    assert.equal(formatMoney(Number.NaN), '—');
});

test('mês curto do gráfico e período do Dashboard usam o mesmo calendário', () => {
    assert.equal(monthLabel('2026-10', true), 'Out');
    assert.match(monthLabel('2026-10'), /Outubro.*2026/);
});
