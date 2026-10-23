import { pageHeader } from '../shared/page-header.js';
import { renderSpendingRanking } from '../dashboard/spending-ranking.js';
import { escapeHtml as esc, icon } from '../shared/html.js';
import { formatMoney as money } from '../shared/money.js';
import { safeIcon, safeColor } from '../categories/catalog.js';
import { validMonth, dateText } from '../shared/calendar.js';
import { monthPicker, wireMonthPicker } from '../shared/month-picker.js';
import { getReport } from './api.js';
import { REPORT_RANGES, validRange, reportData, periodLabel, comparisonLabel, changePresentation, expenseFrequencyLabel } from './data.js';

export function mountReports(root, ctx, route) {
    let alive = true, revision = 0, chartRevision = 0;
    let disposeCharts = () => {};
    if (validMonth(route.query?.month)) ctx.state.reportsMonth = route.query.month;
    if (validRange(route.query?.range)) ctx.state.reportsRange = route.query.range;
    const events = new AbortController();
    root.classList.add('reports-real');
    root.innerHTML = `${pageHeader('Relatórios', 'Entenda suas finanças')}<div data-report-month></div><div class="report-period" role="group" aria-label="Período do relatório">${REPORT_RANGES.map(([value, label]) => `<button type="button" data-report-range="${value}" aria-pressed="false">${label}</button>`).join('')}</div><p class="period-note" data-report-period role="status"></p><div data-report-content aria-busy="false"></div>`;
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
    function changeMarkup(data, type) {
        const change = data.changes?.[type];
        if (!change || !data.previous_period) return '';
        const view = changePresentation(change, type);
        const previous = money(data.previous_period.totals[`${type}_cents`]);
        const difference = view.difference === null ? '—' : `${view.difference > 0 ? '+ ' : ''}${money(view.difference)}`;
        return `<span class="report-change ${view.tone}" data-report-change="${type}">${esc(view.label)}</span><small class="report-previous">Anterior: ${esc(previous)}</small><small class="report-difference">Diferença: ${esc(difference)}</small>`;
    }
    function summaryCards(summary, data) {
        return `<div class="summary-grid">${[['income', 'Entradas', 'arrow_up', summary.income, summary.incomeCount], ['expense', 'Saídas', 'arrow_down', summary.expense, summary.expenseCount]].map(([type, label, glyph, total, count]) => `<div class="finance-card summary-card ${money(total).length > 11 ? 'summary-card-wide' : ''}"><span class="summary-icon ${type}">${icon(glyph)}</span><span><span class="summary-label">${label}</span><strong class="${type}" data-report-total="${type}">${money(total)}</strong><small>${count} ${count === 1 ? 'lançamento' : 'lançamentos'}</small>${changeMarkup(data, type)}</span></div>`).join('')}</div>`;
    }
    function comparisonSummary(data) {
        if (!data.previous_period || !data.changes) return '';
        return `<section class="finance-card report-result-comparison" aria-label="Comparação do resultado do período"><div><span>Resultado do período</span><strong class="${data.totals.result_cents < 0 ? 'expense' : 'income'}" data-report-total="result">${money(data.totals.result_cents)}</strong></div><div class="report-result-change">${changeMarkup(data, 'result')}</div><p>Comparado com ${esc(comparisonLabel(data.previous_period))}. Resultado é a diferença entre entradas e saídas. A variação percentual só é calculada quando a base anterior é positiva.</p></section>`;
    }
    function insightCards(data) {
        if (!data.insights) return '';
        const largest = data.insights.largest_expense, frequent = data.insights.most_used_expense_category;
        const badge = (category, fallback, tone) => `<span class="report-insight-icon ${tone}" style="--category-color:${safeColor(category?.color)}">${icon(category ? safeIcon(category.icon) : fallback)}</span>`;
        return `<div class="report-insights-grid"><section class="finance-card report-insight-card" data-report-insight="largest">${badge(largest?.category, 'tag', 'report-icon-warm')}<div><h2>Maior gasto</h2>${largest ? `<p class="report-insight-name">${esc(largest.description)}</p><p class="report-insight-meta">${esc(largest.category.name)} · ${esc(dateText(largest.transaction_date))}${largest.category.is_active ? '' : ' · Categoria inativa'}</p><strong class="expense">${money(largest.amount_cents)}</strong>` : '<p class="report-insight-empty">Nenhuma despesa no período.</p>'}</div></section><section class="finance-card report-insight-card" data-report-insight="frequent">${badge(frequent?.category, 'tag', 'report-icon-purple')}<div><h2>Categoria mais usada</h2>${frequent ? `<p class="report-insight-name">${esc(frequent.category.name)}${frequent.category.is_active ? '' : ' (inativa)'}</p><p class="report-insight-meta">${esc(expenseFrequencyLabel(frequent.transaction_count, data.totals.expense_count))}</p><small>Por quantidade de despesas, não pelo valor gasto.</small>` : '<p class="report-insight-empty">Nenhuma despesa no período.</p>'}</div></section></div>`;
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
        const barPeriod = esc(comparisonLabel(data.income_expense_period || data.period));
        content.innerHTML = `${summaryCards(summary, data)}${data.previous_period ? `<p class="report-comparison-period" data-report-previous>Comparado com ${esc(comparisonLabel(data.previous_period))}</p>` : ''}${data.totals.income_count + data.totals.expense_count === 0 ? '<p class="report-empty-note" role="status">Nenhum lançamento no período selecionado.</p>' : ''}<div class="reports-grid"><section class="finance-card category-card spending-rank-card"><div class="card-heading"><h2>Despesas por categoria</h2></div>${renderSpendingRanking(data.by_category, summary.expense, { limit: null, emptyMessage: 'Nenhuma despesa neste período.' })}</section><section class="finance-card monthly-comparison-card"><div class="card-heading"><h2>Entradas × Despesas</h2></div><p class="monthly-comparison-subtitle">${barPeriod}</p><div class="report-comparison-scroll" tabindex="0" role="region" aria-label="Comparação mensal de entradas e despesas"><div class="report-comparison-chart ${summary.expenseHistory.length > 6 ? 'report-comparison-year' : ''}" data-chart="report-income-expenses" role="img" aria-label="Entradas em verde e despesas em vermelho: ${barPeriod}"></div></div></section></div>${insightCards(data)}${comparisonSummary(data)}`;
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
    const unbindMonth = wireMonthPicker(root, () => ctx.state.reportsMonth, month => { ctx.state.reportsMonth = month; void load(); }, ctx.app);
    root.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
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
