export function todayBrazil(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const part = name => parts.find(item => item.type === name).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}

export function validMonth(value) {
    return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
        && Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 2100;
}

export function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !validMonth(value.slice(0, 7))) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function shiftMonth(value, delta) {
    const [year, month] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1 + delta, 1, 12));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(value, short = false) {
    const text = new Intl.DateTimeFormat('pt-BR', { month: short ? 'short' : 'long', ...(short ? {} : { year: 'numeric' }), timeZone: 'UTC' })
        .format(new Date(`${value}-01T12:00:00Z`));
    return text[0].toUpperCase() + text.slice(1).replace('.', '');
}

export function dateText(value) {
    if (!validDate(value)) return '';
    return value.split('-').reverse().join('/');
}

export function dayLabel(value) {
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(`${value}T12:00:00Z`));
}
