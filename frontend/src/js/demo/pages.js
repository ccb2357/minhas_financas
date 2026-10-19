import { escapeHtml as esc, icon } from '../shared/html.js';

export function mountMore(root, ctx) {
    function render() {
        root.innerHTML = `<header class="finance-header"><span></span><h1 tabindex="-1">Mais</h1><button class="icon-button" type="button" data-more-help aria-label="Sobre o aplicativo">${icon('info_circle')}</button></header><section class="finance-card profile-card"><span class="profile-avatar">${icon('person_crop_circle')}</span><div><h2 data-profile-name></h2><p data-profile-email></p></div></section><a href="/categorias/" class="finance-card settings-row categories-menu-link"><span class="settings-icon">${icon('square_grid_2x2')}</span><span><strong>Categorias</strong><small>Organize suas receitas e despesas</small></span>${icon('chevron_right')}</a><section class="finance-card more-settings"><div class="settings-row"><span class="settings-icon">${icon('money_dollar_circle')}</span><span><strong>Moeda</strong><small>Real brasileiro</small></span><b>BRL (R$)</b></div><div class="settings-row"><span class="settings-icon">${icon('sun_max')}</span><span><strong>Aparência</strong><small>Tema claro</small></span></div></section><section class="finance-card demo-explanation"><h2>Conheça o aplicativo</h2><p>Início, Histórico, Categorias e Relatórios usam os dados salvos na sua conta. Registre manualmente suas entradas e saídas para acompanhar suas finanças.</p><a class="link" href="/inicio/">Voltar ao início ${icon('arrow_right')}</a></section><button type="button" class="finance-card settings-row logout-row" data-action="logout"><span class="settings-icon">${icon('arrow_right_square')}</span><span><strong>Sair da conta</strong><small>Encerrar sua sessão com segurança</small></span>${icon('chevron_right')}</button>`;
        root.querySelector('[data-profile-name]').textContent = ctx.state.user.name;
        root.querySelector('[data-profile-email]').textContent = ctx.state.user.email;
    }
    const handler = async event => {
        if (event.target.closest('[data-more-help]')) ctx.app.dialog.alert('Registre suas entradas e saídas manualmente. O resultado de cada período é a diferença entre esses valores e não representa um saldo bancário.', 'Minhas Finanças');
        const button = event.target.closest('[data-action="logout"]');
        if (!button || button.disabled) return;
        button.disabled = true;
        try { await ctx.logout(); }
        catch (error) { ctx.app.dialog.alert(esc(error.message), 'Não foi possível sair'); }
        finally { button.disabled = false; }
    };
    root.addEventListener('click', handler);
    render();
    return { refresh: render, destroy() { root.removeEventListener('click', handler); } };
}
