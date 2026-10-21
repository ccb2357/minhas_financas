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
    let registration, reloadPending = false, applying = false, checking = false;
    let timeout, notice, announced = false, lastCheck = 0;
    const enabled = Boolean(import.meta.env.PROD && window.isSecureContext && 'serviceWorker' in navigator && build);
    const available = () => Boolean(registration?.waiting || reloadPending);
    function signal() {
        window.dispatchEvent(new Event(UPDATE_EVENT));
        if (available() && !announced && !hasOpenWork() && document.visibilityState === 'visible') {
            announced = true;
            notice = app.notification.create({
                icon:icon('arrow_clockwise'), title:'Minhas Finanças', cssClass:'mf-notification',
                text:'Uma nova versão está disponível em Mais → Atualizar aplicativo.',
                closeTimeout:5000, closeButton:false, swipeToClose:true,
                on:{ open(instance) { instance.el.setAttribute('role','status'); instance.el.setAttribute('aria-live','polite'); },
                    closed(instance) { if (notice === instance) notice = null; const el=instance.el; queueMicrotask(() => { instance.destroy(); el.remove(); }); } },
            });
            notice.open();
        }
        if (hasOpenWork() && notice && !notice.destroyed) notice.close();
    }
    const fail = () => app.dialog.alert('Não foi possível concluir a atualização agora. Continue usando o aplicativo e tente novamente mais tarde.', 'Atualização do aplicativo');

    async function inspectController() {
        const info = await status(navigator.serviceWorker.controller);
        reloadPending = Boolean(info?.version && info.version !== build);
        signal();
        return info;
    }
    async function check(force = false) {
        if (!registration || checking || (!force && Date.now() - lastCheck < 60000) || !navigator.onLine) return;
        checking = true; lastCheck = Date.now();
        try { await registration.update(); } catch { /* A connection failure does not interrupt the app. */ }
        finally { checking = false; signal(); }
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
            clearTimeout(timeout); applying = false;
            if (info && !hasOpenWork()) {
                if (info.version !== build) window.location.reload();
                else { reloadPending = false; signal(); }
            } else signal(); // A form opened while activation was pending: leave it intact.
        });
        try {
            registration = await navigator.serviceWorker.register('/sw.js', { scope:'/', updateViaCache:'none' });
            registration.addEventListener('updatefound', () => {
                const worker = registration.installing;
                worker?.addEventListener('statechange', () => {
                    if (worker.state === 'installed') { announced = false; signal(); }
                });
            });
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

    return {
        get available() { return available(); },
        get applying() { return applying; },
        async request() {
            if (!enabled || applying || !available()) return;
            if (hasOpenWork()) {
                app.dialog.alert('Conclua ou feche o formulário antes de atualizar. Suas alterações serão preservadas enquanto você continua editando.', 'Conclua a edição');
                return;
            }
            if (!navigator.onLine) { app.dialog.alert('Conecte-se à internet para atualizar o aplicativo.', 'Sem conexão'); return; }
            if (notice && !notice.destroyed) notice.close();
            if (registration.waiting) {
                applying = true; signal();
                timeout = setTimeout(() => { applying = false; signal(); fail(); }, 15000);
                registration.waiting.postMessage({ app:APP, type:'ACTIVATE_UPDATE' });
            } else if (reloadPending && !hasOpenWork()) window.location.reload();
        },
    };
}
