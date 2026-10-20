import { icon } from './html.js';

let sequence = 0;

// One presentation for Framework7 alerts and confirmations throughout the app.
// The original buttons and callbacks remain responsible for every action.
export function installDialogs(app) {
    app.on('dialogOpen', dialog => {
        if (!dialog.params.buttons?.length) return;
        const el = dialog.el;
        const previousFocus = document.activeElement;
        const confirming = dialog.params.buttons.length > 1;
        el.classList.add('mf-dialog', confirming ? 'mf-dialog-confirm' : 'mf-dialog-info');
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        const id = `mf-dialog-${++sequence}`;
        const title = el.querySelector('.dialog-title'), text = el.querySelector('.dialog-text');
        if (title) { title.id = `${id}-title`; el.setAttribute('aria-labelledby', title.id); }
        if (text) { text.id = `${id}-text`; el.setAttribute('aria-describedby', text.id); }
        const inner = el.querySelector('.dialog-inner');
        if (!inner.querySelector('.mf-dialog-icon')) {
            const badge = document.createElement('span');
            badge.className = 'mf-dialog-icon'; badge.setAttribute('aria-hidden', 'true');
            badge.innerHTML = icon(confirming ? 'exclamationmark_circle' : 'info_circle');
            inner.prepend(badge);
        }
        const buttons = [...el.querySelectorAll('.dialog-button')];
        function keydown(event) {
            if (event.key === 'Escape') {
                event.preventDefault(); event.stopPropagation();
                buttons[0]?.click();
            } else if (event.key === 'Tab') {
                if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
                else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus(); }
            }
        }
        el.addEventListener('keydown', keydown);
        dialog.once('opened', () => buttons[0]?.focus({ preventScroll: true }));
        dialog.once('closed', () => {
            el.removeEventListener('keydown', keydown);
            if (previousFocus?.isConnected && !previousFocus.matches(':disabled')) previousFocus.focus({ preventScroll: true });
        });
    });
}
