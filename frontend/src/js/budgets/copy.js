import { icon } from '../shared/html.js';
import { validMonth, shiftMonth, monthLabel } from '../shared/calendar.js';
import { cycleDates, knownCycle } from '../cycles/state.js';
import { getCycleConfiguration } from '../cycles/api.js';
import { mountDateFields } from '../shared/date-picker.js';
import { copyBudget, budgetError } from './api.js';

let sequence = 0;
export function openBudgetCopy(ctx, { source: sourceMonth, summary, onSaved, onClosed } = {}) {
    const id = `budget-copy-${++sequence}`;
    const source = sourceMonth;
    const next = shiftMonth(source, 1);
    const initial = validMonth(next) ? next : shiftMonth(source, -1);
    const focus = document.activeElement, events = new AbortController();
    let alive = true, busy = false, closing = false, revision = 0, afterClose;
    const dialog = ctx.app.dialog.create({
        cssClass: 'budget-copy-dialog', animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        title: 'Copiar orçamentos', text: `${monthLabel(source)} · ${summary.budget_count} ${summary.budget_count === 1 ? 'categoria' : 'categorias'}`,
        buttons: [], closeByBackdropClick: false,
        content: `<form id="${id}" novalidate><label for="${id}-period">Ciclo de destino</label><input id="${id}-period" type="month" name="period" min="1900-01" max="2100-12" value="${initial}"><p class="budget-copy-error" data-copy-error role="alert" tabindex="-1" hidden></p><button type="submit" class="mf-button mf-button-primary" data-copy-confirm>Confirmar</button><button type="button" class="budget-cancel" data-copy-cancel>Cancelar</button></form>`,
        on: {
            opened() { dialog.el.querySelector('.mf-date-trigger')?.focus({ preventScroll: true }); },
            closed(instance) {
                alive = false; revision++; events.abort(); dates.destroy(); onClosed?.();
                const el = instance.el;
                queueMicrotask(() => { instance.destroy(); el.remove(); });
                if (focus?.isConnected && !focus.disabled) focus.focus({ preventScroll: true });
                afterClose?.();
            },
        },
    });
    const root = dialog.el, form = root.querySelector('form'), period = form.elements.period;
    const title = root.querySelector('.dialog-title'); title.id = `${id}-title`;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', title.id);
    const dates = mountDateFields(form, ctx.app);
    form.querySelector('.mf-date-trigger').insertAdjacentHTML('afterbegin', `<span class="budget-copy-calendar" aria-hidden="true">${icon('calendar')}</span>`);
    const error = form.querySelector('[data-copy-error]'), confirm = form.querySelector('[data-copy-confirm]'), cancel = form.querySelector('[data-copy-cancel]');
    function fail(message) { error.textContent = message; error.hidden = false; error.focus(); }
    function controls() {
        period.disabled = busy; confirm.disabled = busy; cancel.disabled = busy;
        form.setAttribute('aria-busy', String(busy)); confirm.textContent = busy ? 'Copiando...' : 'Confirmar';
    }
    async function showPeriod() {
        const current = ++revision, value = period.value;
        error.hidden = true;
        if (!validMonth(value)) { period.dataset.dateLabel = 'Selecione um ciclo válido.'; return; }
        period.dataset.dateLabel = cycleDates(knownCycle(value));
        if (knownCycle(value)) return;
        try { await getCycleConfiguration(value); if (alive && current === revision) period.dataset.dateLabel = cycleDates(knownCycle(value)); }
        catch { if (alive && current === revision) period.dataset.dateLabel = 'Período indisponível. Tente selecionar o ciclo novamente.'; }
    }
    function close(done) {
        if (!alive || closing) return;
        closing = true; afterClose = done; dialog.close();
    }
    form.addEventListener('change', () => { if (!busy) void showPeriod(); }, { signal: events.signal });
    cancel.addEventListener('click', () => { if (!busy) close(); }, { signal: events.signal });
    form.addEventListener('submit', async event => {
        event.preventDefault(); if (busy || closing || !alive) return;
        const value = period.value;
        if (!validMonth(value)) { fail('Selecione um ciclo entre janeiro de 1900 e dezembro de 2100.'); return; }
        if (value === source) { fail('Escolha um ciclo diferente do ciclo de origem.'); return; }
        busy = true; error.hidden = true; controls();
        try {
            const [year, month] = value.split('-').map(Number);
            const response = await copyBudget(source, { year, month });
            if (alive) close(() => onSaved?.(response.data));
        } catch (failure) {
            if (!alive) return;
            if (failure.status === 401) { ctx.expireSession(); return; }
            fail(Object.values(failure.errors || {}).flat()[0] || budgetError(failure));
        } finally { if (alive) { busy = false; controls(); } }
    }, { signal: events.signal });
    root.addEventListener('keydown', event => {
        if (root.querySelector('[aria-expanded="true"]')) return;
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!busy) close(); }
        if (event.key !== 'Tab') return;
        const controls = [...root.querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(el => el.offsetParent !== null);
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }, { signal: events.signal });
    window.addEventListener('beforeunload', event => { if (busy) { event.preventDefault(); event.returnValue = ''; } }, { signal: events.signal });
    void showPeriod(); dialog.open();
    return {
        close(force = false) { if (force) { afterClose = undefined; dialog.close(false); } else if (!busy) close(); },
        beforeLeave(resolve, reject) { if (busy || closing) reject(); else close(resolve); },
    };
}
