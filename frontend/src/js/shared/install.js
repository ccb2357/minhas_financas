export const INSTALL_EVENT = 'mf:install-change';

// Installation is always initiated by a user gesture; no form or page reloads.
export function createInstaller(app) {
    const display = window.matchMedia('(display-mode: standalone)');
    let installed = display.matches || navigator.standalone === true;
    let deferred = null, busy = false;
    const notify = () => window.dispatchEvent(new Event(INSTALL_EVENT));
    window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        deferred = event;
        notify();
    });
    window.addEventListener('appinstalled', () => {
        installed = true;
        deferred = null;
        notify();
    });
    display.addEventListener('change', () => {
        installed = display.matches || navigator.standalone === true;
        notify();
    });

    function help() {
        let message;
        if (!window.isSecureContext) {
            message = 'Abra o aplicativo por HTTPS para instalar. Durante os testes locais, utilize o endereço localhost.';
        } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
            message = 'No Safari, abra Compartilhar e escolha Adicionar à Tela de Início. Se essa opção não aparecer, abra este endereço diretamente no Safari.';
        } else if (/Android/i.test(navigator.userAgent)) {
            message = 'No menu do navegador (⋮), procure Instalar aplicativo ou Adicionar à tela inicial. Se a opção ainda não aparecer, continue usando o app e tente novamente pelo menu do navegador.';
        } else {
            message = 'No Chrome ou Edge, procure o ícone de instalação na barra de endereço ou a opção Instalar aplicativo no menu do navegador. A disponibilidade depende do navegador utilizado.';
        }
        app.dialog.alert(message, 'Instalar Minhas Finanças');
    }

    return {
        get installed() { return installed; },
        get busy() { return busy; },
        async request() {
            if (installed || busy) return;
            if (!deferred) { help(); return; }
            const prompt = deferred;
            deferred = null;
            busy = true;
            notify();
            try {
                await prompt.prompt();
                await prompt.userChoice;
            } catch {
                help();
            } finally {
                busy = false;
                notify();
            }
        },
    };
}
