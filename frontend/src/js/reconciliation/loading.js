import { icon } from '../shared/html.js';

export function createReconciliationLoading(fallbackFocus) {
    let overlay, previousFocus;
    const inert = new Map();
    function hide() {
        if (!overlay) return;
        overlay.remove(); overlay = null;
        document.documentElement.classList.remove('reconciliation-loading-open');
        for (const [element, value] of inert) element.inert = value;
        inert.clear();
        const target = previousFocus?.isConnected && !previousFocus.disabled && !previousFocus.closest('[inert]')
            ? previousFocus : fallbackFocus;
        if (target?.isConnected && !target.closest('[inert]')) target.focus({ preventScroll: true });
        previousFocus = null;
    }
    return {
        set(visible, title, detail) {
            if (!visible) { hide(); return; }
            if (!overlay) {
                const app = document.querySelector('#app');
                previousFocus = document.activeElement;
                overlay = document.createElement('div');
                overlay.className = 'reconciliation-loading';
                overlay.setAttribute('role', 'dialog');
                overlay.setAttribute('aria-modal', 'true');
                overlay.setAttribute('aria-label', 'Carregando conciliação bancária');
                overlay.tabIndex = -1;
                overlay.innerHTML = `<section class="reconciliation-loading-panel"><div class="reconciliation-loading-symbol" aria-hidden="true"><span></span>${icon('arrow_2_circlepath')}</div><span class="reconciliation-loading-eyebrow">CONCILIAÇÃO BANCÁRIA</span><div role="status" aria-live="polite" aria-atomic="true"><h2></h2><p></p></div><small>Aguarde um instante.</small></section>`;
                overlay.addEventListener('keydown', event => { if (event.key === 'Tab') event.preventDefault(); });
                for (const element of app.children) {
                    inert.set(element, element.inert);
                    element.inert = true;
                }
                app.append(overlay);
                document.documentElement.classList.add('reconciliation-loading-open');
                overlay.focus({ preventScroll: true });
            }
            const heading = overlay.querySelector('h2'), description = overlay.querySelector('p');
            if (heading.textContent !== title) heading.textContent = title;
            if (description.textContent !== detail) description.textContent = detail;
        },
        destroy: hide,
    };
}
