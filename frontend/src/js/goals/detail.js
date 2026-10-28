import { pageHeader } from '../shared/page-header.js';
import { escapeHtml as esc, icon } from '../shared/html.js';
import { formatMoney as money } from '../shared/money.js';
import { dateText, todayBrazil } from '../shared/calendar.js';
import { progressBar } from './presentation.js';
import { getGoal, listMovements, changeGoalState, goalError } from './api.js';
import { notifySuccess } from '../shared/notifications.js';

export function openGoalDetail(ctx, id, { onChanged, onClosed } = {}) {
    let alive = true, busy = false, goal, rows = [], page = 1, lastPage = 1, expanded = false, revision = 0, confirmation;
    const events = new AbortController(), focus = document.activeElement;
    const popup = ctx.app.popup.create({
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        closeByBackdropClick: false, closeOnEscape: true, swipeToClose: false,
        content: '<div class="popup goals-popup goal-detail" role="dialog" aria-modal="true" aria-label="Detalhes do objetivo"><div class="goals-popup-scroll"><main class="finance-container goals-popup-content"><div data-goal-detail-content></div><p class="goal-feedback" role="alert" hidden></p><div class="goal-detail-actions"><button type="button" class="mf-button mf-button-primary" data-goal-back>Voltar aos objetivos</button></div></main></div></div>',
        on: {
            opened() { popup.el.querySelector('h1')?.focus({ preventScroll: true }); },
            closed(instance) {
                alive = false; revision++; events.abort(); confirmation?.close(false);
                const el = instance.el; queueMicrotask(() => { instance.destroy(); el.remove(); });
                onClosed?.(); if (focus?.isConnected) focus.focus({ preventScroll: true });
            },
        },
    });
    const root = popup.el, content = root.querySelector('[data-goal-detail-content]'), feedback = root.querySelector('.goal-feedback');
    function controls() { for (const button of root.querySelectorAll('button')) button.disabled = busy && !button.hasAttribute('data-goal-back'); root.setAttribute('aria-busy', String(busy)); }
    function error(failure) { feedback.textContent = goalError(failure); feedback.hidden = false; }
    function management() {
        const tile = (action, glyph, label, style = '') => `<button type="button" class="goal-management-action ${style}" data-goal-${action}>${icon(glyph)}<span>${label}</span></button>`;
        const archived = goal.status === 'archived';
        const actions = archived
            ? tile('reopen', 'arrow_clockwise', 'Reabrir objetivo', 'goal-management-deposit')
            : tile('deposit', 'plus_circle', 'Guardar valor')
                + tile('withdraw', 'minus_circle', 'Retirar valor')
                + tile('edit', 'pencil', 'Editar')
                + tile('archive', 'archivebox', 'Arquivar', 'goal-management-archive');
        return `<section class="finance-card goal-management-card" aria-label="Gerenciar objetivo"><h2>Gerenciar objetivo</h2><div class="goal-management-actions${archived ? ' goal-management-one' : ' goal-management-four'}">${actions}</div>${!archived && goal.target_reached ? '<button type="button" class="mf-button mf-button-secondary goal-complete-inline" data-goal-complete>Concluir objetivo</button>' : ''}</section>`;
    }
    function render() {
        if (!alive || !goal) return;
        const archived = goal.status === 'archived', reached = goal.target_reached;
        content.innerHTML = `${pageHeader(goal.name, archived ? goal.completed_at ? 'Objetivo concluído' : 'Objetivo arquivado' : 'Cada passo aproxima você')}<section class="finance-card goal-detail-summary"><span>Valor guardado</span><strong class="goal-saved">${money(goal.saved_cents)}</strong><p>Meta de ${money(goal.target_cents)}</p>${progressBar(goal)}${reached && !archived ? '<p class="goal-reached">Meta atingida! Confirme quando quiser concluir.</p>' : ''}<div class="goal-detail-facts"><div><span>${reached ? 'Meta atingida' : 'Faltam'}</span><strong>${money(goal.remaining_cents)}</strong></div><div><span>${goal.deadline && goal.deadline < todayBrazil() && !reached ? 'Prazo encerrado' : 'Prazo'}</span><strong>${goal.deadline ? dateText(goal.deadline) : 'Sem prazo'}</strong></div></div></section><section class="finance-card goal-movements-card"><div class="goal-section-heading"><h2>Movimentações</h2>${!expanded && rows.length > 5 ? '<button type="button" data-goal-expand>Ver todas</button>' : ''}</div>${rows.length ? `<ul class="transaction-list goal-movements">${(expanded ? rows : rows.slice(0, 5)).map(row => `<li><button type="button" class="transaction-row" data-goal-movement="${row.id}" ${archived ? 'aria-label="Consultar movimentação"' : 'aria-label="Editar movimentação"'}><span class="goal-movement-icon ${row.type}">${icon(row.type === 'withdrawal' ? 'minus' : 'plus')}</span><span class="transaction-copy"><strong>${row.type === 'withdrawal' ? 'Retirada' : 'Valor guardado'}</strong><span>${dateText(row.movement_date)}</span>${row.notes ? `<span class="goal-movement-note">${esc(row.notes)}</span>` : ''}</span><span class="transaction-value ${row.type === 'withdrawal' ? 'expense' : 'income'}">${row.type === 'withdrawal' ? '−' : '+'} ${money(row.amount_cents)}</span></button></li>`).join('')}</ul>` : '<p class="goal-empty-note">Registre o primeiro valor guardado para começar.</p>'}${expanded && page < lastPage ? '<button type="button" class="mf-button mf-button-secondary" data-goal-movements-more>Carregar mais</button>' : ''}</section>${archived ? '<p class="goal-form-note">O valor guardado e o histórico foram preservados. Reabra o objetivo para fazer alterações.</p>' : ''}${management()}`;
        controls();
    }
    async function refresh() {
        if (!alive) return;
        const current = ++revision; busy = true; controls(); feedback.hidden = true;
        if (!goal) { content.innerHTML = '<div class="finance-card goal-empty"><span class="mf-spinner" aria-hidden="true"></span><p>Carregando objetivo...</p></div>'; }
        try {
            const [g, movements] = await Promise.all([getGoal(id), listMovements(id)]);
            if (!alive || current !== revision) return;
            goal = g.data; rows = movements.data; page = movements.meta.current_page; lastPage = movements.meta.last_page; render();
        } catch (failure) {
            if (!alive || current !== revision) return;
            if (failure.status === 401) { popup.close(false); ctx.expireSession(); return; }
            error(failure); if (!goal) content.innerHTML = '<button type="button" class="mf-button mf-button-secondary" data-goal-retry>Tentar novamente</button>';
        } finally { if (alive && current === revision) { busy = false; controls(); } }
    }
    async function more() {
        if (busy || !goal || page >= lastPage) return;
        busy = true; controls();
        try {
            const response = await listMovements(id, page + 1); if (!alive) return;
            rows = [...new Map([...rows, ...response.data].map(row => [row.id, row])).values()]; page = response.meta.current_page; lastPage = response.meta.last_page; render();
        } catch (failure) { if (alive) { if (failure.status === 401) { popup.close(false); ctx.expireSession(); } else error(failure); } }
        finally { if (alive) { busy = false; controls(); } }
    }
    function confirm(action) {
        const labels = { complete: ['Concluir objetivo?', 'O objetivo será arquivado, preservando o valor guardado e o histórico. Nenhuma despesa será criada.', 'Concluir'], archive: ['Arquivar objetivo?', 'Você poderá consultar e reabrir este objetivo. O dinheiro guardado será preservado.', 'Arquivar'], reopen: ['Reabrir objetivo?', 'O objetivo voltará para a lista de ativos.', 'Reabrir'] };
        const [title, text, label] = labels[action];
        confirmation = ctx.app.dialog.create({ animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, title, text, buttons: [{ text: 'Cancelar' }, { text: label, bold: true, onClick() { void mutate(action); } }], on: { closed() { confirmation = null; } } }).open();
    }
    async function mutate(action) {
        if (!alive || busy) return;
        busy = true; controls(); feedback.hidden = true;
        try {
            const response = await changeGoalState(goal, action); if (!alive) return;
            goal = response.data; render(); onChanged?.(); notifySuccess(ctx.app, { complete: 'Objetivo concluído!', archive: 'Objetivo arquivado.', reopen: 'Objetivo reaberto.' }[action]);
        } catch (failure) {
            if (!alive) return;
            if (failure.status === 401) { popup.close(false); ctx.expireSession(); return; }
            if (failure.status === 409) await refresh();
            error(failure);
        } finally { if (alive) { busy = false; controls(); } }
    }
    root.addEventListener('click', event => {
        const button = event.target.closest('button'); if (!button) return;
        if (button.hasAttribute('data-goal-back')) { popup.close(); return; }
        if (busy || confirmation) return;
        if (button.hasAttribute('data-goal-retry')) { void refresh(); return; }
        if (!goal) return;
        if (button.hasAttribute('data-goal-expand')) { expanded = true; render(); }
        if (button.hasAttribute('data-goal-movements-more')) void more();
        for (const action of ['complete', 'archive', 'reopen']) if (button.hasAttribute(`data-goal-${action}`)) confirm(action);
        const row = rows.find(item => String(item.id) === button.dataset.goalMovement);
        if (row && goal.status === 'archived') {
            confirmation = ctx.app.dialog.create({ animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                title: 'Movimentação', text: `${row.type === 'withdrawal' ? 'Retirada' : 'Valor guardado'}: ${money(row.amount_cents)}. ${dateText(row.movement_date)}.${row.notes ? ` ${esc(row.notes)}` : ''}`,
                buttons: [{ text: 'Entendi', bold: true }], on: { closed() { confirmation = null; } },
            }).open(); return;
        }
        if (button.hasAttribute('data-goal-edit') || button.hasAttribute('data-goal-deposit') || button.hasAttribute('data-goal-withdraw') || row) ctx.openGoalEditor({
            goal, movement: row, mode: button.hasAttribute('data-goal-edit') ? 'goal' : 'movement', type: button.hasAttribute('data-goal-withdraw') ? 'withdrawal' : 'contribution',
            onClosed() { if (alive) void refresh(); },
            onSaved() { if (alive) onChanged?.(); },
        });
    }, { signal: events.signal });
    popup.open(); void refresh();
    return { close: animate => popup.close(animate) };
}
