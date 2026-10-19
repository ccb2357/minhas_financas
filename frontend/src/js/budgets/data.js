import { formatMoney } from '../shared/money.js';

export const progressPercent = value => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
export const percentLabel = value => Number.isFinite(value) ? `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)}%` : '—';
export const budgetTone = status => ['near_limit', 'at_limit', 'over_limit'].includes(status) ? status : 'within_limit';
export function remainingLabel(cents) {
    if (cents < 0) return `${formatMoney(-cents)} acima do limite`;
    if (cents === 0) return 'Limite atingido';
    return `${formatMoney(cents)} disponíveis`;
}


// Resumo visual do anel; o percentual completo permanece no cartão e na acessibilidade.
export function shortPercentLabel(value) {
    const full = percentLabel(value);
    return full.length <= 8 || !Number.isFinite(value) ? full : `${new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}%`;
}
