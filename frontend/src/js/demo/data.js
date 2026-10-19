// Dados locais de demonstração. Nenhuma operação deste módulo grava na API.
export const INITIAL_MONTH = '2026-10';
export const categories = {
    housing: { name: 'Moradia', color: '#ff6654', icon: 'house_fill' },
    food: { name: 'Alimentação', color: '#3492ff', icon: 'cart_fill' },
    transport: { name: 'Transporte', color: '#ffbf17', icon: 'car_fill' },
    leisure: { name: 'Lazer', color: '#8055ff', icon: 'gamecontroller_fill' },
    health: { name: 'Saúde', color: '#16c464', icon: 'heart_fill' },
    other: { name: 'Outros', color: '#9ca7bc', icon: 'square_grid_2x2_fill' },
    salary: { name: 'Salário', color: '#0bad53', icon: 'money_dollar_circle_fill' },
    freelance: { name: 'Freelance', color: '#00a980', icon: 'briefcase_fill' },
    refund: { name: 'Reembolso', color: '#3693e5', icon: 'arrow_uturn_left' },
};

const base = [
    ['market', 25, 'Supermercado Extra', 'food', 'expense', 23490],
    ['rent', 20, 'Aluguel', 'housing', 'expense', 120000],
    ['salary', 5, 'Salário', 'salary', 'income', 500000],
    ['restaurant', 3, 'Restaurante', 'food', 'expense', 8990],
    ['freelance', 2, 'Projeto freelance', 'freelance', 'income', 30000],
    ['refund', 2, 'Reembolso', 'refund', 'income', 10000],
    ['power', 2, 'Energia elétrica', 'housing', 'expense', 12990],
    ['fuel', 2, 'Combustível', 'transport', 'expense', 18000],
    ['ride', 2, 'Transporte por aplicativo', 'transport', 'expense', 6400],
    ['pharmacy', 2, 'Farmácia', 'health', 'expense', 8500],
    ['appointment', 2, 'Consulta médica', 'health', 'expense', 11200],
    ['cinema', 1, 'Cinema', 'leisure', 'expense', 7900],
    ['streaming', 1, 'Streaming', 'leisure', 'expense', 3990],
    ['internet', 1, 'Internet', 'housing', 'expense', 11990],
    ['supplies', 1, 'Compras diversas', 'other', 'expense', 12550],
];
const targets = {
    '2026-05': [430000, 240000], '2026-06': [450000, 210000],
    '2026-07': [460000, 250000], '2026-08': [520000, 240000],
    '2026-09': [500000, 250000], '2026-10': [540000, 246000],
};

export function validMonth(value) {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 2100;
}
export function shiftMonth(value, offset) {
    const [year, month] = value.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1, 12);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
export function monthLabel(value, short = false) {
    const [year, month] = value.split('-').map(Number);
    const text = new Intl.DateTimeFormat('pt-BR', { month: short ? 'short' : 'long', ...(short ? {} : { year: 'numeric' }) }).format(new Date(year, month - 1, 1, 12));
    return text[0].toUpperCase() + text.slice(1).replace('.', '');
}
export function dateLabel(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day, 12));
}
export const money = cents => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export const compactMoney = cents => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(cents / 100);

export function transactions(month) {
    if (!targets[month]) return [];
    const [incomeTarget, expenseTarget] = targets[month];
    const rows = base.map(([id, day, description, category, type, amount]) => ({
        id: `${month}-${id}`, date: `${month}-${String(day).padStart(2, '0')}`,
        description, category, type, amount,
    }));
    for (const [type, target, original] of [['income', incomeTarget, 540000], ['expense', expenseTarget, 246000]]) {
        const items = rows.filter(item => item.type === type);
        for (const item of items) item.amount = Math.floor(item.amount * target / original);
        items[items.length - 1].amount += target - items.reduce((total, item) => total + item.amount, 0);
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export function summarize(month) {
    const rows = transactions(month);
    const incomeRows = rows.filter(item => item.type === 'income');
    const expenseRows = rows.filter(item => item.type === 'expense');
    const income = incomeRows.reduce((sum, item) => sum + item.amount, 0);
    const expense = expenseRows.reduce((sum, item) => sum + item.amount, 0);
    const byCategory = Object.entries(categories).map(([key, category]) => ({
        key, ...category,
        amount: expenseRows.filter(item => item.category === key).reduce((sum, item) => sum + item.amount, 0),
    })).filter(item => item.amount > 0).sort((a, b) => b.amount - a.amount);
    return { month, rows, income, expense, result: income - expense, incomeCount: incomeRows.length, expenseCount: expenseRows.length, byCategory };
}

export function series(month, count = 6) {
    return Array.from({ length: count }, (_, index) => summarize(shiftMonth(month, index - count + 1)));
}
