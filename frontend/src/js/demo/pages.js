import { categories, summarize, series, money, monthLabel, dateLabel } from './data.js';
import { escapeHtml as esc, icon, header, monthPicker, wireMonthPicker, transactionRows, openDetails } from './ui.js';

function categoryChart(summary) {
    return `<div class="category-chart-layout"><div class="donut-container"><div class="donut-chart" data-chart="categories" role="img" aria-label="Despesas por categoria: ${esc(money(summary.expense))}"></div><div class="donut-label"><strong>${money(summary.expense)}</strong><span>no período</span></div></div><ul class="category-legend">${summary.byCategory.length ? summary.byCategory.map(category => `<li><span class="category-dot" style="background:${category.color}"></span><span>${category.name}</span><strong>${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(category.amount / summary.expense * 100)}%</strong></li>`).join('') : '<li>Sem despesas</li>'}</ul></div>`;
}
function summaryCards(summary, clickable = true) {
    const tag = clickable ? 'a' : 'div';
    return `<div class="summary-grid"><${tag} class="finance-card summary-card" ${clickable ? 'href="/historico/?tipo=income"' : ''}><span class="summary-icon income">${icon('arrow_up')}</span><span><span class="summary-label">Entradas</span><strong class="income" data-total="income">${money(summary.income)}</strong><small>${summary.incomeCount} lançamentos</small></span>${clickable ? icon('chevron_right') : ''}</${tag}><${tag} class="finance-card summary-card" ${clickable ? 'href="/historico/?tipo=expense"' : ''}><span class="summary-icon expense">${icon('arrow_down')}</span><span><span class="summary-label">Saídas</span><strong class="expense" data-total="expense">${money(summary.expense)}</strong><small>${summary.expenseCount} lançamentos</small></span>${clickable ? icon('chevron_right') : ''}</${tag}></div>`;
}
function chartLoader(root) {
    let version = 0;
    let dispose = () => {};
    return {
        render(summary, history) {
            const current = ++version;
            dispose();
            dispose = () => {};
            void import('./charts.js').then(({ mountCharts }) => {
                if (current !== version || !root.isConnected) return;
                dispose = mountCharts(root, summary, history);
            }).catch(() => {
                if (current === version) for (const chart of root.querySelectorAll('[data-chart]')) chart.textContent = 'Não foi possível carregar o gráfico.';
            });
        },
        destroy() { ++version; dispose(); dispose = () => {}; },
    };
}
function pageEvents(root, ctx, getRows) {
    const controller = new AbortController();
    root.addEventListener('click', event => {
        const target = event.target.closest('[data-transaction]');
        if (target) {
            const transaction = getRows().find(item => item.id === target.dataset.transaction);
            if (transaction) openDetails(ctx.app, transaction);
        }
        if (event.target.closest('[data-action="demo-info"]')) {
            ctx.app.dialog.alert('Os valores apresentados são fictícios e servem para explorar o aplicativo. Eles não representam suas finanças.', 'Dados de demonstração');
        }
    }, { signal: controller.signal });
    return () => controller.abort();
}

