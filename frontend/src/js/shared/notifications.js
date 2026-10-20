import { escapeHtml, icon } from './html.js';

const current = new WeakMap();
export function clearNotifications(app) {
    const notification = current.get(app);
    if (notification && !notification.destroyed) notification.close(false);
}

// Success belongs to the completed action, never to a page refresh or stored state.
export function notifySuccess(app, message) {
    if (!message) return;
    clearNotifications(app);
    const notification = app.notification.create({
        icon: icon('checkmark_circle_fill'), title: 'Minhas Finanças',
        text: escapeHtml(message), cssClass: 'mf-notification',
        closeTimeout: 3500, closeButton: false, closeOnClick: false, swipeToClose: true,
        on: {
            open(instance) {
                instance.el.setAttribute('role', 'status');
                instance.el.setAttribute('aria-live', 'polite');
                instance.el.setAttribute('aria-atomic', 'true');

            },
            closed(instance) {
                if (current.get(app) === instance) current.delete(app);
                const element = instance.el;
                queueMicrotask(() => { instance.destroy(); element.remove(); });
            },
        },
    });
    current.set(app, notification);
    notification.open();
    return notification;
}
