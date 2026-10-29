import { cycleDates } from '../cycles/state.js';
import { pageHeader } from '../shared/page-header.js';
import { mountSmartSelects } from '../shared/smart-select.js';
import { escapeHtml as esc, icon } from '../shared/html.js';
import { moneyText } from '../shared/money.js';
import { validMonth, monthLabel, dateText, dayLabel, todayBrazil } from '../shared/calendar.js';
import { monthPicker, wireMonthPicker } from '../shared/month-picker.js';
import { safeIcon, safeColor } from '../categories/catalog.js';
import { listTransactions, getTransaction, categoryOptions, transactionError } from './api.js';

export function mountHistory(root, ctx, route) {
    let type = ['income', 'expense'].includes(route.query?.tipo) ? route.query.tipo : '';
    let category = /^[1-9]\d*$/.test(route.query?.category_id || '') && Number.isSafeInteger(Number(route.query.category_id)) ? String(route.query.category_id) : '';
    let range = ['three_months', 'year'].includes(route.query?.range) ? route.query.range : 'month';
    let search = typeof route.query?.search === 'string' ? route.query.search.slice(0, 255) : '';
    let rows = [], categories = [], period = null;
    let revision = 0, alive = true, loading = false, page = 0, lastPage = 1, debounce;
    let optionsRevision = 0;
    if (validMonth(route.query?.month)) ctx.state.historyMonth = route.query.month;
    const events = new AbortController();
    root.classList.add('history-real');
    root.innerHTML = `${pageHeader('Histórico', 'Seus lançamentos em um só lugar')}<div data-history-month></div><label class="history-search">${icon('search')}<input type="search" maxlength="255" placeholder="Buscar lançamentos" aria-label="Buscar lançamentos por descrição"></label><div class="history-filters" role="group" aria-label="Filtrar lançamentos">${[['', 'Todos', ''], ['income', 'Entradas', 'arrow_up'], ['expense', 'Saídas', 'arrow_down']].map(([value, label, glyph]) => `<button type="button" class="filter-chip" data-history-type="${value}" aria-pressed="${value === type}">${glyph ? icon(glyph) : ''}${label}</button>`).join('')}<label class="category-filter">${icon('tag')}<span data-history-category-label aria-hidden="true">Categorias</span><select data-history-category aria-label="Filtrar por categoria"><option value="">Categorias</option></select></label></div><div class="history-category-status" role="status" hidden></div><p class="history-count" role="status" data-history-count></p><p class="history-feedback" role="status" hidden></p><div data-history-list aria-busy="false"></div><div class="history-list-state" role="status"></div><button class="mf-button mf-button-secondary" type="button" data-history-more hidden>Carregar mais</button>`;
    const smartSelects = mountSmartSelects(root, ctx.app);
    const list = root.querySelector('[data-history-list]');
    const stateBox = root.querySelector('.history-list-state');
    const categorySelect = root.querySelector('[data-history-category]');
    const feedback = root.querySelector('.history-feedback');
    const more = root.querySelector('[data-history-more]');
    const searchInput = root.querySelector('input[type="search"]');
    const categoryStatus = root.querySelector('.history-category-status');
    searchInput.value = search;
    renderMonth();

    function renderMonth() {
        const box = root.querySelector('[data-history-month]');
        box.innerHTML = monthPicker(ctx.state.historyMonth);
        if (range === 'month') return;
        const selected = period && `${period.year}-${String(period.month).padStart(2, '0')}` === ctx.state.historyMonth ? period : null;
        box.querySelector('[data-month-open] > span').innerHTML = `${range === 'three_months' ? '3 ciclos' : 'Ano de ciclos'} · ${esc(monthLabel(ctx.state.historyMonth))}<small>${esc(cycleDates(selected))}</small>`;
    }

    function categoryLabel() {
        const text = categorySelect.selectedOptions[0]?.textContent || 'Categorias';
        root.querySelector('[data-history-category-label]').textContent = text;
        categorySelect.closest('label').title = text;
    }
    function filters() {
        for (const button of root.querySelectorAll('[data-history-type]')) button.setAttribute('aria-pressed', String(button.dataset.historyType === type));
        const available = categories.filter(item => !type || item.type === type);
        if (category && !available.some(item => String(item.id) === category)) category = '';
        categorySelect.innerHTML = '<option value="">Categorias</option>' + available.map(item => `<option value="${item.id}" data-option-icon="${safeIcon(item.icon)}" data-option-color="${safeColor(item.color)}">${esc(item.name)}${item.is_active ? '' : ' (inativa)'}</option>`).join('');
        categorySelect.value = category;
        categoryLabel();
    }

    function renderRows() {
        const dates = [...new Set(rows.map(row => row.transaction_date))];
        const today = todayBrazil();
        list.innerHTML = dates.map(date => {
            const group = rows.filter(row => row.transaction_date === date);
            return `<section class="history-group"><div class="history-group-heading"><h2>${date === today ? 'Hoje, ' : ''}${esc(dayLabel(date))}</h2><span>${group.length} ${group.length === 1 ? 'exibido' : 'exibidos'}</span></div><div class="finance-card"><ul class="transaction-list">${group.map(row => `<li><button type="button" class="transaction-row" data-real-transaction="${row.id}" aria-label="Editar ${esc(row.description)}"><span class="category-badge" style="--category-color:${safeColor(row.category.color)}">${icon(safeIcon(row.category.icon))}</span><span class="transaction-copy"><strong>${esc(row.description)}</strong><span>${esc(row.category.name)}${row.category.is_active ? '' : ' (inativa)'} <span aria-hidden="true">·</span> ${dateText(row.transaction_date)}</span></span><span class="transaction-value ${row.type}">${row.type === 'income' ? '+' : '−'} ${moneyText(row.amount_cents)}</span>${icon('chevron_right')}</button></li>`).join('')}</ul></div></section>`;
        }).join('');
    }

    async function load(append = false) {
        if (!alive || (append && loading)) return;
        if (!ctx.requireCycle(stateBox)) return;
        const router = root.closest('.view')?.f7View?.router;
        if (router?.currentRoute.path === '/historico/') {
            const query = new URLSearchParams({ month: ctx.state.historyMonth });
            if (type) query.set('tipo', type);
            if (category) query.set('category_id', category);
            if (search) query.set('search', search);
            if (range !== 'month') query.set('range', range);
            const url = `/historico/?${query}`;
            if (router.currentRoute.url !== url) router.updateCurrentUrl(url);
        }
        clearTimeout(debounce);
        const current = ++revision;
        loading = true; more.disabled = true; more.hidden = true;
        list.setAttribute('aria-busy', 'true');
        if (!append) { rows = []; list.replaceChildren(); root.querySelector('[data-history-count]').textContent = ''; }
        stateBox.innerHTML = '<span class="mf-spinner" aria-hidden="true"></span><span>Carregando lançamentos...</span>';
        try {
            const response = await listTransactions({ month: ctx.state.historyMonth, type, category, search, range, page: append ? page + 1 : 1 });
            if (!alive || current !== revision) return;
            rows = append ? [...new Map([...rows, ...response.data].map(row => [row.id, row])).values()] : response.data;
            period = response.meta.period; renderMonth();
            page = response.meta.current_page; lastPage = response.meta.last_page;
            root.querySelector('[data-history-count]').textContent = `${response.meta.total} ${response.meta.total === 1 ? 'lançamento encontrado' : 'lançamentos encontrados'}`;
            renderRows();
            stateBox.innerHTML = rows.length ? '' : `<span class="history-empty-icon">${icon('clock')}</span><h2>Nenhum lançamento encontrado</h2><p>${search || type || category ? 'Ajuste os filtros ou registre um novo lançamento.' : 'Registre uma entrada ou saída para começar.'}</p>`;
            more.hidden = page >= lastPage;
        } catch (error) {
            if (!alive || current !== revision) return;
            if (error.status === 401) { ctx.expireSession(); return; }
            stateBox.innerHTML = `<span class="history-empty-icon">${icon('wifi_exclamationmark')}</span><h2>Não foi possível carregar</h2><p>${error.status >= 500 ? 'Tente novamente em instantes.' : 'Confira sua conexão e tente novamente.'}</p><button type="button" class="mf-button mf-button-secondary" data-history-retry="${append ? 'more' : 'all'}">Tentar novamente</button>`;
        } finally {
            if (alive && current === revision) { loading = false; list.setAttribute('aria-busy', 'false'); more.disabled = false; }
        }
    }

    async function loadOptions() {
        const current = ++optionsRevision;
        try {
            const response = await categoryOptions('all', () => !alive || current !== optionsRevision);
            if (!alive || current !== optionsRevision) return;
            categories = response; const previous = category; filters(); categoryStatus.hidden = true;
            if (previous !== category) void load();
        } catch (error) {
            if (!alive || current !== optionsRevision) return;
            if (error.status === 401) { ctx.expireSession(); return; }
            categoryStatus.innerHTML = 'Não foi possível carregar o filtro de categorias. <button type="button" data-history-options-retry>Tentar novamente</button>';
            categoryStatus.hidden = false;
        }
    }

    const unbindMonth = wireMonthPicker(root, () => ctx.state.historyMonth, month => {
        ctx.state.historyMonth = month;
        period = null; renderMonth();
        feedback.hidden = true; void load();
    }, ctx.app);
    root.addEventListener('input', event => {
        if (event.target !== searchInput) return;
        search = searchInput.value; feedback.hidden = true;
        revision++; clearTimeout(debounce);
        debounce = setTimeout(() => { void load(); }, 250);
    }, { signal: events.signal });
    categorySelect.addEventListener('change', () => { category = categorySelect.value; categoryLabel(); feedback.hidden = true; void load(); }, { signal: events.signal });
    root.addEventListener('click', async event => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.hasAttribute('data-history-type')) { type = button.dataset.historyType; filters(); feedback.hidden = true; void load(); }
        if (button.hasAttribute('data-history-more')) void load(true);
        if (button.hasAttribute('data-history-retry')) void load(button.dataset.historyRetry === 'more');
        if (button.hasAttribute('data-history-options-retry')) void loadOptions();
        if (button.dataset.realTransaction) {
            const current = revision;
            button.disabled = true;
            try {
                const response = await getTransaction(button.dataset.realTransaction);
                if (alive && current === revision && root.closest('.page').classList.contains('page-current')) ctx.openTransaction({ transaction: response.data });
            } catch (error) {
                if (!alive || current !== revision) return;
                if (error.status === 401) { ctx.expireSession(); return; }
                feedback.textContent = transactionError(error); feedback.hidden = false;
                if (error.status === 404) void load();
            } finally { button.disabled = false; }
        }
    }, { signal: events.signal });
    ctx.events.addEventListener('transactions:changed', event => {
        if (!alive) return;
        const { row, kind } = event.detail;
        if (kind === 'created') { type = ''; category = ''; search = ''; }
        else if (kind === 'updated') {
            if (type && type !== row.type) type = '';
            if (category && category !== String(row.category_id)) category = '';
            if (search && !row.description.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))) search = '';
        }
        searchInput.value = search; filters();
        renderMonth();
        feedback.textContent = ctx.state.historyFeedback; feedback.hidden = !ctx.state.historyFeedback;
        if (root.closest('.page').classList.contains('page-current')) void load();
    }, { signal: events.signal });

    return {
        refresh() {
            renderMonth();
            if (ctx.state.historyFeedback) { feedback.textContent = ctx.state.historyFeedback; feedback.hidden = !ctx.state.historyFeedback; }
            void loadOptions(); void load();
        },
        destroy() { smartSelects.destroy(); alive = false; revision++; optionsRevision++; clearTimeout(debounce); events.abort(); unbindMonth(); },
    };
}
