import { openSettingsForm } from './settings/form.js';
import { openBudgetForm } from './budgets/form.js';
import { createRoutes } from './routes.js';
import { openTransactionForm } from './transactions/form.js';
import { todayBrazil } from './shared/calendar.js';

export function createWorkspace(app, { logout, onSessionExpired, onPasswordChanged }) {
    const container = document.querySelector('#workspace');
    const authView = document.querySelector('#auth-view');
    const financeView = document.querySelector('#finance-view');
    const newButton = document.querySelector('#new-transaction');
    const cleanups = new Set();
    const state = { budgetMonth: todayBrazil().slice(0, 7), dashboardMonth: todayBrazil().slice(0, 7), dashboardFeedback: '', reportsMonth: todayBrazil().slice(0, 7), reportsRange: 'month', historyMonth: todayBrazil().slice(0, 7), historyFeedback: '', user: null };
    let view, editor;
    const context = {
        app, state, logout, cleanups, expireSession: onSessionExpired, events: new EventTarget(),
        navigate: path => view?.router.navigate(path),
        beforeLeave(resolve, reject) { if (editor) editor.beforeLeave(resolve, reject); else resolve(); },
        openSettings(mode = 'profile') {
            if (!state.user || editor) return;
            editor = openSettingsForm(context, {
                mode,
                onClosed() { editor = null; },
                onSaved(user) {
                    state.user = { id: user.id, name: user.name, email: user.email };
                    context.events.dispatchEvent(new CustomEvent('profile:changed'));
                },
                onPasswordChanged(email) { onPasswordChanged?.(email); },
            });
        },
        openBudget(options = {}) {
            if (!state.user || editor) return;
            editor = openBudgetForm(context, {
                ...options,
                onClosed() { editor = null; },
                onSaved(row, kind) {
                    state.budgetMonth = `${row.year}-${String(row.month).padStart(2, '0')}`;
                    context.events.dispatchEvent(new CustomEvent('budgets:changed', { detail: { row, kind } }));
                },
            });
        },
        openTransaction(options = {}) {
            if (!state.user || editor) return;
            editor = openTransactionForm(context, {
                ...options,
                onClosed() { editor = null; },
                onSaved(row, kind) {
                    if (kind !== 'deleted') state.historyMonth = row.transaction_date.slice(0, 7);
                    state.historyFeedback = { created: 'Lançamento salvo.', updated: 'Lançamento atualizado.', deleted: 'Lançamento excluído.' }[kind];
                    const onDashboard = (view.router.currentRoute.route?.path || view.router.currentRoute.path) === '/inicio/';
                    if (onDashboard) {
                        if (kind !== 'deleted') state.dashboardMonth = row.transaction_date.slice(0, 7);
                        state.dashboardFeedback = state.historyFeedback;
                    }
                    context.events.dispatchEvent(new CustomEvent('transactions:changed', { detail: { row, kind } }));
                    if (!onDashboard && view.router.currentRoute.path !== '/historico/') view.router.navigate(`/historico/?month=${state.historyMonth}`);
                },
            });
        },
    };

    function updateNavigation(route) {
        const section = route.path?.split('/').filter(Boolean)[0] || 'inicio';
        const navigationSection = ['categorias', 'orcamentos'].includes(section) ? 'mais' : section;
        for (const link of container.querySelectorAll('[data-section]')) {
            const active = link.dataset.section === navigationSection;
            link.classList.toggle('nav-active', active);
            if (active) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        }
        newButton.hidden = ['mais', 'relatorios', 'categorias', 'orcamentos'].includes(section);
        const titles = { inicio: 'Início', historico: 'Histórico', relatorios: 'Relatórios', mais: 'Mais', categorias: 'Categorias', orcamentos: 'Orçamento mensal' };
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
                    on: {
                        routeChanged: updateNavigation,
                        // Framework7 9 atualiza a query sem sincronizar router.url.
                        // O histórico nativo usa essa URL ao cancelar uma saída.
                        routeUrlUpdate(route, router) { router.url = route.url; },
                    },
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
            state.budgetMonth = todayBrazil().slice(0, 7);
            state.dashboardMonth = todayBrazil().slice(0, 7);
            state.dashboardFeedback = '';
            state.reportsMonth = todayBrazil().slice(0, 7);
            state.reportsRange = 'month';
            state.historyMonth = todayBrazil().slice(0, 7);
            state.historyFeedback = '';
            if (wasActive) window.history.replaceState({}, '', window.location.pathname + window.location.search);
        },
    };
}
