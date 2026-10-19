import { createRoutes } from './routes.js';
import { INITIAL_MONTH } from './demo/data.js';
import { openTransactionForm } from './transactions/form.js';
import { todayBrazil } from './shared/calendar.js';

export function createWorkspace(app, { logout, onSessionExpired }) {
    const container = document.querySelector('#workspace');
    const authView = document.querySelector('#auth-view');
    const financeView = document.querySelector('#finance-view');
    const newButton = document.querySelector('#new-transaction');
    const cleanups = new Set();
    const state = { month: INITIAL_MONTH, historyMonth: todayBrazil().slice(0, 7), historyFeedback: '', user: null };
    let view, editor;
    const context = {
        app, state, logout, cleanups, expireSession: onSessionExpired, events: new EventTarget(),
        navigate: path => view?.router.navigate(path),
        beforeLeave(resolve, reject) { if (editor) editor.beforeLeave(resolve, reject); else resolve(); },
        openTransaction(options = {}) {
            if (!state.user || editor) return;
            editor = openTransactionForm(context, {
                ...options,
                onClosed() { editor = null; },
                onSaved(row, kind) {
                    if (kind !== 'deleted') state.historyMonth = row.transaction_date.slice(0, 7);
                    state.historyFeedback = { created: 'Lançamento salvo.', updated: 'Lançamento atualizado.', deleted: 'Lançamento excluído.' }[kind];
                    context.events.dispatchEvent(new CustomEvent('transactions:changed', { detail: { row, kind } }));
                    if (view.router.currentRoute.path !== '/historico/') view.router.navigate(`/historico/?month=${state.historyMonth}`);
                },
            });
        },
    };

    function updateNavigation(route) {
        const section = route.path?.split('/').filter(Boolean)[0] || 'inicio';
        const navigationSection = section === 'categorias' ? 'mais' : section;
        for (const link of container.querySelectorAll('[data-section]')) {
            const active = link.dataset.section === navigationSection;
            link.classList.toggle('nav-active', active);
            if (active) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        }
        newButton.hidden = ['mais', 'relatorios', 'categorias'].includes(section);
        const titles = { inicio: 'Início', historico: 'Histórico', relatorios: 'Relatórios', mais: 'Mais', categorias: 'Categorias' };
        document.title = `${titles[section] || 'Início'} · Minhas Finanças`;
    }

    container.addEventListener('click', event => {
        const link = event.target.closest('[data-section]');
        if (!link || !view) return;
        event.preventDefault();
        view.router.navigate(link.getAttribute('href'));
    });
    newButton.addEventListener('click', () => context.openTransaction());

    return {
        show(user) {
            state.user = user;
            authView.hidden = true;
            authView.classList.remove('view-main');
            container.hidden = false;
            financeView.classList.add('view-main');
            if (!view) {
                view = app.views.create(financeView, {
                    main: true,
                    url: '/inicio/',
                    routes: createRoutes(context),
                    browserHistory: true,
                    browserHistorySeparator: '#!',
                    animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                    on: { routeChanged: updateNavigation },
                });
            }
            updateNavigation(view.router.currentRoute);
        },
        hide() {
            const wasActive = Boolean(state.user);
            container.hidden = true;
            editor?.close(true);
            for (const cleanup of [...cleanups]) cleanup();
            view?.destroy();
            view = null;
            financeView.replaceChildren();
            financeView.classList.remove('view-main');
            authView.hidden = false;
            authView.classList.add('view-main');
            state.user = null;
            state.month = INITIAL_MONTH;
            state.historyMonth = todayBrazil().slice(0, 7);
            state.historyFeedback = '';
            if (wasActive) window.history.replaceState({}, '', window.location.pathname + window.location.search);
        },
    };
}
