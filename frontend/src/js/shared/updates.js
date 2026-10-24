import { hasPendingWrites } from '../api.js';
import { icon } from './html.js';
export const UPDATE_EVENT = 'mf:update-change';
const APP = 'minhas-financas';
const PREFIX = 'minhas-financas-static-';

// Block even clean open editors: activating a release must not interrupt an interaction.
export function hasOpenWork() {
    if (hasPendingWrites()) return true;
    if (document.querySelector('.popup.modal-in,.popup.modal-out,.sheet-modal.modal-in,.sheet-modal.modal-out,.dialog.modal-in,.dialog.modal-out,form[aria-busy="true"]')) return true;
    const auth = document.querySelector('#auth-view');
    return Boolean(auth && !auth.hidden && (document.querySelector('#login-fields')?.disabled
        || [...auth.querySelectorAll('#login-form input:not([type="checkbox"])')].some(input => input.value)));
}

function status(worker) {
    if (!worker) return Promise.resolve(null);
    return new Promise(resolve => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => { channel.port1.close(); resolve(null); }, 2000);
        channel.port1.onmessage = event => {
            clearTimeout(timer); channel.port1.close();
            resolve(event.data?.app === APP ? event.data : null);
        };
        try { worker.postMessage({ app:APP, type:'STATUS' }, [channel.port2]); }
        catch { clearTimeout(timer); channel.port1.close(); resolve(null); }
    });
}

