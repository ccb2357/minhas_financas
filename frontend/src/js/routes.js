import { mountDashboard, mountHistory, mountReports, mountMore } from './demo/pages.js';

export function createRoutes(context) {
    const mounted = new WeakMap();
    return [
        ['inicio', mountDashboard], ['historico', mountHistory],
        ['relatorios', mountReports], ['mais', mountMore],
    ].map(([name, mount]) => ({
        path: `/${name}/`,
        ...(name === 'inicio' ? { alias: '/' } : {}),
        content: `<div class="page finance-page" data-name="${name}"><div class="page-content finance-scroll"><main class="finance-container" data-page-root></main></div></div>`,
        on: {
            pageInit(_event, page) {
                const root = page.el.querySelector('[data-page-root]');
                const controller = mount(root, context, page.route || page.router.currentRoute);
                let destroyed = false;
                function destroy() {
                    if (destroyed) return;
                    destroyed = true;
                    controller.destroy();
                    context.cleanups.delete(destroy);
                    mounted.delete(page.el);
                }
                mounted.set(page.el, { controller, destroy });
                context.cleanups.add(destroy);
            },
            pageBeforeIn(_event, page) {
                mounted.get(page.el)?.controller.refresh();
            },
            pageBeforeRemove(_event, page) {
                mounted.get(page.el)?.destroy();
            },
        },
    }));
}
