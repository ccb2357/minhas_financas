import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBRL, amountText, MAX_CENTS } from '../src/js/shared/money.js';
import { todayBrazil, validDate, validMonth, shiftMonth, dateText } from '../src/js/shared/calendar.js';

test('valores brasileiros são convertidos para centavos inteiros exatos', () => {
    for (const [text, cents] of [['0,01', 1], ['0,10', 10], ['0,20', 20], ['12', 1200],
        ['12,3', 1230], ['234,90', 23490], ['1.234,56', 123456], ['R$\u00a01.234,56', 123456],
        ['999.999.999,99', MAX_CENTS], ['0001,00', 100]]) assert.equal(parseBRL(text), cents);
    assert.equal(parseBRL('0,10') + parseBRL('0,20'), 30);
});

test('valores inválidos não são arredondados nem corrigidos silenciosamente', () => {
    for (const value of ['', '0', '0,00', '-1,00', '1,234', '1.23', '1,234.56',
        '1e3', 'abc', '10 reais', '1.000.000.000,00', '1234.567,89', null, 123, true]) assert.equal(parseBRL(value), null);
});

test('formatação e leitura preservam cada centavo até o limite', () => {
    for (const cents of [1, 10, 20, 99, 100, 123456, 90000000001, MAX_CENTS]) assert.equal(parseBRL(amountText(cents)), cents);
    assert.equal(amountText(0), '0,00');
    assert.equal(amountText(MAX_CENTS + 1), '');
});

test('datas são calendário brasileiro, com ano bissexto e limites', () => {
    for (const date of ['1900-01-01', '2028-02-29', '2100-12-31']) assert.equal(validDate(date), true);
    for (const date of ['2026-02-29', '2026-04-31', '2026-00-10', '1899-12-31', '2101-01-01', '19/10/2026']) assert.equal(validDate(date), false);
    assert.equal(dateText('2026-10-19'), '19/10/2026');
    assert.equal(todayBrazil(new Date('2026-11-01T01:30:00Z')), '2026-10-31');
    assert.equal(shiftMonth('2026-12', 1), '2027-01');
    assert.equal(shiftMonth('2026-01', -1), '2025-12');
    assert.equal(validMonth('2026-13'), false);
});
