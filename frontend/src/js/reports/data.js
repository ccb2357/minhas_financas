import { safeColor } from '../categories/catalog.js';
import { monthLabel, shiftMonth } from '../shared/calendar.js';

export const REPORT_RANGES = [['month', 'Mês'], ['three_months', '3 meses'], ['year', 'Ano']];
export const validRange = value => REPORT_RANGES.some(([range]) => range === value);

export function reportData(data) {
    return {
        income: data.totals.income_cents, expense: data.totals.expense_cents,
        incomeCount: data.totals.income_count, expenseCount: data.totals.expense_count,
        byCategory: data.by_category.map(item => ({
            key: item.category.id, name: item.category.name, color: safeColor(item.category.color), amount: item.amount_cents,
        })),
        // A API distingue a comparação visual dos totais do período escolhido.
        history: data.comparison_series.map(item => ({
            month: `${item.year}-${String(item.month).padStart(2, '0')}`,
            income: item.income_cents, expense: item.expense_cents, result: item.result_cents,
        })),
    };
}

export function periodLabel(month, range) {
    if (range === 'three_months') return `${monthLabel(shiftMonth(month, -2))} a ${monthLabel(month)}`;
    if (range === 'year' && !month.endsWith('-01')) return `Janeiro até ${monthLabel(month)}`;
    return monthLabel(month);
}

export function comparisonLabel(period) {
    const start = period.start_date.slice(0, 7), end = period.end_date.slice(0, 7);
    return start === end ? monthLabel(end) : `${monthLabel(start)} a ${monthLabel(end)}`;
}
