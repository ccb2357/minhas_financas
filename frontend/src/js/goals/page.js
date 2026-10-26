import { pageHeader } from '../shared/page-header.js';
import { icon } from '../shared/html.js';
import { listGoals, goalError } from './api.js';
import { goalCard } from './presentation.js';
import { openGoalDetail } from './detail.js';

export function mountGoals(root, ctx) {
    let alive = true, revision = 0, loading = false, status = 'active', page = 0, lastPage = 1, rows = [], detail;
    const events = new AbortController(); root.classList.add('goals-page');
    root.innerHTML = `${pageHeader('Objetivos', 'Seus planos ganhando forma')}<div class="goals-tabs" role="group" aria-label="Estado dos objetivos"><button type="button" data-goals-status="active" aria-pressed="true">Ativos</button><button type="button" data-goals-status="archived" aria-pressed="false">Arquivados</button></div><p class="goal-feedback" role="alert" hidden></p><div class="goals-list"></div><div class="goal-list-state" role="status"></div><button type="button" class="mf-button mf-button-secondary" data-goals-more hidden>Carregar mais</button><button type="button" class="budget-create-button" data-goals-create>${icon('plus')}<span>Novo objetivo</span></button>`;
    const list = root.querySelector('.goals-list'), state = root.querySelector('.goal-list-state'), feedback = root.querySelector('.goal-feedback'), more = root.querySelector('[data-goals-more]');
    function controls() { more.disabled = loading; more.hidden = page >= lastPage; list.setAttribute('aria-busy', String(loading)); }
    async function load(append = false) {
        if (!alive || (append && loading)) return;
        const current = ++revision, selected = status; loading = true; feedback.hidden = true; controls();
        if (!append) { rows = []; list.replaceChildren(); state.textContent = 'Carregando objetivos...'; }
        try {
            const response = await listGoals(selected, append ? page + 1 : 1); if (!alive || revision !== current) return;
            rows = append ? [...new Map([...rows, ...response.data].map(row => [row.id, row])).values()] : response.data;
            page = response.meta.current_page; lastPage = response.meta.last_page; list.innerHTML = rows.map(goalCard).join('');
            state.innerHTML = rows.length ? '' : `<div class="finance-card goal-empty"><span class="goal-icon">${icon('flag')}</span><h2>${status === 'active' ? 'Qual é o seu próximo objetivo?' : 'Nenhum objetivo arquivado'}</h2><p>${status === 'active' ? 'Crie um objetivo e acompanhe cada valor guardado.' : 'Objetivos concluídos ou arquivados aparecerão aqui.'}</p></div>`;
        } catch (failure) {
            if (!alive || revision !== current) return;
            if (failure.status === 401) { ctx.expireSession(); return; }
            feedback.textContent = goalError(failure); feedback.hidden = false;
            state.innerHTML = '<button type="button" class="mf-button mf-button-secondary" data-goals-retry>Tentar novamente</button>';
        } finally { if (alive && revision === current) { loading = false; controls(); } }
    }
    root.addEventListener('click', event => {
        const button = event.target.closest('button'); if (!button) return;
        if (button.dataset.goalsStatus && button.dataset.goalsStatus !== status) {
            status = button.dataset.goalsStatus; page = 0; lastPage = 1;
            for (const tab of root.querySelectorAll('[data-goals-status]')) tab.setAttribute('aria-pressed', String(tab.dataset.goalsStatus === status));
            void load();
        }
        if (button.hasAttribute('data-goals-retry')) void load();
        if (button.hasAttribute('data-goals-more')) void load(true);
        if (button.hasAttribute('data-goals-create')) ctx.openGoalEditor({ onSaved() { status = 'active'; for (const tab of root.querySelectorAll('[data-goals-status]')) tab.setAttribute('aria-pressed', String(tab.dataset.goalsStatus === status)); if (alive) void load(); } });
        if (button.dataset.goal && !detail) detail = openGoalDetail(ctx, Number(button.dataset.goal), { onChanged() { if (alive) void load(); }, onClosed() { detail = null; } });
    }, { signal: events.signal });
    return { refresh() { void load(); }, leave() { detail?.close(false); }, destroy() { alive = false; revision++; detail?.close(false); events.abort(); } };
}
