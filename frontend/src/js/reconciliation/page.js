import { pageHeader } from '../shared/page-header.js';
import { escapeHtml as esc, icon } from '../shared/html.js';
import { formatMoney } from '../shared/money.js';
import { notifySuccess } from '../shared/notifications.js';
import { demoBanks, demoTransactions, demoCategories } from './demo-data.js';

export function mountReconciliation(root, ctx) {
    const events = new AbortController();
    // Survives navigation in this workspace, but never writes localStorage or the API.
    const session = ctx.state.reconciliationDemo ||= { decisions: {}, bank: '' };
    let alive = true, confirmation;
    root.classList.add('reconciliation-page');

    function pending() {
        return demoTransactions.filter(row => !session.decisions[row.id] && (!session.bank || row.item_id === session.bank));
    }
    function bankName(row) {
        return demoBanks.find(bank => bank.item_id === row.item_id)?.name || 'Banco';
    }
    function dateLabel(date) {
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
    }
    function focusStatus() {
        root.querySelector('[data-reconciliation-count]')?.focus({ preventScroll: true });
    }
    function render() {
        if (!alive) return;
        const rows = pending();
        root.innerHTML = `${pageHeader('Conciliação bancária', 'Atualização de transações.')}
            <div class="reconciliation-filters" role="group" aria-label="Filtrar por banco">
                ${[{ item_id: '', name: 'Todas' }, ...demoBanks].map(bank => `<button type="button" class="filter-chip" data-reconciliation-bank="${esc(bank.item_id)}" aria-pressed="${session.bank === bank.item_id}">${esc(bank.name)}</button>`).join('')}
            </div>
            <p class="reconciliation-preview-note">Prévia com dados fictícios. Suas finanças não serão alteradas.</p>
            <div class="reconciliation-heading" role="status" aria-live="polite" aria-atomic="true"><h2 tabindex="-1" data-reconciliation-count>${rows.length} ${rows.length === 1 ? 'transação para revisar' : 'transações para revisar'}</h2></div>
            <ul class="reconciliation-list" aria-label="Transações pendentes">
                ${rows.map(row => `<li class="finance-card reconciliation-card" data-reconciliation-id="${esc(row.id)}">
                    <div class="reconciliation-details"><div class="reconciliation-copy"><h3>${esc(row.description)}</h3><p>${esc(bankName(row))} · ${esc(dateLabel(row.date))}</p></div><strong class="reconciliation-amount ${row.signed_amount_cents < 0 ? 'expense' : 'income'}">${row.signed_amount_cents < 0 ? '−' : '+'} ${formatMoney(Math.abs(row.signed_amount_cents))}</strong></div>
                    <div class="reconciliation-actions"><button type="button" data-reconciliation-ignore aria-label="Ignorar ${esc(row.description)}">Ignorar</button><button type="button" class="reconciliation-add" data-reconciliation-add aria-label="Adicionar ${esc(row.description)}">${icon('plus')} Adicionar</button></div>
                </li>`).join('')}
            </ul>
            ${rows.length ? '' : `<section class="finance-card reconciliation-empty"><h3>Tudo revisado por aqui</h3><p>${session.bank ? 'Nenhuma transação pendente neste banco.' : 'Nenhuma transação pendente para revisar.'}</p></section>`}`;
    }

    root.addEventListener('click', event => {
        const filter = event.target.closest('[data-reconciliation-bank]');
        if (filter) {
            session.bank = filter.dataset.reconciliationBank;
            render();
            [...root.querySelectorAll('[data-reconciliation-bank]')].find(button => button.dataset.reconciliationBank === session.bank)?.focus({ preventScroll: true });
            return;
        }
        const card = event.target.closest('[data-reconciliation-id]');
        if (!card || confirmation) return;
        const row = demoTransactions.find(item => item.id === card.dataset.reconciliationId);
        if (!row || session.decisions[row.id]) return;
        if (event.target.closest('[data-reconciliation-ignore]')) {
            confirmation = ctx.app.dialog.create({
                animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                title: 'Ignorar transação?',
                text: `“${esc(row.description)}” será retirada da lista. Nesta prévia, a decisão vale somente durante esta sessão.`,
                buttons: [
                    { text: 'Cancelar' },
                    { text: 'Ignorar', bold: true, onClick() {
                        if (!alive) return;
                        session.decisions[row.id] = { status: 'ignored' };
                        render(); focusStatus();
                        notifySuccess(ctx.app, 'Transação ignorada na demonstração.');
                    } },
                ],
                on: { closed() { confirmation = null; } },
            }).open();
        }
        if (event.target.closest('[data-reconciliation-add]')) {
            ctx.openTransaction({
                draft: {
                    type: row.signed_amount_cents < 0 ? 'expense' : 'income',
                    amount_cents: Math.abs(row.signed_amount_cents),
                    description: row.description, transaction_date: row.date,
                },
                preview: {
                    categories: demoCategories,
                    save: async data => ({ data: { ...data, external_transaction_id: row.id } }),
                },
                onSaved(transaction) {
                    if (!alive || session.decisions[row.id]) return;
                    session.decisions[row.id] = { status: 'added', transaction };
                    render(); focusStatus();
                    notifySuccess(ctx.app, 'Lançamento adicionado à demonstração.');
                },
            });
        }
    }, { signal: events.signal });

    function leave() { confirmation?.close(false); confirmation = null; }
    render();
    return { refresh: render, leave, destroy() { alive = false; leave(); events.abort(); } };
}
