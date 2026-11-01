import { mountGoals } from './goals/page.js';
import { mountBudgets } from './budgets/page.js';
import { mountDashboard } from './dashboard/page.js';
import { mountMore } from './demo/pages.js';
import { mountReports } from './reports/page.js';
import { mountCategories } from './categories/page.js';
import { mountHistory } from './transactions/history.js';

export function createRoutes(context) {
    const mounted = new WeakMap();
    return [
        ['inicio', mountDashboard], ['historico', mountHistory],
        ['relatorios', mountReports], ['mais', mountMore],
        ['categorias', mountCategories], ['orcamentos', mountBudgets],
        ['objetivos', mountGoals],
    ].map(([name, mount]) => ({
        path: `/${name}/`,
        ...(name === 'inicio' ? { alias: '/' } : {}),
        content: `<div class="page finance-page" data-name="${name}"><div class="page-content finance-scroll"><main class="finance-container" data-page-root></main></div></div>`,
        beforeLeave({ resolve, reject, router, from, direction }) {
            context.beforeLeave(resolve, () => {
                // Cancelar a saída também libera o roteador e desfaz um Voltar/Avançar
                // que o navegador já tenha aplicado à URL antes da confirmação.
                router.allowPageChange = true;
                reject();
                const visibleRoute = window.location.hash.startsWith('#!') ? window.location.hash.slice(2) : '/';
                if (router.params.browserHistory && visibleRoute !== from.url) {
                    if (direction === 'backward') window.history.forward();
                    else window.history.back();
                }
            });
        },
        on: {
            pageInit(_event, page) {
                const root = page.el.querySelector('[data-page-root]');
                const controller = mount(root, context, page.route || page.router.currentRoute);
                let destroyed = false;
                function destroy() {
                    if (destroyed) return;
                    destroyed = true;
                    context.events.removeEventListener('cycles:changed', refreshCycles);
                    controller.destroy();
                    context.cleanups.delete(destroy);
                    mounted.delete(page.el);
                }
                function refreshCycles() { if (page.el.classList.contains('page-current')) controller.refresh(); }
                context.events.addEventListener('cycles:changed', refreshCycles);
                mounted.set(page.el, { controller, destroy });
                context.cleanups.add(destroy);
            },
            pageBeforeIn(_event, page) {
                mounted.get(page.el)?.controller.refresh();
            },
            pageBeforeRemove(_event, page) {
                mounted.get(page.el)?.destroy();
            },
            pageBeforeOut(_event, page) {
                mounted.get(page.el)?.controller.leave?.();
            },
        },
    }));
}
