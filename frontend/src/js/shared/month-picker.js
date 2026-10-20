import { openDateSheet } from './date-picker.js';
import { monthLabel, shiftMonth, validMonth } from './calendar.js';
import { icon } from './html.js';

export function monthPicker(month) {
    return `<div class="month-picker"><button class="icon-button" type="button" data-month-step="-1" ${month === '1900-01' ? 'disabled' : ''} aria-label="Mês anterior">${icon('chevron_left')}</button><button type="button" class="month-picker-label" data-month-open aria-haspopup="dialog" aria-label="Selecionar mês">${icon('calendar')}<span>${monthLabel(month)}</span>${icon('chevron_down')}</button><input class="mf-month-backing" tabindex="-1" type="month" value="${month}" min="1900-01" max="2100-12" aria-label="Selecionar mês"><button class="icon-button" type="button" data-month-step="1" ${month === '2100-12' ? 'disabled' : ''} aria-label="Próximo mês">${icon('chevron_right')}</button></div>`;
}
export function wireMonthPicker(root, getMonth, onChange, app) {
    let sheet;
    function click(event) {
        if (event.target.closest('[data-month-open]')) {
            if (!sheet) sheet = openDateSheet(app, { value: getMonth(), monthOnly: true, title: 'Selecionar período', onChange, onClosed() { sheet = null; root.querySelector('[data-month-open]')?.focus({ preventScroll: true }); } });
            return;
        }
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
    return () => { sheet?.destroy(); root.removeEventListener('click', click); root.removeEventListener('change', change); };
}
