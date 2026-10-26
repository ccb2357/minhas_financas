import test from 'node:test';
import assert from 'node:assert/strict';
import { goalProgress, goalCard } from '../src/js/goals/presentation.js';

test('objetivos preservam o valor real acima da meta e limitam apenas a barra', () => {
    assert.deepEqual(goalProgress({ saved_cents: 125000, target_cents: 100000 }), { saved: 125000, target: 100000, remaining: 0, percent: 100 });
    assert.deepEqual(goalProgress({ saved_cents: 25000, target_cents: 100000 }), { saved: 25000, target: 100000, remaining: 75000, percent: 25 });
});
test('nomes e ícones de objetivos não injetam HTML', () => {
    const html = goalCard({ id: 1, name: '<img src=x onerror=alert(1)>', icon: '<script>', saved_cents: 0, target_cents: 100, deadline: null, status: 'active' });
    assert.ok(html.includes('&lt;img'));
    assert.ok(!html.includes('<img'));
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('aria-valuenow="0"'));
});
test('objetivos concluídos e arquivados têm rótulos distintos', () => {
    const goal = { id: 1, name: 'Viagem', icon: 'airplane', saved_cents: 100, target_cents: 100, deadline: null, status: 'archived' };
    assert.ok(goalCard({ ...goal, completed_at: '2026-10-26' }).includes('Objetivo concluído'));
    assert.ok(goalCard({ ...goal, saved_cents: 50, completed_at: null }).includes('Arquivado'));
});
