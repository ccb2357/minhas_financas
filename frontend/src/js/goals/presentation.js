import { escapeHtml as esc, icon } from '../shared/html.js';
import { formatMoney as money } from '../shared/money.js';
import { dateText, todayBrazil } from '../shared/calendar.js';
import { safeIcon } from '../categories/catalog.js';

export function goalProgress(goal) {
    const saved = Number.isSafeInteger(goal.saved_cents) && goal.saved_cents >= 0 ? goal.saved_cents : 0;
    const target = Number.isSafeInteger(goal.target_cents) && goal.target_cents > 0 ? goal.target_cents : 1;
    return { saved, target, remaining: Math.max(0, target - saved), percent: Math.min(100, Math.round(saved / target * 1000) / 10) };
}
export function progressBar(goal) {
    const p = goalProgress(goal);
    return `<div class="goal-progress-row"><span class="goal-progress" role="progressbar" aria-label="Progresso do objetivo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.percent}" aria-valuetext="${esc(money(p.saved))} de ${esc(money(p.target))}"><span style="width:${p.percent}%"></span></span><strong>${new Intl.NumberFormat('pt-BR').format(p.percent)}%</strong></div>`;
}
export function goalCard(goal) {
    const p = goalProgress(goal);
    return `<button type="button" class="finance-card goal-card" data-goal="${goal.id}"><span class="goal-card-heading"><span class="goal-icon">${icon(safeIcon(goal.icon))}</span><strong>${esc(goal.name)}</strong>${icon('chevron_right')}</span><span class="goal-card-value"><strong>${money(p.saved)}</strong><span>de ${money(p.target)}</span></span>${progressBar(goal)}<span class="goal-remaining">${p.remaining ? `Faltam ${money(p.remaining)}` : goal.status === 'archived' && goal.completed_at ? 'Objetivo concluído' : 'Meta atingida!'}${goal.status === 'archived' && !goal.completed_at ? ' · Arquivado' : ''}</span>${goal.deadline ? `<span class="goal-deadline">${icon('calendar')} ${goal.deadline < todayBrazil() && p.remaining ? 'Prazo encerrado em' : 'Até'} ${dateText(goal.deadline)}</span>` : ''}</button>`;
}
