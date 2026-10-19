import { escapeHtml as esc, icon } from '../shared/html.js';
import { formatMoney as money } from '../shared/money.js';
import { validMonth, monthLabel, dateText } from '../shared/calendar.js';
import { monthPicker, wireMonthPicker } from '../demo/ui.js';
import { safeIcon, safeColor } from '../categories/catalog.js';
import { getTransaction, transactionError } from '../transactions/api.js';
import { getDashboard } from './api.js';
import { dashboardData, resultChange } from './data.js';

export function mountDashboard(root, ctx, route) {
    let alive = true, revision = 0, chartRevision = 0;
    let disposeCharts = () => {};
    if (validMonth(route.query?.month)) ctx.state.dashboardMonth = route.query.month;
    const events = new AbortController();
    root.classList.add('dashboard-real');
    root.innerHTML = `<header class="finance-header"><a href="/mais/" class="link icon-button" aria-label="Abrir configurações">${icon('gear_alt')}</a><h1 tabindex="-1">Minhas Finanças</h1><button class="icon-button" data-dashboard-info type="button" aria-label="Sobre o resultado do mês">${icon('info_circle')}</button></header><div data-dashboard-month></div><p class="dashboard-feedback" role="status" hidden></p><div data-dashboard-content aria-busy="false"></div>`;
    const monthBox = root.querySelector('[data-dashboard-month]');
    const content = root.querySelector('[data-dashboard-content]');
    const feedback = root.querySelector('.dashboard-feedback');
    monthBox.innerHTML = monthPicker(ctx.state.dashboardMonth);

    function destroyCharts() { chartRevision++; disposeCharts(); disposeCharts = () => {}; }
    function showFeedback(message, isError = false) { feedback.textContent = message; feedback.hidden = !message; feedback.classList.toggle('dashboard-feedback-error', isError); }
    function historyUrl(type = '') {
        const query = new URLSearchParams({ month: ctx.state.dashboardMonth });
        if (type) query.set('tipo', type);
        return `/historico/?${query}`;
    }
    function categoryChart(summary) {
        return `<div class="category-chart-layout"><div class="donut-container"><div class="donut-chart" data-chart="categories" role="img" aria-label="Despesas por categoria: ${esc(money(summary.expense))}"></div><div class="donut-label"><strong>${money(summary.expense)}</strong><span>no período</span></div></div><ul class="category-legend">${summary.byCategory.length ? summary.byCategory.map(category => `<li><span class="category-dot" style="background:${category.color}"></span><span class="dashboard-category-name" title="${esc(category.name)}">${esc(category.name)}</span><strong>${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(category.amount / summary.expense * 100)}%</strong></li>`).join('') : '<li>Sem despesas</li>'}</ul></div>`;
    }
    function summaryCards(summary) {
        return `<div class="summary-grid">${[['income', 'Entradas', 'arrow_up', summary.income, summary.incomeCount], ['expense', 'Saídas', 'arrow_down', summary.expense, summary.expenseCount]].map(([type, label, glyph, total, count]) => `<a class="finance-card summary-card ${money(total).length > 11 ? 'summary-card-wide' : ''}" href="${esc(historyUrl(type))}"><span class="summary-icon ${type}">${icon(glyph)}</span><span><span class="summary-label">${label}</span><strong class="${type}" data-total="${type}">${money(total)}</strong><small>${count} ${count === 1 ? 'lançamento' : 'lançamentos'}</small></span>${icon('chevron_right')}</a>`).join('')}</div>`;
    }
    function latestRows(rows) {
        if (!rows.length) return `<div class="finance-empty"><span>Sem lançamentos neste período</span><p>Registre uma entrada ou saída para começar.</p><button type="button" class="mf-button mf-button-secondary" data-dashboard-create>Novo lançamento</button></div>`;
        return `<ul class="transaction-list">${rows.map(row => `<li><button type="button" class="transaction-row" data-dashboard-transaction="${row.id}" aria-label="Editar ${esc(row.description)}"><span class="category-badge" style="--category-color:${safeColor(row.category.color)}">${icon(safeIcon(row.category.icon))}</span><span class="transaction-copy"><strong>${esc(row.description)}</strong><span>${esc(row.category.name)}${row.category.is_active ? '' : ' (inativa)'} <span aria-hidden="true">·</span> ${dateText(row.transaction_date)}</span></span><span class="transaction-value ${row.type}">${row.type === 'income' ? '+' : '−'} ${money(row.amount_cents)}</span>${icon('chevron_right')}</button></li>`).join('')}</ul>`;
    }
    async function renderCharts(summary, current) {
        const chartVersion = ++chartRevision;
        try {
            const { mountCharts } = await import('../shared/charts.js');
            if (!alive || current !== revision || chartVersion !== chartRevision || !root.isConnected) return;
            disposeCharts = mountCharts(content, summary, summary.history);
        } catch {
            if (alive && current === revision && chartVersion === chartRevision) {
                for (const chart of content.querySelectorAll('[data-chart]')) chart.textContent = 'Não foi possível carregar o gráfico.';
            }
        }
    }
    function render(data, current) {
        const summary = dashboardData(data);
        const previous = data.previous_month;
        const change = resultChange(summary.result, previous.result_cents);
        const comparison = change === null ? '<span class="result-comparison-empty">Sem comparação</span>' : `<span class="result-change ${change < 0 ? 'negative' : ''}">${icon(change >= 0 ? 'chevron_up' : 'chevron_down')}${change > 0 ? '+' : ''}${change}%</span><small>em relação<br>a ${monthLabel(`${previous.year}-${String(previous.month).padStart(2, '0')}`).split(' de ')[0]}</small>`;
        content.innerHTML = `<section class="result-card ${money(summary.result).length > 11 ? 'result-card-long' : ''}" aria-label="Resultado disponível do mês"><div class="result-copy"><p>Resultado disponível do mês <button class="result-info" type="button" aria-label="Entender o resultado do mês" data-dashboard-info>${icon('info_circle')}</button></p><strong data-total="result">${money(summary.result)}</strong><div class="result-breakdown"><span>Entradas: ${money(summary.income)}</span><span>Saídas: ${money(summary.expense)}</span></div></div><div class="result-comparison">${comparison}</div><svg class="result-waves" aria-hidden="true" viewBox="0 0 600 130" preserveAspectRatio="none"><path d="M0 90C120-10 150 150 290 75S420 0 600 65V130H0Z"/><path d="M0 110C170 130 180-30 300 60S490 120 600 20"/></svg></section>${summaryCards(summary)}<div class="charts-grid"><section class="finance-card category-card"><div class="card-heading"><h2>Gastos por categoria</h2><a class="link icon-button" href="/relatorios/" aria-label="Abrir Relatórios, ainda em demonstração">${icon('chevron_right')}</a></div>${categoryChart(summary)}</section><section class="finance-card bar-card"><div class="card-heading"><h2>Últimos 6 meses</h2><a class="link icon-button" href="/relatorios/" aria-label="Abrir Relatórios, ainda em demonstração">${icon('chevron_right')}</a></div><div class="mini-bar-chart" data-chart="six-months" role="img" aria-label="Resultado disponível nos últimos seis meses"></div><p class="chart-caption">Resultado de cada mês</p></section></div><section class="finance-card latest-card"><div class="card-heading"><h2>Últimos lançamentos</h2><a class="link all-transactions" href="${esc(historyUrl())}">Ver todos ${icon('chevron_right')}</a></div>${latestRows(data.latest_transactions)}</section>`;
        void renderCharts(summary, current);
    }
    async function load() {
        if (!alive) return;
        const current = ++revision;
        destroyCharts();
        const month = ctx.state.dashboardMonth;
        monthBox.innerHTML = monthPicker(month);
        const router = root.closest('.view')?.f7View?.router;
        if (router && (router.currentRoute.route?.path || router.currentRoute.path) === '/inicio/') {
            const url = `/inicio/?${new URLSearchParams({ month })}`;
            if (router.currentRoute.url !== url) router.updateCurrentUrl(url);
        }
        content.setAttribute('aria-busy', 'true');
        content.innerHTML = '<div class="finance-card dashboard-state" role="status"><span class="mf-spinner" aria-hidden="true"></span><p>Carregando seu resumo...</p></div>';
        try {
            const response = await getDashboard(month);
            if (!alive || current !== revision) return;
            render(response.data, current);
        } catch (error) {
            if (!alive || current !== revision) return;
            if (error.status === 401) { ctx.expireSession(); return; }
            content.innerHTML = `<div class="finance-card dashboard-state" role="status">${icon('wifi_exclamationmark')}<h2>Não foi possível carregar seu resumo</h2><p>${error.status >= 500 ? 'Tente novamente em instantes.' : 'Confira sua conexão e tente novamente.'}</p><button type="button" class="mf-button mf-button-secondary" data-dashboard-retry>Tentar novamente</button></div>`;
        } finally {
            if (alive && current === revision) content.setAttribute('aria-busy', 'false');
        }
    }
    const unbindMonth = wireMonthPicker(root, () => ctx.state.dashboardMonth, month => {
        ctx.state.dashboardMonth = month; ctx.state.dashboardFeedback = ''; showFeedback(''); void load();
    });
    root.addEventListener('click', async event => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.hasAttribute('data-dashboard-retry')) void load();
        if (button.hasAttribute('data-dashboard-create')) ctx.openTransaction();
        if (button.hasAttribute('data-dashboard-info')) ctx.app.dialog.alert('É a diferença entre as entradas e as saídas do mês selecionado. Não inclui valores acumulados de meses anteriores nem representa um saldo bancário. A comparação percentual aparece quando o mês anterior tem resultado positivo.', 'Resultado do mês');
        if (button.dataset.dashboardTransaction) {
            const current = revision;
            button.disabled = true;
            try {
                const response = await getTransaction(button.dataset.dashboardTransaction);
                if (alive && current === revision && root.closest('.page').classList.contains('page-current')) ctx.openTransaction({ transaction: response.data });
            } catch (error) {
                if (!alive || current !== revision) return;
                if (error.status === 401) { ctx.expireSession(); return; }
                showFeedback(transactionError(error), true);
                if (error.status === 404) void load();
            } finally { button.disabled = false; }
        }
    }, { signal: events.signal });
    ctx.events.addEventListener('transactions:changed', () => {
        if (alive && root.closest('.page').classList.contains('page-current')) {
            showFeedback(ctx.state.dashboardFeedback); void load();
        }
    }, { signal: events.signal });
    return {
        refresh() { showFeedback(ctx.state.dashboardFeedback); void load(); },
        destroy() { alive = false; revision++; destroyCharts(); events.abort(); unbindMonth(); },
    };
}
