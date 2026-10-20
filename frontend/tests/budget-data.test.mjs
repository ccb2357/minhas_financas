import test from 'node:test';
import assert from 'node:assert/strict';
import { progressPercent, percentLabel, shortPercentLabel, budgetRingTone, budgetTone, remainingLabel } from '../src/js/budgets/data.js';

test('desenho da barra é limitado sem esconder o percentual real acima de cem', () => {
    assert.equal(progressPercent(125), 100);
    assert.equal(percentLabel(125), '125%');
    assert.equal(progressPercent(77.5), 77.5);
    assert.equal(percentLabel(77.5), '77,5%');
    assert.equal(progressPercent(0), 0);
});

test('mês sem orçamento tem percentual não aplicável, sem NaN nem divisão por zero', () => {
    for (const value of [null, undefined, Number.NaN, Infinity]) {
        assert.equal(percentLabel(value), '—');
        assert.equal(progressPercent(value), 0);
    }
});

test('sobra e excesso de gasto são apresentados em reais a partir de centavos inteiros', () => {
    assert.equal(remainingLabel(3999), 'R$\u00a039,99 disponíveis');
    assert.equal(remainingLabel(-685288), 'R$\u00a06.852,88 acima do limite');
    assert.equal(remainingLabel(0), 'Limite atingido');
});

test('estados de alerta vêm da API e não viram classes arbitrárias', () => {
    for (const value of ['near_limit', 'at_limit', 'over_limit']) assert.equal(budgetTone(value), value);
    assert.equal(budgetTone('within_limit'), 'within_limit');
    assert.equal(budgetTone('onclick=alert(1)'), 'within_limit');
});


test('percentual extremo só é abreviado no anel, mantendo o valor integral disponível', () => {
    const value = 9999999999900;
    assert.equal(shortPercentLabel(125), '125%');
    assert.equal(shortPercentLabel(null), '—');
    assert.ok(shortPercentLabel(value).length < percentLabel(value).length);
    assert.equal(progressPercent(value), 100);
    assert.match(percentLabel(value), /9.999.999.999.900%/);
});


test('anel fica verde até 75%, laranja até 90% e vermelho acima de 90%', () => {
    for (const value of [0, 50, 75]) assert.equal(budgetRingTone(value), 'green');
    for (const value of [75.01, 80, 90]) assert.equal(budgetRingTone(value), 'orange');
    for (const value of [90.01, 90.91, 100, 150]) assert.equal(budgetRingTone(value), 'red');
    for (const value of [null, undefined, NaN, Infinity]) assert.equal(budgetRingTone(value), 'neutral');
});
