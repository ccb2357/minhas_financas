import test from 'node:test';
import assert from 'node:assert/strict';
import { spendingRanking, renderSpendingRanking } from '../src/js/dashboard/spending-ranking.js';

const item = (id, amount, name = `Categoria ${id}`) => ({ category: { id, name, color: '#1564FF', icon: 'house' }, amount_cents: amount });

test('relatórios mostram todas as categorias sem agrupar e dashboard continua limitado a quatro', () => {
    const categories = Array.from({ length: 12 }, (_, index) => item(index + 1, (index + 1) * 100));
    const total = categories.reduce((sum, row) => sum + row.amount_cents, 0);
    const report = spendingRanking(categories, total, { limit: null });
    assert.equal(report.leading.length, 12);
    assert.equal(report.remaining, 0);
    assert.equal(report.leading.reduce((sum, row) => sum + row.amount_cents, 0), total);
    assert.equal(report.leading[0].category.id, 12);
    const html = renderSpendingRanking(categories, total, { limit: null });
    assert.equal((html.match(/<li /g) || []).length, 12);
    assert.doesNotMatch(html, /Demais categorias/);
    assert.equal(spendingRanking(categories, total).leading.length, 4);
    assert.match(renderSpendingRanking([], 0, { limit: null, emptyMessage: 'Nenhuma despesa neste período.' }), /Nenhuma despesa neste período/);
});

test('quatro maiores gastos e demais categorias conciliam em centavos sem alterar a entrada', () => {
    const categories = [item(7, 30000), item(6, 34041), item(2, 110000), item(4, 40000), item(1, 210000), item(5, 40000), item(3, 50000)];
    const before = structuredClone(categories);
    const result = spendingRanking(categories, 514041);
    assert.deepEqual(result.leading.map(row => row.category.id), [1, 2, 3, 4]);
    assert.equal(result.remaining, 104041);
    assert.equal(result.leading.reduce((sum, row) => sum + row.amount_cents, result.remaining), result.total);
    assert.deepEqual(categories, before);
    const html = renderSpendingRanking(categories, result.total);
    assert.equal((html.match(/<li /g) || []).length, 5);
    assert.match(html, /Demais categorias/);
    assert.match(html, /1\.040,41/);
});

test('sem despesas mostra estado vazio, sem NaN e sem linhas artificiais', () => {
    const html = renderSpendingRanking([item(1, 0)], 0);
    assert.match(html, /Nenhuma despesa neste mês/);
    assert.doesNotMatch(html, /NaN|Infinity|<li /);
});

test('uma categoria usa 100 por cento e não inventa grupo restante', () => {
    const html = renderSpendingRanking([item(1, 123456)], 123456);
    assert.match(html, /100%/);
    assert.match(html, /width:100%/);
    assert.doesNotMatch(html, /Demais categorias/);
});

test('gastos pequenos mantêm valor integral e indicam menos de um por cento', () => {
    const html = renderSpendingRanking([item(1, 99999), item(2, 1)], 100000);
    assert.match(html, /0,01/);
    assert.match(html, /&lt;1%/);
    assert.match(html, /width:0\.001%/);
});

test('nomes, cores e ícones vindos da API não inserem HTML ou estilos arbitrários', () => {
    const unsafe = item(1, 100, '<img src=x onerror=alert(1)>');
    unsafe.category.color = 'red;position:fixed';
    unsafe.category.icon = '</i><script>alert(1)</script>';
    const html = renderSpendingRanking([unsafe], 100);
    assert.match(html, /&lt;img/);
    assert.doesNotMatch(html, /<img|<script|position:fixed/);
});

test('resumo sem orçamento mostra todas as categorias sem duplicar o total', () => {
    const rows = Array.from({ length: 9 }, (_, i) => item(i + 1, 100 + i));
    const html = renderSpendingRanking(rows, 936, { limit: null, showTotal: false });
    assert.equal((html.match(/<li /g) || []).length, 9);
    assert.doesNotMatch(html, /Demais categorias|spending-rank-total|Total de gastos/);
    assert.match(renderSpendingRanking(rows, 936), /spending-rank-total/);
});
