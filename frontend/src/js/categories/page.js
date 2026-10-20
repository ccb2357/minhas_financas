import { notifySuccess } from '../shared/notifications.js';
import { mountSmartSelects } from '../shared/smart-select.js';
import { escapeHtml as esc, icon } from '../shared/html.js';
import { safeColor, safeIcon } from './catalog.js';
import { listCategories } from './api.js';
import { openCategoryForm } from './form.js';

export function mountCategories(root, ctx) {
    let destroyed = false;
    let revision = 0;
    let loading = false;
    let type = '';
    let status = 'active';
    let rows = [];
    let currentPage = 0;
    let lastPage = 1;
    let editor;
    const events = new AbortController();
    root.classList.add('categories-container');
    root.innerHTML = `<header class="finance-header categories-header"><a href="/mais/" class="link icon-button" aria-label="Voltar para Mais">${icon('chevron_left')}</a><h1 tabindex="-1">Categorias</h1><button type="button" class="icon-button" data-category-help aria-label="Sobre as categorias">${icon('info_circle')}</button></header><div class="category-tabs" role="group" aria-label="Filtrar categorias por tipo"><button type="button" data-category-type="" aria-pressed="true">Todas</button><button type="button" data-category-type="income" aria-pressed="false">Receitas</button><button type="button" data-category-type="expense" aria-pressed="false">Despesas</button></div><div class="category-list-tools"><span data-category-total role="status"></span><label><span class="sr-only">Estado das categorias</span><select data-category-status aria-label="Estado das categorias"><option value="active">Ativas</option><option value="inactive">Inativas</option><option value="all">Todas as situações</option></select>${icon('chevron_down')}</label></div><section class="category-results" aria-label="Suas categorias" aria-busy="false"><div class="category-grid"></div><div class="category-list-state" role="status"></div><button type="button" class="mf-button mf-button-secondary category-load-more" data-category-more hidden>Carregar mais</button></section><button type="button" class="category-create-button" data-category-create>${icon('plus')}<span>Nova categoria</span></button>`;
    const smartSelects = mountSmartSelects(root, ctx.app);
    const grid = root.querySelector('.category-grid');
    const stateBox = root.querySelector('.category-list-state');
    const total = root.querySelector('[data-category-total]');
    const more = root.querySelector('[data-category-more]');
    const results = root.querySelector('.category-results');

    function renderRows() {
        grid.innerHTML = rows.map(category => `<button type="button" class="finance-card category-card ${category.is_active ? '' : 'category-inactive'}" data-category-id="${esc(category.id)}" aria-label="Editar categoria ${esc(category.name)}"><span class="category-avatar" style="--category-color:${safeColor(category.color)}">${icon(safeIcon(category.icon))}</span><span class="category-card-copy"><strong>${esc(category.name)}</strong><span class="category-card-type"><i class="category-type-dot ${category.type === 'income' ? 'income-dot' : 'expense-dot'}" aria-hidden="true"></i>${category.type === 'income' ? 'Receita' : 'Despesa'}</span><small>${category.is_active ? 'Ativa' : 'Inativa'}</small></span>${icon('chevron_right')}</button>`).join('');
    }

    async function load(append = false) {
        if (destroyed || (append && loading)) return;
        const thisRevision = ++revision;
        loading = true;
        results.setAttribute('aria-busy', 'true');
        more.disabled = true;
        more.hidden = true;
        if (!append) {
            rows = [];
            grid.replaceChildren();
            total.textContent = '';
        }
        stateBox.innerHTML = `<span class="mf-spinner" aria-hidden="true"></span><span>Carregando categorias...</span>`;
        try {
            const response = await listCategories({ type, status, page: append ? currentPage + 1 : 1 });
            if (destroyed || thisRevision !== revision) return;
            rows = append ? [...rows, ...response.data] : response.data;
            currentPage = response.meta.current_page;
            lastPage = response.meta.last_page;
            total.textContent = `${response.meta.total} ${response.meta.total === 1 ? 'categoria' : 'categorias'}`;
            renderRows();
            stateBox.innerHTML = rows.length ? '' : `<span class="category-empty-icon">${icon('square_grid_2x2')}</span><h2>${status === 'inactive' ? 'Nenhuma categoria inativa' : 'Suas categorias, do seu jeito'}</h2><p>${type || status !== 'active' ? 'Nenhuma categoria encontrada com estes filtros.' : 'Crie sua primeira categoria para organizar receitas e despesas.'}</p>${status === 'inactive' ? '' : '<button type="button" class="mf-button mf-button-secondary" data-category-create>Criar categoria</button>'}`;
            more.hidden = currentPage >= lastPage;
        } catch (error) {
            if (destroyed || thisRevision !== revision) return;
            if (error.status === 401) { ctx.expireSession(); return; }
            stateBox.innerHTML = `<span class="category-empty-icon">${icon('wifi_exclamationmark')}</span><h2>Não foi possível carregar</h2><p>${error.status >= 500 ? 'O serviço não respondeu como esperado. Tente novamente em instantes.' : 'Confira sua conexão e tente novamente.'}</p><button type="button" class="mf-button mf-button-secondary" data-category-retry="${append ? 'more' : 'all'}">Tentar novamente</button>`;
        } finally {
            if (!destroyed && thisRevision === revision) {
                loading = false;
                results.setAttribute('aria-busy', 'false');
                more.disabled = false;
            }
        }
    }

    function showEditor(category = null) {
        if (editor) return;
        editor = openCategoryForm(ctx, {
            category,
            onSaved(message) {
                notifySuccess(ctx.app, message);
                void load();
            },
            onClosed() { editor = null; },
        });
    }

    root.addEventListener('click', event => {
        const target = event.target.closest('button');
        if (!target) return;
        if (target.hasAttribute('data-category-help')) {
            ctx.app.dialog.alert('As categorias são suas e ficam salvas na sua conta. Desative as que não usa mais; você pode reativá-las depois.', 'Suas categorias');
        }
        if (target.hasAttribute('data-category-type')) {
            if (type === target.dataset.categoryType) return;
            type = target.dataset.categoryType;
            for (const button of root.querySelectorAll('[data-category-type]')) button.setAttribute('aria-pressed', String(button === target));
            void load();
        }
        if (target.hasAttribute('data-category-create')) showEditor();
        if (target.dataset.categoryId) {
            const category = rows.find(row => String(row.id) === target.dataset.categoryId);
            if (category) showEditor(category);
        }
        if (target.hasAttribute('data-category-more')) void load(true);
        if (target.hasAttribute('data-category-retry')) void load(target.dataset.categoryRetry === 'more');
    }, { signal: events.signal });
    root.querySelector('[data-category-status]').addEventListener('change', event => {
        status = event.target.value;
        void load();
    }, { signal: events.signal });

    return {
        refresh() { void load(); },
        leave() { editor?.close(true); },
        destroy() { smartSelects.destroy();
            destroyed = true;
            revision++;
            events.abort();
            editor?.close(true);
            editor = null;
        },
    };
}
