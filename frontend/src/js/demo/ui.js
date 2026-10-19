import { categories, money, dateLabel, monthLabel, shiftMonth, validMonth } from './data.js';

import { escapeHtml, icon } from '../shared/html.js';
export { escapeHtml, icon } from '../shared/html.js';
export const badge = (category, extra = '') => `<span class="category-badge ${extra}" style="--category-color:${category.color}">${icon(category.icon)}</span>`;

export function header(title, { demo = true } = {}) {
    return `<header class="finance-header"><a href="/mais/" class="link icon-button" aria-label="Abrir configurações">${icon('gear_alt')}</a><h1 tabindex="-1">${escapeHtml(title)}</h1><button class="icon-button" data-action="demo-info" type="button" aria-label="Sobre os dados de demonstração">${icon('info_circle')}</button></header>${demo ? '<p class="demo-caption">Dados de demonstração</p>' : ''}`;
}
export function monthPicker(month) {
    return `<div class="month-picker"><button class="icon-button" type="button" data-month-step="-1" aria-label="Mês anterior">${icon('chevron_left')}</button><label class="month-picker-label">${icon('calendar')}<span>${monthLabel(month)}</span>${icon('chevron_down')}<input type="month" value="${month}" min="1900-01" max="2100-12" aria-label="Selecionar mês"></label><button class="icon-button" type="button" data-month-step="1" aria-label="Próximo mês">${icon('chevron_right')}</button></div>`;
}
export function wireMonthPicker(root, getMonth, onChange) {
    function click(event) {
        const button = event.target.closest('[data-month-step]');
        if (!button) return;
        const value = shiftMonth(getMonth(), Number(button.dataset.monthStep));
        if (validMonth(value)) onChange(value);
    }
    function change(event) {
        if (event.target.matches('input[type="month"]') && validMonth(event.target.value)) onChange(event.target.value);
    }
    root.addEventListener('click', click);
    root.addEventListener('change', change);
    return () => { root.removeEventListener('click', click); root.removeEventListener('change', change); };
}
export function transactionRows(rows) {
    if (!rows.length) return '<div class="finance-empty"><span>Sem lançamentos neste período</span><p>Selecione um mês entre maio e outubro de 2026 para explorar a demonstração.</p></div>';
    return `<ul class="transaction-list">${rows.map(item => {
        const category = categories[item.category];
        return `<li><button class="transaction-row" type="button" data-transaction="${escapeHtml(item.id)}">${badge(category)}<span class="transaction-copy"><strong>${escapeHtml(item.description)}</strong><span>${category.name} <span aria-hidden="true">·</span> ${dateLabel(item.date)}</span></span><span class="transaction-value ${item.type}">${item.type === 'income' ? '+' : '−'} ${money(item.amount)}</span>${icon('chevron_right')}</button></li>`;
    }).join('')}</ul>`;
}

export function openDetails(app, transaction) {
    const category = categories[transaction.category];
    const popup = app.popup.create({
        content: `<div class="popup finance-popup"><div class="popup-content"><header><h2>Detalhes do lançamento</h2><button type="button" class="icon-button popup-close" aria-label="Fechar">${icon('xmark')}</button></header><p class="preview-label">Demonstração</p>${badge(category)}<h3>${escapeHtml(transaction.description)}</h3><p class="detail-amount ${transaction.type}">${transaction.type === 'income' ? '+' : '−'} ${money(transaction.amount)}</p><dl><div><dt>Categoria</dt><dd>${category.name}</dd></div><div><dt>Data</dt><dd>${dateLabel(transaction.date)}</dd></div><div><dt>Tipo</dt><dd>${transaction.type === 'income' ? 'Entrada' : 'Saída'}</dd></div></dl><p class="preview-note">Lançamento fictício para apresentação do aplicativo.</p><button type="button" class="mf-button mf-button-primary popup-close">Fechar</button></div></div>`,
        on: { closed(instance) { const element = instance.el; instance.destroy(); element.remove(); } },
    });
    popup.open();
}

export function openTransactionPreview(app) {
    const popup = app.popup.create({
        content: `<div class="popup finance-popup"><div class="popup-content"><header><h2>Novo lançamento</h2><button type="button" class="icon-button popup-close" aria-label="Fechar">${icon('xmark')}</button></header><p class="preview-label">Prévia visual</p><p class="preview-note">Esta prévia não salva dados.</p><div class="preview-type"><span>${icon('arrow_up')} Entrada</span><span>${icon('arrow_down')} Saída</span></div><div class="preview-value"><span>Valor</span><strong>R$ 0,00</strong></div><div class="preview-fields"><label>Descrição<input type="text" placeholder="Ex.: Salário, supermercado, aluguel..." readonly></label><label>Categoria<input type="text" value="Selecione uma categoria" readonly></label><label>Data<input type="text" value="Selecione uma data" readonly></label><label>Observação <span>(opcional)</span><textarea placeholder="Adicione uma observação..." readonly></textarea></label></div><button type="button" class="mf-button mf-button-primary popup-close">Fechar prévia</button></div></div>`,
        on: { closed(instance) { const element = instance.el; instance.destroy(); element.remove(); } },
    });
    popup.open();
}
