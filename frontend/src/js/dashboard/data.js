import { safeColor } from '../categories/catalog.js';

export function dashboardData(data) {
    const totals = data.totals;
    return {
        income: totals.income_cents, expense: totals.expense_cents,
        result: totals.result_cents, incomeCount: totals.income_count, expenseCount: totals.expense_count,
        byCategory: data.by_category.map(item => ({
            key: item.category.id, name: item.category.name,
            color: safeColor(item.category.color), amount: item.amount_cents,
        })),
        history: data.last_six_months.map(item => ({
            month: `${item.year}-${String(item.month).padStart(2, '0')}`,
            income: item.income_cents, expense: item.expense_cents, result: item.result_cents,
        })),
    };
}

// Sem base positiva, a variação percentual seria indefinida ou enganosa.
export function resultChange(current, previous) {
    return previous > 0 ? Math.round((current - previous) / previous * 100) : null;
}

export function incomeUsage(income, expense) {
    const percent = income > 0 ? expense / income * 100 : expense > 0 ? null : 0;
    return {
        percent,
        progress: percent === null ? 100 : Math.max(0, Math.min(100, percent)),
        tone: percent === null || percent > 85 ? 'red' : percent > 60 ? 'orange' : 'green',
    };
}
