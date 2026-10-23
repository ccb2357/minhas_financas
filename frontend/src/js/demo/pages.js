import { pageHeader } from '../shared/page-header.js';
import { UPDATE_EVENT } from '../shared/updates.js';
import { INSTALL_EVENT } from '../shared/install.js';
import { getTheme, THEME_EVENT } from '../shared/theme.js';
import { escapeHtml as esc, icon } from '../shared/html.js';

export function mountMore(root, ctx) {
    const events = new AbortController();
    let signingOut = false;
    root.classList.add('settings-container');
    function render() {
        root.innerHTML = `${pageHeader('Configurações', 'Seu perfil e suas preferências')}<button type="button" class="finance-card profile-card settings-profile-button" data-settings-profile aria-label="Editar perfil"><span class="profile-avatar">${icon('person')}</span><span class="settings-profile-copy"><strong data-profile-name></strong><span data-profile-email></span></span>${icon('chevron_right')}</button><section class="finance-card settings-links"><button type="button" class="settings-row settings-theme-row" data-settings-theme><span class="settings-icon" data-theme-icon></span><span><strong>Aparência</strong><small data-theme-label></small></span>${icon('chevron_right')}</button><a href="/categorias/" class="settings-row categories-menu-link"><span class="settings-icon settings-icon-orange">${icon('folder')}</span><span><strong>Categorias</strong><small>Organize suas receitas e despesas</small></span>${icon('chevron_right')}</a><div class="settings-row settings-reconciliation"><span class="settings-icon">${icon('arrow_2_circlepath')}</span><span><strong>Conciliação bancária</strong><small>Atualização de transações.</small></span></div><button type="button" class="settings-row" data-settings-password><span class="settings-icon settings-icon-purple">${icon('lock')}</span><span><strong>Alterar senha</strong><small>Atualize sua senha de acesso</small></span>${icon('chevron_right')}</button><button type="button" class="settings-row" data-settings-update hidden><span class="settings-icon">${icon('arrow_clockwise')}</span><span><strong>Atualizar aplicativo</strong><small data-update-label>Uma nova versão está disponível</small></span>${icon('chevron_right')}</button><button type="button" class="settings-row" data-settings-install><span class="settings-icon">${icon('square_arrow_down')}</span><span><strong>Instalar aplicativo</strong><small>Tenha o app na tela inicial</small></span>${icon('chevron_right')}</button><button type="button" class="settings-row logout-row" data-action="logout"><span class="settings-icon settings-icon-red">${icon('arrow_right_square')}</span><span><strong>Sair da conta</strong><small>Encerrar sua sessão com segurança</small></span>${icon('chevron_right')}</button></section>`;
        root.querySelector('[data-profile-name]').textContent = ctx.state.user.name;
        root.querySelector('[data-profile-email]').textContent = ctx.state.user.email;
        root.querySelector('[data-action="logout"]').disabled = signingOut;
        syncTheme();
        syncInstall();
        syncUpdates();
    }
    function syncUpdates() {
        const button = root.querySelector('[data-settings-update]');
        if (!button) return;
        if (button.hidden !== !ctx.updates.available) button.hidden = !ctx.updates.available;
        if (button.disabled !== ctx.updates.applying) button.disabled = ctx.updates.applying;
        const busy = String(ctx.updates.applying);
        if (button.getAttribute('aria-busy') !== busy) button.setAttribute('aria-busy', busy);
        const label = button.querySelector('[data-update-label]');
        const text = ctx.updates.applying ? 'Atualizando…' : 'Uma nova versão está disponível';
        if (label.textContent !== text) label.textContent = text;
    }
    window.addEventListener(UPDATE_EVENT, syncUpdates, { signal:events.signal });
    function syncInstall() {
        const button = root.querySelector('[data-settings-install]');
        if (!button) return;
        button.hidden = ctx.installer.installed;
        button.disabled = ctx.installer.busy;
        button.setAttribute('aria-busy', String(ctx.installer.busy));
    }
    window.addEventListener(INSTALL_EVENT, syncInstall, { signal: events.signal });
    function syncTheme() {
        const theme = getTheme();
        const button = root.querySelector('[data-settings-theme]');
        if (!button) return;
        root.querySelector('[data-theme-icon]').innerHTML = icon(theme === 'dark' ? 'moon_fill' : 'sun_max');
        root.querySelector('[data-theme-label]').textContent = theme === 'dark' ? 'Tema escuro' : 'Tema claro';
        button.setAttribute('aria-label', `Aparência: ${theme === 'dark' ? 'Tema escuro. Ativar tema claro' : 'Tema claro. Ativar tema escuro'}`);
    }
    window.addEventListener(THEME_EVENT, syncTheme, { signal: events.signal });
    const handler = async event => {
        if (event.target.closest('[data-settings-update]')) await ctx.updates.request();
        if (event.target.closest('[data-settings-install]')) await ctx.installer.request();
        if (event.target.closest('[data-settings-theme]')) ctx.theme.set(getTheme() === 'dark' ? 'light' : 'dark');
        if (event.target.closest('[data-settings-profile]')) ctx.openSettings('profile');
        if (event.target.closest('[data-settings-password]')) ctx.openSettings('password');
        const button = event.target.closest('[data-action="logout"]');
        if (!button || button.disabled || signingOut) return;
        signingOut = true; button.disabled = true;
        try { await ctx.logout(); }
        catch (error) { ctx.app.dialog.alert(esc(error.message), 'Não foi possível sair'); }
        finally { signingOut = false; button.disabled = false; }
    };
    root.addEventListener('click', handler, { signal: events.signal });
    ctx.events.addEventListener('profile:changed', () => { render(); root.querySelector('[data-settings-profile]').focus(); }, { signal: events.signal });
    render();
    return { refresh: render, destroy() { events.abort(); } };
}
