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
    let autoTimer, retryAfter = 0, noticeUntil = 0;
    const safe = () => document.visibilityState === 'visible' && navigator.onLine && !hasOpenWork();
    function hideNotice() { if (notice && !notice.hidden) notice.hidden = true; }
    function signal() {
        window.dispatchEvent(new Event(UPDATE_EVENT));
        if (!applying) hideNotice();
        if (available() && !applying && !autoTimer) {
            autoTimer = setTimeout(() => { autoTimer = null; void request(); }, 200);
        }
    }
    function showNotice() {
        if (!notice) {
            notice = document.createElement('aside');
            notice.className = 'mf-update-notice';
            notice.setAttribute('role', 'status');
            notice.setAttribute('aria-live', 'polite');
            notice.setAttribute('aria-atomic', 'true');
            notice.innerHTML = `<span class="mf-update-icon">${icon('arrow_clockwise')}</span><span class="mf-update-copy"><strong>Uma nova versão chegou</strong><span>Atualizando seu aplicativo…</span></span><span class="mf-update-progress" aria-hidden="true"></span>`;
            document.querySelector('#app').append(notice);
        }
        notice.hidden = false;
    }
    function pause(retry = false) {
        clearTimeout(timeout);
        applying = false;
        if (retry) retryAfter = Date.now() + 60000;
        signal();
    }
    function reload(version) {
        // A stale HTML response must not produce a reload loop.
        try {
            const previous = JSON.parse(sessionStorage.getItem('minhas-financas.update-reload') || 'null');
            if (previous?.build === build && previous?.version === version && Date.now() - previous.time < 60000) {
                pause(true); return;
            }
            sessionStorage.setItem('minhas-financas.update-reload', JSON.stringify({ build, version, time:Date.now() }));
        } catch { /* Storage restrictions do not prevent a safe update. */ }
        window.location.reload();
    }
    async function finishActivation(info) {
        if (!applying || !info || !notice || notice.hidden) return;
        await new Promise(resolve => setTimeout(resolve, Math.max(0, noticeUntil - Date.now())));
        if (!applying) return;
        if (safe() && info.version !== build) {
            clearTimeout(timeout); reload(info.version);
        } else pause();
    }

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
            await finishActivation(info);
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
            // Also resume after a write finishes without changing the DOM.
            setInterval(() => { if (available() && !applying) signal(); }, 1000);
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
        if (!enabled || applying || !available() || Date.now() < retryAfter || !safe()) return;
        // Reserve this attempt before awaiting worker replies.
        applying = true;
        const info = await inspectController();
        if (!available() || !safe()) { pause(); return; }
        noticeUntil = Date.now() + 1800;
        showNotice(); signal();
        await new Promise(resolve => setTimeout(resolve, 1800));
        if (!applying) return;
        if (!safe()) { pause(); return; }
        if (registration.waiting) {
            timeout = setTimeout(() => pause(true), 15000);
            try { registration.waiting.postMessage({ app:APP, type:'ACTIVATE_UPDATE' }); }
            catch { pause(true); }
        } else if (reloadPending && info) await finishActivation(info);
        else pause();
    }
    return {
        get available() { return available(); },
        get applying() { return applying; },
        request,
    };
}