export function mountDashboard(root, ctx) {
    const charts = chartLoader(root);
    let current;
    function render() {
        charts.destroy();
        current = summarize(ctx.state.month);
        const previous = series(ctx.state.month, 2)[0];
        const change = previous.result > 0 ? (current.result - previous.result) / previous.result * 100 : null;
        const comparison = change === null ? '<span class="result-comparison-empty">Sem comparação</span>' : `<span class="result-change ${change < 0 ? 'negative' : ''}">${icon(change >= 0 ? 'chevron_up' : 'chevron_down')}${change > 0 ? '+' : ''}${Math.round(change)}%</span><small>em relação<br>a ${monthLabel(previous.month).split(' de ')[0]}</small>`;
        root.innerHTML = `${header('Minhas Finanças')}${monthPicker(ctx.state.month)}<section class="result-card" aria-label="Resultado disponível do mês"><div class="result-copy"><p>Resultado disponível do mês <button class="result-info" type="button" aria-label="Entender o resultado do mês" data-action="result-info">${icon('info_circle')}</button></p><strong data-total="result">${money(current.result)}</strong><div class="result-breakdown"><span>Entradas: ${money(current.income)}</span><span>Saídas: ${money(current.expense)}</span></div></div><div class="result-comparison">${comparison}</div><svg class="result-waves" aria-hidden="true" viewBox="0 0 600 130" preserveAspectRatio="none"><path d="M0 90C120-10 150 150 290 75S420 0 600 65V130H0Z"/><path d="M0 110C170 130 180-30 300 60S490 120 600 20"/></svg></section>${summaryCards(current)}<div class="charts-grid"><section class="finance-card category-card"><div class="card-heading"><h2>Gastos por categoria</h2><a class="link icon-button" href="/relatorios/" aria-label="Ver relatório por categoria">${icon('chevron_right')}</a></div>${categoryChart(current)}</section><section class="finance-card bar-card"><div class="card-heading"><h2>Últimos 6 meses</h2><a class="link icon-button" href="/relatorios/" aria-label="Ver evolução nos relatórios">${icon('chevron_right')}</a></div><div class="mini-bar-chart" data-chart="six-months" role="img" aria-label="Resultado disponível nos últimos seis meses"></div><p class="chart-caption">Resultado de cada mês</p></section></div><section class="finance-card latest-card"><div class="card-heading"><h2>Últimos lançamentos</h2><a class="link all-transactions" href="/historico/">Ver todos ${icon('chevron_right')}</a></div>${transactionRows(current.rows.slice(0, 4))}</section>`;
        charts.render(current, series(ctx.state.month));
    }
    const unbindMonth = wireMonthPicker(root, () => ctx.state.month, month => { ctx.state.month = month; render(); });
    const unbindPage = pageEvents(root, ctx, () => current.rows);
    const onInfo = event => {
        if (event.target.closest('[data-action="result-info"]')) ctx.app.dialog.alert('É a diferença entre as entradas e as saídas do mês selecionado. Não inclui valores acumulados de meses anteriores nem representa um saldo bancário.', 'Resultado do mês');
    };
    root.addEventListener('click', onInfo);
    render();
    return { refresh: render, destroy() { charts.destroy(); unbindMonth(); unbindPage(); root.removeEventListener('click', onInfo); } };
}

