import test from 'node:test';
import assert from 'node:assert/strict';
import { previewCycle, rememberCycleResponse, knownCycle, clearCycles, cycleDates } from '../src/js/cycles/state.js';

test('primeira configuração não assume um dia: prévia respeita o corte escolhido e a data brasileira', () => {
    assert.equal(previewCycle({ configured: false }, 0, '2026-10-23'), null);
    assert.deepEqual(previewCycle({ configured: false }, 10, '2026-10-23'), { start_date: '2026-10-10', end_date: '2026-11-09' });
    assert.deepEqual(previewCycle({ configured: false }, 10, '2026-10-05'), { start_date: '2026-09-10', end_date: '2026-10-09' });
});
test('prévia da transição mantém o início do próximo ciclo e ajusta seu encerramento', () => {
    const config = { configured: true, next: { year: 2026, month: 11, start_date: '2026-11-10' } };
    assert.deepEqual(previewCycle(config, 15), { start_date: '2026-11-10', end_date: '2026-12-14' });
    assert.deepEqual(previewCycle(config, 5), { start_date: '2026-11-10', end_date: '2026-12-04' });
});
test('prévia dos dias 29 a 31 respeita fevereiro, ano bissexto e virada de ano', () => {
    assert.deepEqual(previewCycle({ configured: false }, 31, '2024-02-29'), { start_date: '2024-02-29', end_date: '2024-03-30' });
    assert.deepEqual(previewCycle({ configured: false }, 31, '2026-02-28'), { start_date: '2026-02-28', end_date: '2026-03-30' });
    assert.deepEqual(previewCycle({ configured: false }, 1, '2026-01-01'), { start_date: '2026-01-01', end_date: '2026-01-31' });
});
test('legenda usa datas persistidas e não substitui um ciclo pelo intervalo expandido de relatórios', () => {
    clearCycles();
    const cycle = { year: 2026, month: 10, start_date: '2026-10-10', end_date: '2026-11-09' };
    rememberCycleResponse({ data: { current: cycle } });
    rememberCycleResponse({ data: { period: { ...cycle, range: 'year', start_date: '2026-01-10' } } });
    assert.deepEqual(knownCycle('2026-10'), cycle);
    assert.match(cycleDates(knownCycle('2026-10')), /10.*out.*2026.*09.*nov.*2026/);
    clearCycles(); assert.equal(knownCycle('2026-10'), undefined);
});