export function createUpdater(app) {
    const build = document.querySelector('meta[name="mf-build"]')?.content;
    let registration, waitingUpdate = false, reloadPending = false, applying = false, checking = false;
    let timeout, notice, lastCheck = 0;
    const watchedWorkers = new WeakSet();
    const enabled = Boolean(import.meta.env.PROD && window.isSecureContext && 'serviceWorker' in navigator && build);
    const available = () => waitingUpdate || reloadPending;
    function signal() {
        window.dispatchEvent(new Event(UPDATE_EVENT));
        if (available() && !notice) {
            // Independent of transient success notifications: this action stays available.
            notice = document.createElement('aside');
            notice.className = 'mf-update-notice';
            notice.setAttribute('aria-label', 'Atualização do aplicativo');
            notice.innerHTML = `<button type="button" class="mf-update-action"><span class="mf-update-icon">${icon('arrow_clockwise')}</span><span class="mf-update-copy"><strong>Nova versão disponível</strong><span data-update-message role="status" aria-live="polite">Clique aqui para atualizar o aplicativo.</span></span>${icon('chevron_right')}</button>`;
            notice.querySelector('button').addEventListener('click', () => void request());
            document.querySelector('#app').append(notice);
        }
        if (notice) {
            const hidden = !available() && !applying;
            if (notice.hidden !== hidden) notice.hidden = hidden;
            const button = notice.querySelector('button');
            if (button.disabled !== applying) button.disabled = applying;
            const busy = String(applying);
            if (button.getAttribute('aria-busy') !== busy) button.setAttribute('aria-busy', busy);
            const label = notice.querySelector('[data-update-message]');
            const text = applying ? 'Atualizando aplicativo…' : 'Clique aqui para atualizar o aplicativo.';
            if (label.textContent !== text) label.textContent = text;
        }
    }

    const fail = () => app.dialog.alert('Não foi possível concluir a atualização agora. Continue usando o aplicativo e tente novamente mais tarde.', 'Atualização do aplicativo');

    async function inspectController() {
        let controller, waiting, info, candidate;
        // An activation can finish while the status replies are in flight.
        // Keep the caller waiting for a consistent snapshot, including the reload handler.
        do {
            controller = navigator.serviceWorker.controller;
            waiting = registration?.waiting;
            watchWorker(waiting);
            [info, candidate] = await Promise.all([status(controller), status(waiting)]);
        } while (controller !== navigator.serviceWorker.controller || waiting !== registration?.waiting);
        waitingUpdate = Boolean(candidate?.version && candidate.version !== build);
        // Network HTML may already contain the waiting build. An older controller
        // alone must not advertise that same release again or trigger a useless reload.
        reloadPending = Boolean(!waiting && !registration?.installing && info?.version && info.version !== build);
        signal();
        return info;
    }
    function watchWorker(worker) {
        if (!worker || watchedWorkers.has(worker)) return;
        watchedWorkers.add(worker);
        worker.addEventListener('statechange', () => void inspectController());
    }
    async function check(force = false) {
        if (!registration || checking || (!force && Date.now() - lastCheck < 60000) || !navigator.onLine) return;
        checking = true; lastCheck = Date.now();
        try { await registration.update(); } catch { /* A connection failure does not interrupt the app. */ }
        finally { checking = false; await inspectController(); }
    }
    async function start() {
        if (!enabled) {
            // Dev uses fresh network HTML. Only unregister workers that identify themselves as ours.
            if (import.meta.env.DEV && 'serviceWorker' in navigator) {
                try {
                    for (const entry of await navigator.serviceWorker.getRegistrations()) {
                        const info = await status(entry.active || entry.waiting);
                        if (info?.app === APP) await entry.unregister();
                    }
                    for (const key of await caches.keys()) if (key.startsWith(PREFIX)) await caches.delete(key);
                } catch { /* Some browsers/private sessions do not expose these APIs. */ }
            }
            return;
        }
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data?.app === APP && event.data.type === 'REPORT_VERSION') event.ports[0]?.postMessage({ app:APP, build });
        });
        navigator.serviceWorker.addEventListener('controllerchange', async () => {
            const info = await inspectController();
            if (!applying) return; // Other tabs never reload automatically.
            if (!info) return;
            clearTimeout(timeout); applying = false;
            if (info && !hasOpenWork()) {
                if (info.version !== build) window.location.reload();
                else { reloadPending = false; signal(); }
            } else signal(); // A form opened while activation was pending: leave it intact.
        });
        try {
            registration = await navigator.serviceWorker.register('/sw.js', { scope:'/', updateViaCache:'none' });
            registration.addEventListener('updatefound', () => {
                watchWorker(registration.installing);
                void inspectController();
            });
            watchWorker(registration.installing);
            await inspectController();
            signal();
            window.addEventListener('online', () => void check(true));
            document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { void check(); signal(); } });
            setInterval(() => { if (document.visibilityState === 'visible') void check(); }, 15 * 60 * 1000);
            let scheduled = false;
            const observer = new MutationObserver(() => {
                if (scheduled) return;
                scheduled = true;
                setTimeout(() => { scheduled = false; signal(); }, 80);
            });
            observer.observe(document.querySelector('#app'), { subtree:true, attributes:true, attributeFilter:['class','hidden','aria-busy'], childList:true });
        } catch { /* Installation may be denied: the online app must remain usable. */ }
    }
    if (document.readyState === 'complete') void start();
    else window.addEventListener('load', () => void start(), { once:true });

    async function request() {
        if (!enabled || applying || !available()) return;
        await inspectController();
        if (applying || !available()) return;
        if (hasOpenWork()) {
            app.dialog.alert('Conclua ou feche o formulário antes de atualizar. Suas alterações serão preservadas enquanto você continua editando.', 'Conclua a edição');
            return;
        }
        if (!navigator.onLine) { app.dialog.alert('Conecte-se à internet para atualizar o aplicativo.', 'Sem conexão'); return; }
        if (registration.waiting) {
            applying = true; signal();
            timeout = setTimeout(() => { applying = false; signal(); fail(); }, 15000);
            registration.waiting.postMessage({ app:APP, type:'ACTIVATE_UPDATE' });
        } else if (reloadPending && !hasOpenWork()) window.location.reload();
    }
    return {
        get available() { return available(); },
        get applying() { return applying; },
        request,
    };
}
