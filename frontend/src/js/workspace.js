import { createRoutes } from './routes.js';
import { INITIAL_MONTH } from './demo/data.js';
import { openTransactionPreview } from './demo/ui.js';

export function createWorkspace(app, { logout }) {
    const container = document.querySelector('#workspace');
    const authView = document.querySelector('#auth-view');
    const financeView = document.querySelector('#finance-view');
    const newButton = document.querySelector('#new-transaction');
    const cleanups = new Set();
    const state = { month: INITIAL_MONTH, user: null };
    let view;
    const context = { app, state, logout, cleanups };

    function updateNavigation(route) {
        const section = route.path?.split('/').filter(Boolean)[0] || 'inicio';
        for (const link of container.querySelectorAll('[data-section]')) {
            const active = link.dataset.section === section;
            link.classList.toggle('nav-active', active);
            if (active) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        }
        newButton.hidden = section === 'mais' || section === 'relatorios';
        const titles = { inicio: 'Início', historico: 'Histórico', relatorios: 'Relatórios', mais: 'Mais' };
        document.title = `${titles[section] || 'Início'} · Minhas Finanças`;
    }

    container.addEventListener('click', event => {
        const link = event.target.closest('[data-section]');
        if (!link || !view) return;
        event.preventDefault();
        view.router.navigate(link.getAttribute('href'));
    });
    newButton.addEventListener('click', () => { if (state.user) openTransactionPreview(app); });

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
            for (const cleanup of [...cleanups]) cleanup();
            view?.destroy();
            view = null;
            financeView.replaceChildren();
            financeView.classList.remove('view-main');
            authView.hidden = false;
            authView.classList.add('view-main');
            state.user = null;
            state.month = INITIAL_MONTH;
            if (wasActive) window.history.replaceState({}, '', window.location.pathname + window.location.search);
        },
    };
}
