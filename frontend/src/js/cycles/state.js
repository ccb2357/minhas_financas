import { escapeHtml as esc } from '../shared/html.js';
const periods = new Map();
export const cycleKey = period => `${period.year}-${String(period.month).padStart(2, '0')}`;
export function clearCycles() { periods.clear(); }
export function knownCycle(key) { return periods.get(key); }
export function cycleDates(period) {
    if (!period?.start_date || !period?.end_date) return 'Carregando período...';
    const date = value => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)).replaceAll(' de ', ' ');
    return `${date(period.start_date)} a ${date(period.end_date)}`;
}
export function rememberCycle(period) {
    if (!period?.start_date || !period?.end_date || !period.year || !period.month || (period.range && period.range !== 'month')) return;
    const key = cycleKey(period); periods.set(key, period);
    if (typeof document === 'undefined') return;
    for (const element of document.querySelectorAll('[data-cycle-dates]')) if (element.dataset.cycleDates === key) element.textContent = cycleDates(period);
}
export function rememberCycleResponse(response) {
    if (!response) return;
    rememberCycle(response.meta?.period);
    rememberCycle(response.data?.period);
    for (const field of ['cycles', 'last_six_months', 'monthly_series', 'comparison_series', 'income_expense_series']) for (const cycle of response.data?.[field] || []) rememberCycle(cycle);
    rememberCycle(response.data?.current); rememberCycle(response.data?.next);
}
export function cycleCaption(key) { return `<small data-cycle-dates="${esc(key)}">${esc(cycleDates(knownCycle(key)))}</small>`; }

// UI preview only. Persisted dates and all financial calculations come from the API.
export function previewCycle(configuration, day, today) {
    if (!Number.isInteger(day) || day < 1 || day > 31) return null;
    const cut = (year, month, target) => {
        const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
        return new Date(Date.UTC(year, month - 1, Math.min(target, last)));
    };
    const iso = value => value.toISOString().slice(0, 10);
    if (configuration.configured) {
        const next = configuration.next;
        const end = cut(next.year, next.month + 1, day); end.setUTCDate(end.getUTCDate() - 1);
        return { start_date: next.start_date, end_date: iso(end) };
    }
    const [year, month] = today.split('-').map(Number);
    let start = cut(year, month, day);
    if (iso(start) > today) start = cut(year, month - 1, day);
    const end = cut(start.getUTCFullYear(), start.getUTCMonth() + 2, day); end.setUTCDate(end.getUTCDate() - 1);
    return { start_date: iso(start), end_date: iso(end) };
}
