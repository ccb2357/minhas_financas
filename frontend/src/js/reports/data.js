import { cycleDates } from '../cycles/state.js';
import { safeColor } from '../categories/catalog.js';
import { monthLabel, shiftMonth } from '../shared/calendar.js';

export const REPORT_RANGES = [['month', 'Ciclo'], ['three_months', '3 ciclos'], ['year', 'Ano de ciclos']];
export const validRange = value => REPORT_RANGES.some(([range]) => range === value);

export function reportData(data) {
    return {
        income: data.totals.income_cents, expense: data.totals.expense_cents,
        incomeCount: data.totals.income_count, expenseCount: data.totals.expense_count,
        byCategory: data.by_category.map(item => ({
            key: item.category.id, name: item.category.name, color: safeColor(item.category.color), amount: item.amount_cents,
        })),
        expenseHistory: (data.income_expense_series ?? data.monthly_series ?? data.comparison_series).map(item => ({
            month: `${item.year}-${String(item.month).padStart(2, '0')}`,
            income: item.income_cents, expense: item.expense_cents, result: item.result_cents,
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

export function comparisonLabel(period) { return cycleDates(period); }


// Os centavos e as variações vêm da API; aqui formatamos sua apresentação.
export function changePresentation(change, type) {
    const percent = change?.percent;
    const valid = Number.isFinite(percent);
    const difference = change?.difference_cents;
    const tone = !Number.isSafeInteger(difference) || difference === 0 ? 'neutral'
        : (type === 'expense' ? difference < 0 : difference > 0) ? 'favorable' : 'unfavorable';
    return {
        label: valid ? `${percent > 0 ? '+' : percent < 0 ? '−' : ''}${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Math.abs(percent))}%` : 'Sem base para %',
        difference: Number.isSafeInteger(difference) ? difference : null,
        tone,
    };
}

export function expenseFrequencyLabel(count, total) {
    const amount = `${count} ${count === 1 ? 'lançamento de saída' : 'lançamentos de saída'}`;
    if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(total) || total <= 0) return 'Sem despesas no período';
    const percent = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(count / total * 100);
    return `${amount} (${percent}% das saídas)`;
}
