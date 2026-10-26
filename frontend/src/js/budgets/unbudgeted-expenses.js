import { knownCycle, cycleDates } from '../cycles/state.js';
import { listTransactions } from '../transactions/api.js';
import { escapeHtml as esc, icon } from '../shared/html.js';
import { formatMoney as money } from '../shared/money.js';
import { dateText } from '../shared/calendar.js';
import { safeIcon, safeColor } from '../categories/catalog.js';
import { pageHeader } from '../shared/page-header.js';

export function openUnbudgetedExpenses(ctx, month, onClosed) {
    let alive = true, busy = false, page = 0, lastPage = 1, rows = [], revision = 0;
    const focus = document.activeElement;
    const events = new AbortController();
    const popup = ctx.app.popup.create({
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        closeByBackdropClick: true, closeOnEscape: true, swipeToClose: false,
        content: `<div class="popup unbudgeted-popup" role="dialog" aria-modal="true" aria-labelledby="unbudgeted-title"><div class="unbudgeted-scroll"><div class="unbudgeted-content finance-container"><div class="unbudgeted-heading">${pageHeader('Sem orçamento', 'Gastos fora do planejamento')}</div><p class="unbudgeted-period">${esc(cycleDates(knownCycle(month)))}</p><div class="finance-card unbudgeted-total"><span>Total sem orçamento</span><strong data-unbudgeted-total>—</strong></div><div class="finance-card unbudgeted-transactions"><ul class="transaction-list" data-unbudgeted-list></ul></div><div class="unbudgeted-state" role="status"></div><button type="button" class="mf-button mf-button-secondary" data-unbudgeted-more hidden>Carregar mais</button></div></div><footer class="unbudgeted-footer"><button type="button" class="mf-button mf-button-primary" data-unbudgeted-close>Voltar ao orçamento</button></footer></div>`,
        on: {
            opened() { popup.el.querySelector('[data-unbudgeted-close]').focus(); },
            closed(instance) {
                alive = false; revision++; events.abort();
                const element = instance.el;
                queueMicrotask(() => { instance.destroy(); element.remove(); });
                onClosed?.();
                if (focus?.isConnected) focus.focus({ preventScroll: true });
            },
        },
    });
    const root = popup.el;
    root.querySelector('.page-hero h1').id = 'unbudgeted-title';
    const state = root.querySelector('.unbudgeted-state');
    const more = root.querySelector('[data-unbudgeted-more]');
    async function load() {
        if (!alive || busy) return;
        busy = true; const current = ++revision; more.hidden = true;
        state.textContent = 'Carregando despesas...';
        try {
            const response = await listTransactions({ month, type: 'expense', unbudgeted: true, page: page + 1 });
            if (!alive || current !== revision) return;
            rows = [...new Map([...rows, ...response.data].map(row => [row.id, row])).values()];
            page = response.meta.current_page; lastPage = response.meta.last_page;
            root.querySelector('[data-unbudgeted-total]').textContent = money(response.meta.total_amount_cents);
            root.querySelector('[data-unbudgeted-list]').innerHTML = rows.map(row => `<li><div class="transaction-row"><span class="category-badge" style="--category-color:${safeColor(row.category.color)}">${icon(safeIcon(row.category.icon))}</span><span class="transaction-copy"><strong>${esc(row.description)}</strong><span>${esc(row.category.name)}${row.category.is_active ? '' : ' (inativa)'} · ${dateText(row.transaction_date)}</span></span><span class="transaction-value expense">− ${money(row.amount_cents)}</span></div></li>`).join('');
            state.textContent = rows.length ? '' : 'Nenhuma despesa sem orçamento neste ciclo.';
            more.hidden = page >= lastPage;
        } catch (error) {
            if (!alive || current !== revision) return;
            if (error.status === 401) { popup.close(false); ctx.expireSession(); return; }
            state.innerHTML = '<p>Não foi possível carregar as despesas.</p><button type="button" class="mf-button mf-button-secondary" data-unbudgeted-retry>Tentar novamente</button>';
        } finally { if (alive && current === revision) busy = false; }
    }
    root.addEventListener('click', event => {
        if (event.target.closest('[data-unbudgeted-close]')) popup.close();
        if (event.target.closest('[data-unbudgeted-more],[data-unbudgeted-retry]')) void load();
    }, { signal: events.signal });
    popup.open(); void load();
    return { close: animate => popup.close(animate) };
}
