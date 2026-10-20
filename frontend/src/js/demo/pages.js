import { getTheme, THEME_EVENT } from '../shared/theme.js';
import { escapeHtml as esc, icon } from '../shared/html.js';

export function mountMore(root, ctx) {
    const events = new AbortController();
    let signingOut = false;
    root.classList.add('settings-container');
    function render() {
        root.innerHTML = `<header class="finance-header"><span class="settings-header-icon">${icon('gear_alt')}</span><h1 tabindex="-1">Configurações</h1><button class="icon-button" type="button" data-more-help aria-label="Sobre o aplicativo">${icon('info_circle')}</button></header><button type="button" class="finance-card profile-card settings-profile-button" data-settings-profile aria-label="Editar perfil"><span class="profile-avatar">${icon('person')}</span><span class="settings-profile-copy"><strong data-profile-name></strong><span data-profile-email></span></span>${icon('chevron_right')}</button><section class="finance-card settings-links"><button type="button" class="settings-row settings-theme-row" data-settings-theme><span class="settings-icon" data-theme-icon></span><span><strong>Aparência</strong><small data-theme-label></small></span>${icon('chevron_right')}</button><a href="/categorias/" class="settings-row categories-menu-link"><span class="settings-icon settings-icon-orange">${icon('folder')}</span><span><strong>Categorias</strong><small>Organize suas receitas e despesas</small></span>${icon('chevron_right')}</a><a href="/orcamentos/" class="settings-row budgets-menu-link"><span class="settings-icon">${icon('money_dollar_circle')}</span><span><strong>Orçamento mensal</strong><small>Planeje seus limites de gastos</small></span>${icon('chevron_right')}</a><button type="button" class="settings-row" data-settings-password><span class="settings-icon settings-icon-purple">${icon('lock')}</span><span><strong>Alterar senha</strong><small>Atualize sua senha de acesso</small></span>${icon('chevron_right')}</button><button type="button" class="settings-row logout-row" data-action="logout"><span class="settings-icon settings-icon-red">${icon('arrow_right_square')}</span><span><strong>Sair da conta</strong><small>Encerrar sua sessão com segurança</small></span>${icon('chevron_right')}</button></section>`;
        root.querySelector('[data-profile-name]').textContent = ctx.state.user.name;
        root.querySelector('[data-profile-email]').textContent = ctx.state.user.email;
        root.querySelector('[data-action="logout"]').disabled = signingOut;
        syncTheme();
    }
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
        if (event.target.closest('[data-settings-theme]')) ctx.theme.set(getTheme() === 'dark' ? 'light' : 'dark');
        if (event.target.closest('[data-more-help]')) ctx.app.dialog.alert('Registre suas entradas e saídas manualmente. O resultado de cada período é a diferença entre esses valores e não representa um saldo bancário.', 'Minhas Finanças');
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
