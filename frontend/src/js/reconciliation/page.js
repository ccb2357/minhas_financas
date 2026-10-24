import { pageHeader } from '../shared/page-header.js';
import { escapeHtml as esc, icon } from '../shared/html.js';
import { formatMoney } from '../shared/money.js';
import { notifySuccess } from '../shared/notifications.js';
import { listOperations, synchronize, ignoreOperation, addOperation, reconciliationError } from './api.js';
const bankLogos = import.meta.glob('../../svg/*.svg', { eager: true, query: '?url', import: 'default' });

export function mountReconciliation(root, ctx) {
    const events = new AbortController();
    let alive = true, revision = 0, syncing = false, loading = false, mutating = false, editing = false, confirmation;
    let rows = [], page = 0, lastPage = 1, complete = false, warning = '';
    root.classList.add('reconciliation-page');
    root.innerHTML = `${pageHeader('Conciliação bancária', 'Atualização de transações.')}<p class="reconciliation-feedback" role="status" hidden></p><ul class="reconciliation-list" aria-label="Transações pendentes" tabindex="-1"></ul><div class="reconciliation-state" role="status"></div><button type="button" class="mf-button mf-button-secondary reconciliation-more" data-reconciliation-more hidden>Carregar mais</button><button type="button" class="reconciliation-refresh" data-reconciliation-sync>${icon('arrow_clockwise')}<span>Atualizar transações</span></button>`;
    const list = root.querySelector('.reconciliation-list'), state = root.querySelector('.reconciliation-state');
    const feedback = root.querySelector('.reconciliation-feedback'), more = root.querySelector('[data-reconciliation-more]');
    const busy = () => syncing || loading || mutating;
    function controls() {
        for (const button of root.querySelectorAll('button')) button.disabled = busy() || editing || button.dataset.unsupported === 'true';
        root.setAttribute('aria-busy', String(busy()));
        more.hidden = page >= lastPage;
        root.querySelector('[data-reconciliation-sync] span').textContent = syncing ? 'Consultando bancos...' : 'Atualizar transações';
    }
    function message(text) { feedback.textContent = text; feedback.hidden = !text; }
    function bankLogo(row) {
        const name = row.bank_name;
        const filename = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
        const source = bankLogos[`../../svg/${filename}.svg`];
        // A missing local asset must not hide the bank's identity.
        return source ? `<img class="reconciliation-bank-logo" src="${esc(source)}" alt="${esc(name)}" draggable="false">` : `<span>${esc(name)}</span>`;
    }
    function dateLabel(date) {
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
    }
    function amount(row) {
        const value = row.currency_code === 'BRL' ? formatMoney(row.amount_cents)
            : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: row.currency_code }).format(row.amount_cents / 100);
        return `${row.type === 'expense' ? '−' : '+'} ${value}`;
    }
    function render() {
        if (!alive) return;
        list.innerHTML = rows.map(row => `<li class="finance-card reconciliation-card" data-reconciliation-id="${row.id}"><div class="reconciliation-details"><div class="reconciliation-copy"><h3>${esc(row.description)}</h3><p class="reconciliation-meta">${bankLogo(row)}<span aria-hidden="true">·</span><time datetime="${esc(row.transaction_date)}">${esc(dateLabel(row.transaction_date))}</time></p></div><strong class="reconciliation-amount ${row.type}">${esc(amount(row))}</strong></div><div class="reconciliation-actions"><button type="button" data-reconciliation-ignore aria-label="Ignorar ${esc(row.description)}">Ignorar</button><button type="button" class="reconciliation-add" data-reconciliation-add data-unsupported="${row.currency_code !== 'BRL'}" ${row.currency_code !== 'BRL' ? 'title="A importação aceita somente operações em reais"' : ''} aria-label="Adicionar ${esc(row.description)}">${icon('plus')} Adicionar</button></div></li>`).join('');
        state.innerHTML = rows.length ? '' : `<section class="finance-card reconciliation-empty"><h3 tabindex="-1">${complete ? 'Tudo revisado por aqui' : 'Nenhuma operação carregada'}</h3><p>${complete ? 'Nenhuma transação pendente para revisar.' : 'Consulte os bancos para carregar as operações disponíveis.'}</p></section>`;
        controls();
    }
    async function load(append = false) {
        if (!alive || loading || (append && busy())) return false;
        const current = ++revision;
        loading = true; controls();
        if (!rows.length) state.textContent = 'Carregando operações...';
        try {
            const response = await listOperations(append ? page + 1 : 1);
            if (!alive || current !== revision) return false;
            rows = append ? [...new Map([...rows, ...response.data].map(row => [row.id, row])).values()] : response.data;
            page = response.meta.current_page; lastPage = response.meta.last_page;
            render(); return true;
        } catch (error) {
            if (!alive || current !== revision) return false;
            if (error.status === 401) { ctx.expireSession(); return false; }
            message(reconciliationError(error));
            if (!rows.length) state.innerHTML = '<section class="finance-card reconciliation-empty"><h3>Consulta não concluída</h3><p>Tente atualizar as transações novamente.</p></section>';
            return false;
        } finally { if (alive && current === revision) { loading = false; controls(); } }
    }
    async function refresh() {
        if (!alive || busy() || editing || confirmation) return;
        syncing = true; complete = false; warning = ''; message(''); controls();
        try {
            // Local reads do not call Pluggy. Existing pending operations remain available if a bank fails.
            if (!await load()) return;
            if (!alive) return;
            const response = await synchronize();
            if (!alive) return;
            complete = response.data.complete;
            warning = response.data.errors.map(item => `${item.bank}: ${item.message}`).join(' ');
            message(warning ? `Consulta incompleta. ${warning} As operações já recebidas continuam abaixo.` : '');
            await load();
        } catch (error) {
            if (!alive) return;
            if (error.status === 401) { ctx.expireSession(); return; }
            message(reconciliationError(error));
        } finally { if (alive) { syncing = false; controls(); } }
    }
    async function ignore(row) {
        if (!alive || busy()) return;
        mutating = true; controls();
        try {
            await ignoreOperation(row.id); if (!alive) return;
            rows = rows.filter(item => item.id !== row.id); render();
            await load(); notifySuccess(ctx.app, 'Transação ignorada.');
            root.querySelector('.reconciliation-list')?.focus({ preventScroll: true });
        } catch (error) {
            if (!alive) return;
            if (error.status === 401) { ctx.expireSession(); return; }
            message(reconciliationError(error));
            if ([404, 409].includes(error.status)) await load();
        } finally { if (alive) { mutating = false; controls(); } }
    }
    root.addEventListener('click', event => {
        if (event.target.closest('[data-reconciliation-sync]')) { void refresh(); return; }
        if (event.target.closest('[data-reconciliation-more]')) { void load(true); return; }
        if (busy() || editing || confirmation) return;
        const card = event.target.closest('[data-reconciliation-id]');
        const row = rows.find(item => String(item.id) === card?.dataset.reconciliationId);
        if (!row) return;
        if (event.target.closest('[data-reconciliation-ignore]')) {
            confirmation = ctx.app.dialog.create({ animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                title: 'Ignorar transação?', text: `“${esc(row.description)}” será retirada da conciliação e não entrará nos cálculos financeiros.`,
                buttons: [{ text: 'Cancelar' }, { text: 'Ignorar', bold: true, onClick() { void ignore(row); } }],
                on: { closed() { confirmation = null; } },
            }).open();
        }
        if (event.target.closest('[data-reconciliation-add]') && row.currency_code === 'BRL') {
            if (!ctx.state.cycleConfiguration?.configured) { void ctx.openCycleSettings(); return; }
            editing = true; controls();
            ctx.openTransaction({
                draft: { type: row.type, amount_cents: row.amount_cents, description: row.description, transaction_date: row.transaction_date },
                onSubmit: data => addOperation(row.id, data), stayOnPage: true,
                onClosed() { editing = false; if (alive) controls(); },
                onSaved() { if (alive) { rows = rows.filter(item => item.id !== row.id); render(); void load(); } },
            });
        }
    }, { signal: events.signal });
    render();
    function leave() { confirmation?.close(false); confirmation = null; }
    return { refresh, leave, destroy() { alive = false; revision++; leave(); events.abort(); } };
}
