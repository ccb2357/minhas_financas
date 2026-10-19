import { escapeHtml as esc, icon } from '../shared/html.js';
import { formatMoney as money } from '../shared/money.js';
import { validMonth } from '../shared/calendar.js';
import { monthPicker, wireMonthPicker } from '../shared/month-picker.js';
import { getReport } from './api.js';
import { REPORT_RANGES, validRange, reportData, periodLabel, comparisonLabel } from './data.js';

export function mountReports(root, ctx, route) {
    let alive = true, revision = 0, chartRevision = 0;
    let disposeCharts = () => {};
    if (validMonth(route.query?.month)) ctx.state.reportsMonth = route.query.month;
    if (validRange(route.query?.range)) ctx.state.reportsRange = route.query.range;
    const events = new AbortController();
    root.classList.add('reports-real');
    root.innerHTML = `<header class="finance-header"><a href="/mais/" class="link icon-button" aria-label="Abrir configurações">${icon('gear_alt')}</a><h1 tabindex="-1">Relatórios</h1><button class="icon-button" type="button" data-report-help aria-label="Sobre os períodos dos relatórios">${icon('info_circle')}</button></header><div data-report-month></div><div class="report-period" role="group" aria-label="Período do relatório">${REPORT_RANGES.map(([value, label]) => `<button type="button" data-report-range="${value}" aria-pressed="false">${label}</button>`).join('')}</div><p class="period-note" data-report-period role="status"></p><div data-report-content aria-busy="false"></div>`;
    const monthBox = root.querySelector('[data-report-month]');
    const periodNote = root.querySelector('[data-report-period]');
    const content = root.querySelector('[data-report-content]');

    function destroyCharts() { chartRevision++; disposeCharts(); disposeCharts = () => {}; }
    function controls() {
        monthBox.innerHTML = monthPicker(ctx.state.reportsMonth);
        for (const button of root.querySelectorAll('[data-report-range]')) {
            button.setAttribute('aria-pressed', String(button.dataset.reportRange === ctx.state.reportsRange));
        }
        periodNote.textContent = periodLabel(ctx.state.reportsMonth, ctx.state.reportsRange);
    }
    function summaryCards(summary) {
        return `<div class="summary-grid">${[['income', 'Entradas', 'arrow_up', summary.income, summary.incomeCount], ['expense', 'Saídas', 'arrow_down', summary.expense, summary.expenseCount]].map(([type, label, glyph, total, count]) => `<div class="finance-card summary-card ${money(total).length > 11 ? 'summary-card-wide' : ''}"><span class="summary-icon ${type}">${icon(glyph)}</span><span><span class="summary-label">${label}</span><strong class="${type}" data-report-total="${type}">${money(total)}</strong><small>${count} ${count === 1 ? 'lançamento' : 'lançamentos'}</small></span></div>`).join('')}</div>`;
    }
    function categoryChart(summary) {
        return `<div class="category-chart-layout"><div class="donut-container"><div class="donut-chart" data-chart="categories" role="img" aria-label="Despesas por categoria: ${esc(money(summary.expense))}"></div><div class="donut-label"><strong>${money(summary.expense)}</strong><span>no período</span></div></div><ul class="category-legend">${summary.byCategory.length ? summary.byCategory.map(category => `<li><span class="category-dot" style="background:${category.color}"></span><span class="report-category-name" title="${esc(category.name)}">${esc(category.name)}</span><strong>${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(category.amount / summary.expense * 100)}%</strong></li>`).join('') : '<li>Sem despesas neste período</li>'}</ul></div>`;
    }
    async function charts(summary, current) {
        const version = ++chartRevision;
        try {
            const { mountCharts } = await import('../shared/charts.js');
            if (!alive || current !== revision || version !== chartRevision || !root.isConnected) return;
            disposeCharts = mountCharts(content, summary, summary.history);
        } catch {
            if (alive && current === revision && version === chartRevision) {
                for (const chart of content.querySelectorAll('[data-chart]')) chart.textContent = 'Não foi possível carregar o gráfico.';
            }
        }
    }
    function render(data, current) {
        const summary = reportData(data);
        const comparison = esc(comparisonLabel(data.comparison_period));
        content.innerHTML = `${summaryCards(summary)}${data.totals.income_count + data.totals.expense_count === 0 ? '<p class="report-empty-note" role="status">Nenhum lançamento no período selecionado.</p>' : ''}<div class="reports-grid"><section class="finance-card category-card"><div class="card-heading"><h2>Despesas por categoria</h2></div>${categoryChart(summary)}</section><section class="finance-card"><div class="card-heading"><h2>Entradas × Saídas</h2></div><p class="report-chart-period">${comparison}</p><div class="report-chart" data-chart="comparison" role="img" aria-label="Entradas e saídas: ${comparison}"></div></section></div><section class="finance-card evolution-card"><div class="card-heading"><h2>Evolução mensal</h2></div><p class="report-chart-period">${comparison}</p><div class="report-chart" data-chart="evolution" role="img" aria-label="Evolução das entradas, saídas e resultado: ${comparison}"></div></section>`;
        void charts(summary, current);
    }
    async function load() {
        if (!alive) return;
        const current = ++revision;
        destroyCharts(); controls();
        const month = ctx.state.reportsMonth, range = ctx.state.reportsRange;
        const router = root.closest('.view')?.f7View?.router;
        if (router?.currentRoute.path === '/relatorios/') {
            const url = `/relatorios/?${new URLSearchParams({ month, range })}`;
            if (router.currentRoute.url !== url) router.updateCurrentUrl(url);
        }
        content.setAttribute('aria-busy', 'true');
        content.innerHTML = '<div class="finance-card report-state" role="status"><span class="mf-spinner" aria-hidden="true"></span><p>Carregando seu relatório...</p></div>';
        try {
            const response = await getReport(month, range);
            if (!alive || current !== revision) return;
            render(response.data, current);
        } catch (error) {
            if (!alive || current !== revision) return;
            if (error.status === 401) { ctx.expireSession(); return; }
            content.innerHTML = `<div class="finance-card report-state" role="status">${icon('wifi_exclamationmark')}<h2>Não foi possível carregar seu relatório</h2><p>${error.status >= 500 ? 'Tente novamente em instantes.' : 'Confira sua conexão e tente novamente.'}</p><button type="button" class="mf-button mf-button-secondary" data-report-retry>Tentar novamente</button></div>`;
        } finally {
            if (alive && current === revision) content.setAttribute('aria-busy', 'false');
        }
    }
    const unbindMonth = wireMonthPicker(root, () => ctx.state.reportsMonth, month => { ctx.state.reportsMonth = month; void load(); });
    root.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.hasAttribute('data-report-help')) ctx.app.dialog.alert('Os totais e categorias seguem o período selecionado. “3 meses” inclui o mês escolhido e os dois anteriores; “Ano” vai de janeiro até o mês escolhido. No modo “Mês”, os gráficos comparam os últimos seis meses, conforme as datas indicadas. O resultado é a diferença entre entradas e saídas, sem acumular saldos de meses anteriores.', 'Seus relatórios');
        if (button.hasAttribute('data-report-retry')) void load();
        if (validRange(button.dataset.reportRange) && button.dataset.reportRange !== ctx.state.reportsRange) {
            ctx.state.reportsRange = button.dataset.reportRange; void load();
        }
    }, { signal: events.signal });
    ctx.events.addEventListener('transactions:changed', () => {
        if (alive && root.closest('.page').classList.contains('page-current')) void load();
    }, { signal: events.signal });
    return {
        refresh() { void load(); },
        destroy() { alive = false; revision++; destroyCharts(); events.abort(); unbindMonth(); },
    };
}
