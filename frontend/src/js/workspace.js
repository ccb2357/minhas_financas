import { openBudgetCopy } from './budgets/copy.js';
import { openGoalEditor } from './goals/editor.js';
import { getCycleConfiguration } from './cycles/api.js';
import { openCycleForm } from './cycles/form.js';
import { clearCycles, rememberCycleResponse } from './cycles/state.js';
import { notifySuccess, clearNotifications } from './shared/notifications.js';
import { closeActiveIconPicker } from './categories/icon-picker.js';
import { closeActiveDatePicker } from './shared/date-picker.js';
import { closeActiveSmartSelect } from './shared/smart-select.js';
import { openSettingsForm } from './settings/form.js';
import { openBudgetForm } from './budgets/form.js';
import { createRoutes } from './routes.js';
import { openTransactionForm } from './transactions/form.js';
import { todayBrazil } from './shared/calendar.js';

export function createWorkspace(app, { logout, onSessionExpired, onPasswordChanged, theme, installer, updates }) {
    const container = document.querySelector('#workspace');
    const authView = document.querySelector('#auth-view');
    const financeView = document.querySelector('#finance-view');
    const newButton = document.querySelector('#new-transaction');
    const cleanups = new Set();
    const state = { budgetMonth: todayBrazil().slice(0, 7), dashboardMonth: todayBrazil().slice(0, 7), dashboardFeedback: '', reportsMonth: todayBrazil().slice(0, 7), reportsRange: 'month', historyMonth: todayBrazil().slice(0, 7), historyFeedback: '', user: null };
    let view, editor, cycleLoading = false, cycleTimer, bootRevision = 0;
    function applyCycles(configuration) {
        const old = state.cycleConfiguration;
        if (old?.version !== configuration.version) clearCycles();
        rememberCycleResponse({ data: configuration });
        state.cycleConfiguration = configuration;
        state.cycleError = false;
        if (configuration.configured) {
            for (const field of ['budgetMonth', 'dashboardMonth', 'historyMonth', 'reportsMonth']) {
                if (!old?.configured || state[field] === old.current?.key) state[field] = configuration.current.key;
            }
        }
    }
    async function refreshCycles() {
        if (!state.user || editor || cycleLoading || document.hidden) return;
        cycleLoading = true;
        const user = state.user;
        try {
            const response = await getCycleConfiguration();
            if (state.user !== user) return;
            const previous = state.cycleConfiguration;
            const changed = previous?.version !== response.data.version || previous?.current?.key !== response.data.current?.key;
            applyCycles(response.data);
            if (changed) context.events.dispatchEvent(new CustomEvent('cycles:changed'));
        } catch (error) { if (error.status === 401 && state.user === user) onSessionExpired(); }
        finally { cycleLoading = false; }
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void refreshCycles(); });
    const context = {
        app, state, logout, cleanups, theme, installer, updates, expireSession: onSessionExpired, events: new EventTarget(),
        requireCycle(root) {
            if (state.cycleConfiguration?.configured) return true;
            root.innerHTML = `<section class="finance-card cycle-required" role="status"><h2>${state.cycleError ? 'Não foi possível carregar o ciclo' : 'Defina seu ciclo financeiro'}</h2><p>${state.cycleError ? 'Confira sua conexão e tente novamente.' : 'Escolha a data de corte para acompanhar entradas, saídas e orçamentos no mesmo período.'}</p><button type="button" class="mf-button mf-button-primary" data-cycle-open>${state.cycleError ? 'Tentar novamente' : 'Definir ciclo'}</button></section>`;
            return false;
        },
        async openCycleSettings() {
            if (!state.user || editor || cycleLoading) return;
            cycleLoading = true;
            const user = state.user;
            try {
                const response = await getCycleConfiguration();
                if (state.user !== user) return;
                const previous = state.cycleConfiguration;
                applyCycles(response.data);
                if (previous?.version !== response.data.version || previous?.current?.key !== response.data.current?.key) context.events.dispatchEvent(new CustomEvent('cycles:changed'));
                editor = openCycleForm(context, {
                    configuration: response.data,
                    onClosed() { editor = null; },
                    onSaved(configuration) {
                        applyCycles(configuration);
                        context.events.dispatchEvent(new CustomEvent('cycles:changed'));
                        notifySuccess(app, configuration.pending_cut_day ? 'Novo corte agendado para o próximo ciclo.' : 'Ciclo financeiro salvo.');
                    },
                });
            } catch (error) {
                if (state.user !== user) return;
                if (error.status === 401) { onSessionExpired(); return; }
                app.dialog.alert('Confira sua conexão e tente novamente.', 'Não foi possível carregar o ciclo');
            } finally { cycleLoading = false; }
        },
        navigate: path => view?.router.navigate(path),
        beforeLeave(resolve, reject) { if (closeActiveIconPicker(app) || closeActiveSmartSelect(app) || closeActiveDatePicker(app)) { reject(); return; } if (editor) editor.beforeLeave(resolve, reject); else resolve(); },
        openGoalEditor(options = {}) {
            if (!state.user || editor) return;
            editor = openGoalEditor(context, {
                ...options,
                onClosed() { editor = null; options.onClosed?.(); },
                onSaved(row) { options.onSaved?.(row); notifySuccess(app, options.mode === 'movement' ? 'Movimentação salva.' : 'Objetivo salvo.'); },
            });
        },
        openSettings(mode = 'profile') {
            if (!state.user || editor) return;
            editor = openSettingsForm(context, {
                mode,
                onClosed() { editor = null; },
                onSaved(user) {
                    state.user = { id: user.id, name: user.name, email: user.email };
                    context.events.dispatchEvent(new CustomEvent('profile:changed'));
                    notifySuccess(app, 'Perfil atualizado com sucesso.');
                },
                onPasswordChanged(email) { onPasswordChanged?.(email); },
            });
        },
        openBudgetCopy(options) {
            if (!state.user || editor) return;
            if (!state.cycleConfiguration?.configured) { void context.openCycleSettings(); return; }
            editor = openBudgetCopy(context, {
                ...options,
                onClosed() { editor = null; },
                onSaved(row) {
                    state.budgetMonth = `${row.year}-${String(row.month).padStart(2, '0')}`;
                    context.events.dispatchEvent(new CustomEvent('budgets:changed', { detail: { row, kind: 'copied' } }));
                    notifySuccess(app, `${row.copied_count} ${row.copied_count === 1 ? 'orçamento copiado' : 'orçamentos copiados'} para o ciclo selecionado.`);
                },
            });
        },
        openBudget(options = {}) {
            if (!state.user || editor) return;
            if (!state.cycleConfiguration?.configured) { void context.openCycleSettings(); return; }
            editor = openBudgetForm(context, {
                ...options,
                onClosed() { editor = null; },
                onSaved(row, kind) {
                    state.budgetMonth = `${row.year}-${String(row.month).padStart(2, '0')}`;
                    context.events.dispatchEvent(new CustomEvent('budgets:changed', { detail: { row, kind } }));
                    notifySuccess(app, { created: 'Orçamento salvo.', updated: 'Limite atualizado.', deleted: 'Orçamento removido. Seus lançamentos foram preservados.' }[kind]);
                },
            });
        },
        openTransaction(options = {}) {
            if (!state.user || editor) return;
            if (!options.preview && !state.cycleConfiguration?.configured) { void context.openCycleSettings(); return; }
            editor = openTransactionForm(context, {
                ...options,
                onClosed() { editor = null; options.onClosed?.(); },
                onSaved(row, kind) {
                    if (options.preview) {
                        options.onSaved?.(row, kind);
                        return;
                    }
                    if (kind !== 'deleted') state.historyMonth = row.cycle_key || row.transaction_date.slice(0, 7);
                    state.historyFeedback = '';
                    state.dashboardFeedback = '';
                    const message = { created: 'Lançamento salvo.', updated: 'Lançamento atualizado.', deleted: 'Lançamento excluído.' }[kind];
                    const onDashboard = (view.router.currentRoute.route?.path || view.router.currentRoute.path) === '/inicio/';
                    if (onDashboard) {
                        if (kind !== 'deleted') state.dashboardMonth = row.cycle_key || row.transaction_date.slice(0, 7);
                        state.dashboardFeedback = state.historyFeedback;
                    }
                    options.onSaved?.(row, kind);
                    context.events.dispatchEvent(new CustomEvent('transactions:changed', { detail: { row, kind } }));
                    if (!options.stayOnPage && !onDashboard && view.router.currentRoute.path !== '/historico/') view.router.navigate(`/historico/?month=${state.historyMonth}`);
                    notifySuccess(app, message);
                },
            });
        },
    };

    function updateNavigation(route) {
        const section = route.path?.split('/').filter(Boolean)[0] || 'inicio';
        for (const link of container.querySelectorAll('[data-section]')) {
            const active = link.dataset.section === section;
            link.classList.toggle('nav-active', active);
            if (active) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        }
        const titles = { inicio: 'Início', historico: 'Histórico', relatorios: 'Relatórios', mais: 'Mais', categorias: 'Categorias', conciliacao: 'Sincronização bancária', objetivos: 'Objetivos', orcamentos: 'Orçamento mensal' };
        document.title = `${titles[section] || 'Início'} · Minhas Finanças`;
    }

    container.addEventListener('click', event => {
        if (event.target.closest('[data-cycle-open]')) { void context.openCycleSettings(); return; }
        const link = event.target.closest('[data-section]');
        if (!link || !view) return;
        event.preventDefault();
        const destination = link.getAttribute('href');
        // A URL pode ter filtros; tocar na mesma tela não deve reiniciar a rota.
        if (view.router.currentRoute.path === destination) return;
        view.router.navigate(destination);
    });
    newButton.addEventListener('click', () => context.openTransaction());

    return {
        async show(user) {
            state.user = user;
            authView.hidden = true;
            authView.classList.remove('view-main');
            container.hidden = false;
            financeView.classList.add('view-main');
            const boot = ++bootRevision;
            if (!view) {
                financeView.innerHTML = '<div class="page"><div class="page-content"><main class="finance-container"><section class="finance-card cycle-required" role="status">Carregando seu ciclo financeiro...</section></main></div></div>';
                try {
                    const response = await getCycleConfiguration();
                    if (boot !== bootRevision || state.user !== user) return;
                    applyCycles(response.data);
                } catch (error) {
                    if (boot !== bootRevision || state.user !== user) return;
                    if (error.status === 401) { onSessionExpired(); return; }
                    state.cycleError = true;
                }
                financeView.replaceChildren();
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
            clearInterval(cycleTimer); cycleTimer = setInterval(() => { void refreshCycles(); }, 60000);
        },
        hide() {
            bootRevision++; clearInterval(cycleTimer);
            const wasActive = Boolean(state.user);
            clearNotifications(app);
            container.hidden = true;
            editor?.close(true);
            for (const cleanup of [...cleanups]) cleanup();
            view?.destroy();
            view = null;
            financeView.replaceChildren();
            financeView.classList.remove('view-main');
            authView.hidden = false;
            authView.classList.add('view-main');
            delete state.reconciliationDemo;
            delete state.cycleConfiguration; clearCycles();
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