export function mountHistory(root, ctx, route) {
    let type = ['income', 'expense'].includes(route.query?.tipo) ? route.query.tipo : 'all';
    let query = '';
    let category = '';
    let current;
    function renderList() {
        const rows = current.rows.filter(item => (type === 'all' || item.type === type) && (!category || item.category === category) && item.description.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
        const dates = [...new Set(rows.map(item => item.date))];
        root.querySelector('[data-history-list]').innerHTML = dates.length ? dates.map(date => `<section class="history-group"><div class="history-group-heading"><h2>${dateLabel(date)}</h2><span>${rows.filter(item => item.date === date).length} lançamentos</span></div><div class="finance-card">${transactionRows(rows.filter(item => item.date === date))}</div></section>`).join('') : transactionRows([]);
        root.querySelector('[data-result-count]').textContent = `${rows.length} lançamentos encontrados`;
        for (const button of root.querySelectorAll('[data-filter]')) button.setAttribute('aria-pressed', String(button.dataset.filter === type));
    }
    function render() {
        current = summarize(ctx.state.month);
        root.innerHTML = `${header('Histórico')}${monthPicker(ctx.state.month)}<label class="history-search">${icon('search')}<input type="search" value="${esc(query)}" placeholder="Buscar lançamentos" aria-label="Buscar lançamentos por descrição"></label><div class="history-filters" aria-label="Filtrar lançamentos"><button type="button" class="filter-chip" data-filter="all">Todos</button><button type="button" class="filter-chip" data-filter="income">${icon('arrow_up')} Entradas</button><button type="button" class="filter-chip" data-filter="expense">${icon('arrow_down')} Saídas</button><label class="category-filter">${icon('tag')}<select aria-label="Filtrar por categoria"><option value="">Categorias</option>${Object.entries(categories).map(([key, item]) => `<option value="${key}" ${key === category ? 'selected' : ''}>${item.name}</option>`).join('')}</select></label></div><p class="sr-only" data-result-count role="status"></p><div data-history-list></div>`;
        renderList();
    }
    const controller = new AbortController();
    root.addEventListener('input', event => { if (event.target.matches('input[type="search"]')) { query = event.target.value; renderList(); } }, { signal: controller.signal });
    root.addEventListener('change', event => { if (event.target.matches('.category-filter select')) { category = event.target.value; renderList(); } }, { signal: controller.signal });
    root.addEventListener('click', event => { const button = event.target.closest('[data-filter]'); if (button) { type = button.dataset.filter; renderList(); } }, { signal: controller.signal });
    const unbindMonth = wireMonthPicker(root, () => ctx.state.month, month => { ctx.state.month = month; render(); });
    const unbindPage = pageEvents(root, ctx, () => current.rows);
    render();
    return { refresh: render, destroy() { controller.abort(); unbindMonth(); unbindPage(); } };
}

export function mountReports(root, ctx) {
    const charts = chartLoader(root);
    let period = 1;
    function render() {
        charts.destroy();
        const history = series(ctx.state.month, period === 12 ? Number(ctx.state.month.slice(5)) : period);
        const rows = history.flatMap(item => item.rows);
        const summary = {
            income: history.reduce((sum, item) => sum + item.income, 0),
            expense: history.reduce((sum, item) => sum + item.expense, 0),
            incomeCount: rows.filter(item => item.type === 'income').length,
            expenseCount: rows.filter(item => item.type === 'expense').length,
            byCategory: Object.entries(categories).map(([key, category]) => ({ key, ...category, amount: rows.filter(item => item.category === key && item.type === 'expense').reduce((sum, item) => sum + item.amount, 0) })).filter(item => item.amount > 0).sort((a, b) => b.amount - a.amount),
        };
        root.innerHTML = `${header('Relatórios')}${monthPicker(ctx.state.month)}<div class="report-period" aria-label="Período do relatório">${[[1, 'Mês'], [3, '3 meses'], [12, 'Ano']].map(([value, label]) => `<button type="button" data-period="${value}" aria-pressed="${period === value}">${label}</button>`).join('')}</div><p class="period-note">${period === 12 ? `Janeiro até ${monthLabel(ctx.state.month)}` : period === 3 ? 'Três meses até o mês selecionado' : monthLabel(ctx.state.month)}</p>${summaryCards(summary, false)}<div class="reports-grid"><section class="finance-card category-card"><div class="card-heading"><h2>Despesas por categoria</h2></div>${categoryChart(summary)}</section><section class="finance-card"><div class="card-heading"><h2>Entradas × Saídas</h2></div><div class="report-chart" data-chart="comparison" role="img" aria-label="Entradas e saídas por mês"></div></section></div><section class="finance-card evolution-card"><div class="card-heading"><h2>Evolução mensal</h2></div><div class="report-chart" data-chart="evolution" role="img" aria-label="Evolução das entradas, saídas e resultado"></div></section>`;
        charts.render(summary, period === 1 ? series(ctx.state.month) : history);
    }
    const unbindMonth = wireMonthPicker(root, () => ctx.state.month, month => { ctx.state.month = month; render(); });
    const unbindPage = pageEvents(root, ctx, () => []);
    const handler = event => { const button = event.target.closest('[data-period]'); if (button) { period = Number(button.dataset.period); render(); } };
    root.addEventListener('click', handler);
    render();
    return { refresh: render, destroy() { charts.destroy(); unbindMonth(); unbindPage(); root.removeEventListener('click', handler); } };
}

export function mountMore(root, ctx) {
    function render() {
        root.innerHTML = `${header('Mais', { demo: false })}<section class="finance-card profile-card"><span class="profile-avatar">${icon('person_crop_circle')}</span><div><h2 data-profile-name></h2><p data-profile-email></p></div></section><a href="/categorias/" class="finance-card settings-row categories-menu-link"><span class="settings-icon">${icon('square_grid_2x2')}</span><span><strong>Categorias</strong><small>Organize suas receitas e despesas</small></span>${icon('chevron_right')}</a><section class="finance-card more-settings"><div class="settings-row"><span class="settings-icon">${icon('money_dollar_circle')}</span><span><strong>Moeda</strong><small>Real brasileiro</small></span><b>BRL (R$)</b></div><div class="settings-row"><span class="settings-icon">${icon('sun_max')}</span><span><strong>Aparência</strong><small>Tema claro</small></span></div></section><section class="finance-card demo-explanation"><h2>Conheça o aplicativo</h2><p>Início, Histórico e Relatórios ainda apresentam dados de demonstração. Suas categorias são salvas na sua conta.</p><a class="link" href="/inicio/">Voltar ao início ${icon('arrow_right')}</a></section><button type="button" class="finance-card settings-row logout-row" data-action="logout"><span class="settings-icon">${icon('arrow_right_square')}</span><span><strong>Sair da conta</strong><small>Encerrar sua sessão com segurança</small></span>${icon('chevron_right')}</button>`;
        root.querySelector('[data-profile-name]').textContent = ctx.state.user.name;
        root.querySelector('[data-profile-email]').textContent = ctx.state.user.email;
    }
    const unbindPage = pageEvents(root, ctx, () => []);
    const handler = async event => {
        const button = event.target.closest('[data-action="logout"]');
        if (!button || button.disabled) return;
        button.disabled = true;
        try { await ctx.logout(); }
        catch (error) { ctx.app.dialog.alert(esc(error.message), 'Não foi possível sair'); }
        finally { button.disabled = false; }
    };
    root.addEventListener('click', handler);
    render();
    return { refresh: render, destroy() { unbindPage(); root.removeEventListener('click', handler); } };
}
