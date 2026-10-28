import { iconLabel } from '../categories/icon-catalog.js';
import { pageHeader } from '../shared/page-header.js';
import { escapeHtml as esc, icon } from '../shared/html.js';
import { amountText } from '../shared/money.js';
import { mountMasks } from '../shared/masks.js';
import { mountDateFields } from '../shared/date-picker.js';
import { todayBrazil, validDate } from '../shared/calendar.js';
import { openIconPicker } from '../categories/icon-picker.js';
import { safeIcon } from '../categories/catalog.js';
import { saveGoal, saveMovement, deleteMovement, goalError } from './api.js';

let sequence = 0;
export function openGoalEditor(ctx, { goal = null, movement = null, mode = 'goal', type = 'contribution', onClosed, onSaved } = {}) {
    const isGoal = mode === 'goal', editing = isGoal ? Boolean(goal) : Boolean(movement);
    const id = `goal-editor-${++sequence}`, focus = document.activeElement, requestKey = crypto.randomUUID();
    let alive = true, busy = false, picker, confirmation, saved, chosenIcon = goal?.icon || 'flag';
    const events = new AbortController();
    const title = isGoal ? (editing ? 'Editar objetivo' : 'Novo objetivo') : editing ? 'Editar movimentação' : type === 'withdrawal' ? 'Retirar valor' : 'Guardar valor';
    const moneyField = (label, name, cents) => `<div class="goal-field"><label for="${id}-${name}">${label}</label><div class="goal-money"><span>R$</span><input id="${id}-${name}" name="${name}" inputmode="decimal" autocomplete="off" data-mask="moedaBRL" maxlength="22" value="${cents ? amountText(cents) : ''}" aria-describedby="${id}-error"></div></div>`;
    const dateField = (label, name, value) => `<div class="goal-field"><label for="${id}-${name}">${label}</label><input type="date" id="${id}-${name}" name="${name}" min="1900-01-01" max="2100-12-31" value="${esc(value || '')}"></div>`;
    const cancelButton = '<button type="button" class="goal-text-button" data-goal-cancel>Cancelar</button>';
    const saveButton = `<button type="submit" form="${id}" class="mf-button mf-button-primary" data-goal-submit>${isGoal ? editing ? 'Salvar objetivo' : 'Criar objetivo' : 'Salvar movimentação'}</button>`;
    const popup = ctx.app.popup.create({
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        closeByBackdropClick: false, closeOnEscape: false, swipeToClose: false,
        content: `<div class="popup goals-popup goal-editor goal-editor-inline" role="dialog" aria-modal="true" aria-labelledby="${id}-title"><div class="goals-popup-scroll"><main class="finance-container goals-popup-content">${pageHeader(title, isGoal ? 'Dê um destino aos seus planos' : goal.name)}<form id="${id}" novalidate><fieldset>${isGoal ? `<section class="finance-card goal-form-card"><div class="goal-field goal-icon-field"><label for="${id}-icon-choice">Ícone</label><button id="${id}-icon-choice" type="button" class="goal-choose-icon" data-goal-icon aria-haspopup="dialog"><span class="goal-icon-choice-preview" data-goal-icon-preview>${icon(safeIcon(chosenIcon))}</span><span data-goal-icon-label>${esc(iconLabel(safeIcon(chosenIcon)))}</span>${icon('chevron_down')}</button></div><div class="goal-field"><label for="${id}-name">Nome do objetivo</label><input id="${id}-name" name="name" maxlength="80" autocomplete="off" value="${esc(goal?.name || '')}" placeholder="Ex.: Viagem"></div>${moneyField('Valor desejado', 'target', goal?.target_cents)}<div class="goal-deadline-field"><label class="goal-deadline-switch" for="${id}-has-deadline"><span>Definir prazo <small>Opcional</small></span><input type="checkbox" role="switch" id="${id}-has-deadline" name="has_deadline" ${goal?.deadline ? 'checked' : ''}></label><div data-goal-date ${goal?.deadline ? '' : 'hidden'}>${dateField('Data desejada', 'deadline', goal?.deadline)}</div></div></section>` : `<section class="finance-card goal-form-card"><div class="goal-movement-type" role="group" aria-label="Tipo de movimentação"><button type="button" data-movement-type="contribution" aria-pressed="${(movement?.type || type) === 'contribution'}">Guardar</button><button type="button" data-movement-type="withdrawal" aria-pressed="${(movement?.type || type) === 'withdrawal'}">Retirar</button></div>${moneyField('Valor', 'amount', movement?.amount_cents)}${dateField('Data', 'date', movement?.movement_date || todayBrazil())}<div class="goal-field"><label for="${id}-notes">Observação <span>(opcional)</span></label><textarea id="${id}-notes" name="notes" maxlength="1000" rows="3" placeholder="Adicione uma observação...">${esc(movement?.notes || '')}</textarea></div></section>`}</fieldset><p class="goal-feedback" id="${id}-error" role="alert" tabindex="-1" hidden></p><div class="goal-form-actions">${saveButton}${!isGoal && editing ? '<button type="button" class="goal-danger" data-goal-remove-movement>Excluir movimentação</button>' : ''}${cancelButton}</div></form></main></div></div>`,
        on: {
            opened() { popup.el.querySelector('h1').focus({ preventScroll: true }); },
            closed(instance) {
                alive = false; events.abort(); picker?.destroy(); confirmation?.close(false); masks.destroy(); dates.destroy();
                const element = instance.el; queueMicrotask(() => { instance.destroy(); element.remove(); });
                onClosed?.(); if (saved) onSaved?.(saved);
                if (focus?.isConnected) focus.focus({ preventScroll: true });
            },
        },
    });
    const root = popup.el, form = root.querySelector('form'), error = root.querySelector('.goal-feedback');
    root.querySelector('h1').id = `${id}-title`;
    const masks = mountMasks(form), dates = mountDateFields(form, ctx.app);
    let movementType = movement?.type || type;
    function values() {
        return isGoal ? { name: form.elements.name.value.trim(), icon: chosenIcon, target_cents: masks.get(form.elements.target).getCents(), deadline: form.elements.has_deadline.checked ? form.elements.deadline.value || null : null }
            : { type: movementType, amount_cents: masks.get(form.elements.amount).getCents(), movement_date: form.elements.date.value, notes: form.elements.notes.value.trim() || null };
    }
    const initial = JSON.stringify(values());
    function setBusy(value) {
        busy = value; form.setAttribute('aria-busy', String(value)); form.querySelector('fieldset').disabled = value;
        for (const button of root.querySelectorAll('button')) button.disabled = value;
        root.querySelector('[data-goal-submit]').textContent = value ? 'Salvando…' : isGoal ? editing ? 'Salvar objetivo' : 'Criar objetivo' : 'Salvar movimentação';
    }
    function showError(text) { error.textContent = text; error.hidden = false; error.focus(); }
    async function persist(remove = false) {
        if (!alive || busy || confirmation) return;
        const data = values();
        if (!remove) {
            if (isGoal && (!data.name || !data.target_cents)) { showError('Informe o nome e um valor desejado maior que zero.'); return; }
            if (!isGoal && (!data.amount_cents || !validDate(data.movement_date))) { showError('Informe um valor maior que zero e uma data válida.'); return; }
            if (isGoal && form.elements.has_deadline.checked && !validDate(data.deadline)) { showError('Selecione uma data válida para o prazo.'); return; }
        }
        error.hidden = true; setBusy(true);
        try {
            const response = remove ? await deleteMovement(goal, movement.id) : isGoal
                ? await saveGoal(goal?.id, { ...data, ...(editing ? { version: goal.version } : { request_key: requestKey }) })
                : await saveMovement(goal, movement?.id, { ...data, ...(!editing ? { request_key: requestKey } : {}) });
            if (!alive) return; saved = response.data; popup.close();
        } catch (failure) {
            if (!alive) return;
            if (failure.status === 401) { close(true); ctx.expireSession(); return; }
            showError(goalError(failure));
        } finally { if (alive && !saved) setBusy(false); }
    }
    function close(force = false) {
        if (!alive || (!force && (busy || confirmation))) return;
        if (!force && picker) { picker.close(); return; }
        if (!force && JSON.stringify(values()) !== initial) {
            confirmation = ctx.app.dialog.create({ animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, title: 'Descartar alterações?', text: 'As alterações ainda não foram salvas.',
                buttons: [{ text: 'Continuar editando' }, { text: 'Descartar', color: 'red', onClick() { popup.close(); } }],
                on: { closed() { confirmation = null; } },
            }).open();
        } else popup.close(force ? false : popup.params.animate);
    }
    form.addEventListener('submit', event => { event.preventDefault(); void persist(); }, { signal: events.signal });
    root.addEventListener('click', event => {
        const button = event.target.closest('button'); if (!button || busy || confirmation) return;
        if (button.hasAttribute('data-goal-cancel')) close();
        if (button.hasAttribute('data-goal-icon') && !picker) picker = openIconPicker(ctx.app, {
            animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            value: chosenIcon, onSelect(value) { chosenIcon = value; root.querySelector('[data-goal-icon-preview]').innerHTML = icon(safeIcon(value)); root.querySelector('[data-goal-icon-label]').textContent = iconLabel(safeIcon(value)); },
            onClosed() { picker = null; if (alive) button.focus({ preventScroll: true }); },
        });
        if (button.dataset.movementType) {
            movementType = button.dataset.movementType;
            for (const item of root.querySelectorAll('[data-movement-type]')) item.setAttribute('aria-pressed', String(item.dataset.movementType === movementType));
        }
        if (button.hasAttribute('data-goal-remove-movement')) confirmation = ctx.app.dialog.create({ animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, title: 'Excluir movimentação?', text: 'O valor guardado será recalculado. Esta ação não altera os lançamentos financeiros.',
            buttons: [{ text: 'Cancelar' }, { text: 'Excluir', color: 'red', onClick() { confirmation = null; void persist(true); } }], on: { closed() { confirmation = null; } },
        }).open();
    }, { signal: events.signal });
    if (isGoal) form.elements.has_deadline.addEventListener('change', () => { root.querySelector('[data-goal-date]').hidden = !form.elements.has_deadline.checked; }, { signal: events.signal });
    root.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        if (event.key !== 'Tab') return;
        const items = [...root.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')].filter(el => el.tabIndex >= 0 && el.getClientRects().length);
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
    }, { signal: events.signal });
    popup.open();
    return { close, beforeLeave(_resolve, reject) { reject(); close(); } };
}
