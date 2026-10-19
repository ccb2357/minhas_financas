import { escapeHtml as esc, icon } from '../shared/html.js';
import { formatMoney as money } from '../shared/money.js';
import { validMonth } from '../shared/calendar.js';
import { monthPicker, wireMonthPicker } from '../shared/month-picker.js';
import { safeColor, safeIcon } from '../categories/catalog.js';
import { listBudgets, getBudget, budgetError } from './api.js';
import { progressPercent, percentLabel, shortPercentLabel, budgetTone, remainingLabel } from './data.js';

export function mountBudgets(root, ctx, route) {
    let alive = true, revision = 0, loading = false, page = 0, lastPage = 1, rows = [];
    if (validMonth(route.query?.month)) ctx.state.budgetMonth = route.query.month;
    const events = new AbortController();
    root.classList.add('budgets-container');
    root.innerHTML = `<header class="finance-header"><a href="/mais/" class="link icon-button" aria-label="Voltar para Mais">${icon('gear_alt')}</a><h1 tabindex="-1">Orçamento mensal</h1><button class="icon-button" type="button" data-budget-help aria-label="Sobre os orçamentos">${icon('info_circle')}</button></header><div data-budget-month></div><p class="budget-feedback" role="status" hidden></p><section class="budget-results" aria-label="Orçamentos do mês" aria-busy="false"><div data-budget-summary></div><p class="budget-unbudgeted" role="status" hidden></p><p class="budget-count" role="status"></p><div class="budget-list"></div><div class="budget-list-state" role="status"></div><button type="button" class="mf-button mf-button-secondary budget-more" data-budget-more hidden>Carregar mais</button></section><button type="button" class="budget-create-button" data-budget-create>${icon('plus')}<span>Novo orçamento</span></button>`;
    const monthBox = root.querySelector('[data-budget-month]'), results = root.querySelector('.budget-results');
    const summaryBox = root.querySelector('[data-budget-summary]'), unbudgeted = root.querySelector('.budget-unbudgeted');
    const count = root.querySelector('.budget-count'), list = root.querySelector('.budget-list');
    const stateBox = root.querySelector('.budget-list-state'), more = root.querySelector('[data-budget-more]');
    const feedback = root.querySelector('.budget-feedback');
    monthBox.innerHTML = monthPicker(ctx.state.budgetMonth);
    function showFeedback(message, error = false) {
        feedback.textContent = message; feedback.hidden = !message; feedback.classList.toggle('budget-feedback-error', error);
    }
    function renderSummary(summary) {
        const label = percentLabel(summary.used_percent), progress = progressPercent(summary.used_percent);
        summaryBox.innerHTML = `<section class="budget-summary" aria-label="Orçamento total utilizado"><div class="budget-summary-copy"><p>Orçamento total utilizado <button class="result-info" type="button" data-budget-help aria-label="Entender o orçamento total">${icon('info_circle')}</button></p><strong class="${label.length > 8 ? 'budget-percent-compact' : ''}" data-budget-percent>${label}</strong><span class="budget-summary-values" data-budget-summary-values>${summary.budget_count ? `${money(summary.spent_cents)} de ${money(summary.limit_cents)}` : 'Nenhum orçamento definido neste mês'}</span></div><div class="budget-summary-ring ${label.length > 6 ? 'budget-ring-compact' : ''}" role="img" aria-label="${summary.budget_count ? `${label} do orçamento utilizado` : 'Sem orçamento definido'}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="budget-ring-track" cx="60" cy="60" r="48"/><circle class="budget-ring-value" cx="60" cy="60" r="48" pathLength="100" stroke-dasharray="${progress} 100" opacity="${progress > 0 ? 1 : 0}"/></svg><strong>${summary.budget_count ? shortPercentLabel(summary.used_percent) : '—'}</strong></div><svg class="result-waves" aria-hidden="true" viewBox="0 0 600 130" preserveAspectRatio="none"><path d="M0 90C120-10 150 150 290 75S420 0 600 65V130H0Z"/><path d="M0 110C170 130 180-30 300 60S490 120 600 20"/></svg></section>`;
        unbudgeted.textContent = summary.unbudgeted_expense_cents > 0 ? `${money(summary.unbudgeted_expense_cents)} em despesas sem orçamento neste mês.` : '';
        unbudgeted.hidden = !unbudgeted.textContent;
        count.textContent = `${summary.budget_count} ${summary.budget_count === 1 ? 'orçamento no mês' : 'orçamentos no mês'}`;
    }
    function renderRows() {
        list.innerHTML = rows.map(row => {
            const label = percentLabel(row.used_percent), tone = budgetTone(row.status);
            return `<button type="button" class="finance-card budget-card ${tone}" data-budget-id="${row.id}" aria-label="Editar orçamento de ${esc(row.category.name)}"><span class="budget-category-icon" style="--category-color:${safeColor(row.category.color)}">${icon(safeIcon(row.category.icon))}</span><span class="budget-card-content"><span class="budget-card-heading"><strong>${esc(row.category.name)}</strong><span class="budget-pill">${label} utilizado</span></span><span class="budget-card-values"><strong>${money(row.spent_cents)}</strong><span aria-hidden="true"> / </span><span>${money(row.limit_cents)}</span></span><span class="budget-progress-row"><span class="budget-progress-track" role="progressbar" aria-label="Utilização do orçamento de ${esc(row.category.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressPercent(row.used_percent)}" aria-valuetext="${label} utilizado"><span style="width:${progressPercent(row.used_percent)}%"></span></span><span title="${label}">${shortPercentLabel(row.used_percent)}</span></span>${['at_limit', 'over_limit'].includes(row.status) || !row.category.is_active ? `<small class="budget-remaining">${remainingLabel(row.remaining_cents)}${row.category.is_active ? '' : ' · Categoria inativa'}</small>` : ''}</span>${icon('chevron_right')}</button>`;
        }).join('');
    }
    async function load(append = false) {
        if (!alive || append && loading) return;
        const current = ++revision; loading = true; more.hidden = true; more.disabled = true;
        results.setAttribute('aria-busy', 'true'); monthBox.innerHTML = monthPicker(ctx.state.budgetMonth);
        const router = root.closest('.view')?.f7View?.router;
        if (router?.currentRoute.path === '/orcamentos/') {
            const url = `/orcamentos/?${new URLSearchParams({ month: ctx.state.budgetMonth })}`;
            if (router.currentRoute.url !== url) router.updateCurrentUrl(url);
        }
        if (!append) { rows = []; list.replaceChildren(); summaryBox.replaceChildren(); count.textContent = ''; unbudgeted.hidden = true; }
        stateBox.innerHTML = '<span class="mf-spinner" aria-hidden="true"></span><span>Carregando orçamentos...</span>';
        try {
            const response = await listBudgets(ctx.state.budgetMonth, append ? page + 1 : 1);
            if (!alive || current !== revision) return;
            rows = append ? [...new Map([...rows, ...response.data].map(row => [row.id, row])).values()] : response.data;
            page = response.meta.current_page; lastPage = response.meta.last_page;
            renderSummary(response.meta.summary); renderRows();
            stateBox.innerHTML = rows.length ? '' : `<span class="budget-empty-icon">${icon('money_dollar_circle')}</span><h2>Seu planejamento começa aqui</h2><p>Defina um limite por categoria de despesa e acompanhe os gastos deste mês.</p><button type="button" class="mf-button mf-button-secondary" data-budget-create>Criar orçamento</button>`;
            more.hidden = page >= lastPage;
        } catch (error) {
            if (!alive || current !== revision) return;
            if (error.status === 401) { ctx.expireSession(); return; }
            stateBox.innerHTML = `<span class="budget-empty-icon">${icon('wifi_exclamationmark')}</span><h2>Não foi possível carregar</h2><p>${error.status >= 500 ? 'Tente novamente em instantes.' : 'Confira sua conexão e tente novamente.'}</p><button type="button" class="mf-button mf-button-secondary" data-budget-retry="${append ? 'more' : 'all'}">Tentar novamente</button>`;
        } finally {
            if (alive && current === revision) { loading = false; results.setAttribute('aria-busy', 'false'); more.disabled = false; }
        }
    }
    const unbindMonth = wireMonthPicker(root, () => ctx.state.budgetMonth, month => {
        ctx.state.budgetMonth = month; showFeedback(''); void load();
    });
    root.addEventListener('click', async event => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.hasAttribute('data-budget-create')) ctx.openBudget({ month: ctx.state.budgetMonth });
        if (button.hasAttribute('data-budget-more')) void load(true);
        if (button.hasAttribute('data-budget-retry')) void load(button.dataset.budgetRetry === 'more');
        if (button.hasAttribute('data-budget-help')) ctx.app.dialog.alert('Cada categoria de despesa pode ter um limite por mês. Os gastos vêm dos lançamentos daquele mês, inclusive os registrados antes do orçamento. O resumo considera as categorias com orçamento; despesas sem limite aparecem separadamente. A partir de 80% há um alerta, e o percentual pode ultrapassar 100%. Remover um orçamento preserva seus lançamentos.', 'Seu orçamento mensal');
        if (button.dataset.budgetId) {
            const current = revision; button.disabled = true;
            try {
                const response = await getBudget(button.dataset.budgetId);
                if (alive && current === revision && root.closest('.page').classList.contains('page-current')) ctx.openBudget({ budget: response.data });
            } catch (error) {
                if (!alive || current !== revision) return;
                if (error.status === 401) { ctx.expireSession(); return; }
                showFeedback(budgetError(error), true); if (error.status === 404) void load();
            } finally { button.disabled = false; }
        }
    }, { signal: events.signal });
    ctx.events.addEventListener('budgets:changed', event => {
        if (alive && root.closest('.page').classList.contains('page-current')) {
            showFeedback({ created: 'Orçamento salvo.', updated: 'Limite atualizado.', deleted: 'Orçamento removido. Seus lançamentos foram preservados.' }[event.detail.kind]);
            void load();
        }
    }, { signal: events.signal });
    ctx.events.addEventListener('transactions:changed', () => {
        if (alive && root.closest('.page').classList.contains('page-current')) void load();
    }, { signal: events.signal });
    return {
        refresh() { void load(); },
        destroy() { alive = false; revision++; events.abort(); unbindMonth(); },
    };
}
