import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize, series, shiftMonth } from '../src/js/demo/data.js';

test('outubro corresponde aos valores da demonstração e às contagens', () => {
    const summary = summarize('2026-10');
    assert.equal(summary.income, 540000);
    assert.equal(summary.expense, 246000);
    assert.equal(summary.result, 294000);
    assert.equal(summary.incomeCount, 3);
    assert.equal(summary.expenseCount, 12);
});

test('categorias e totais mensais conciliam com os lançamentos em centavos', () => {
    for (const summary of series('2026-10')) {
        assert.equal(summary.byCategory.reduce((sum, category) => sum + category.amount, 0), summary.expense);
        assert.equal(summary.result, summary.income - summary.expense);
        assert(summary.rows.every(row => Number.isSafeInteger(row.amount) && row.amount > 0));
    }
    assert.deepEqual(series('2026-10').map(month => month.result), [190000, 240000, 210000, 280000, 250000, 294000]);
});

test('mês sem dados apresenta zero e lista vazia', () => {
    const summary = summarize('2026-11');
    assert.equal(summary.income, 0);
    assert.equal(summary.expense, 0);
    assert.equal(summary.result, 0);
    assert.deepEqual(summary.rows, []);
    assert.deepEqual(summary.byCategory, []);
});

test('navegação mensal atravessa a virada de ano', () => {
    assert.equal(shiftMonth('2026-12', 1), '2027-01');
    assert.equal(shiftMonth('2026-01', -1), '2025-12');
});
