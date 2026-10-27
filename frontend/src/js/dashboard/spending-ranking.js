import { escapeHtml as esc, icon } from '../shared/html.js';
import { formatMoney as money } from '../shared/money.js';
import { safeColor, safeIcon } from '../categories/catalog.js';

export function spendingRanking(categories, total, { limit = 4 } = {}) {
    const sorted = categories.filter(item => item.amount_cents > 0)
        .slice().sort((a, b) => b.amount_cents - a.amount_cents || a.category.id - b.category.id);
    return {
        total,
        leading: limit === null ? sorted : sorted.slice(0, limit),
        remaining: limit === null ? 0 : sorted.slice(limit).reduce((sum, item) => sum + item.amount_cents, 0),
    };
}

function rankingRow(name, amount, total, color, glyph, remaining = false) {
    const percentage = total > 0 ? amount / total * 100 : 0;
    const share = percentage > 0 && percentage < 1 ? '<1%' : `${Math.round(percentage)}%`;
    const width = Math.min(100, Math.max(0, percentage));
    return `<li class="spending-rank-row${remaining ? ' spending-rank-other' : ''}" style="--rank-color:${color}"><span class="spending-rank-icon" aria-hidden="true">${icon(glyph)}</span><div class="spending-rank-copy"><div class="spending-rank-heading"><span>${esc(name)}</span><strong>${money(amount)}</strong></div><div class="spending-rank-share"><span class="spending-rank-track" aria-hidden="true"><span style="width:${width}%"></span></span><span class="spending-rank-percent">${esc(share)}</span></div></div></li>`;
}

export function renderSpendingRanking(categories, total, options = {}) {
    const ranking = spendingRanking(categories, total, options);
    const rows = ranking.leading.map(item => rankingRow(item.category.name, item.amount_cents, total,
        safeColor(item.category.color), safeIcon(item.category.icon)));
    if (ranking.remaining > 0) rows.push(rankingRow('Demais categorias', ranking.remaining, total, '#94A3B8', 'ellipsis', true));
    return `${options.showTotal === false ? '' : `<div class="spending-rank-total"><span>Total de gastos no período</span><strong>${money(total)}</strong></div>`}${rows.length ? `<ul class="spending-rank-list">${rows.join('')}</ul>` : `<p class="spending-rank-empty">${esc(options.emptyMessage || 'Nenhuma despesa neste mês.')}</p>`}`;
}
