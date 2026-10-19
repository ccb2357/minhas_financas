import { monthLabel, shiftMonth, validMonth } from './calendar.js';
import { icon } from './html.js';

export function monthPicker(month) {
    return `<div class="month-picker"><button class="icon-button" type="button" data-month-step="-1" ${month === '1900-01' ? 'disabled' : ''} aria-label="Mês anterior">${icon('chevron_left')}</button><label class="month-picker-label">${icon('calendar')}<span>${monthLabel(month)}</span>${icon('chevron_down')}<input type="month" value="${month}" min="1900-01" max="2100-12" aria-label="Selecionar mês"></label><button class="icon-button" type="button" data-month-step="1" ${month === '2100-12' ? 'disabled' : ''} aria-label="Próximo mês">${icon('chevron_right')}</button></div>`;
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
