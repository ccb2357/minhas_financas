export const MAX_CENTS = 99_999_999_999;

// Entrada em reais; conversão por partes inteiras, sem parseFloat ou arredondamento.
export function parseBRL(value) {
    if (typeof value !== 'string') return null;
    const text = value.trim().replace(/^R\$\s*/, '');
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text)) return null;
    const [whole, decimal = ''] = text.split(',');
    const digits = whole.replaceAll('.', '').replace(/^0+(?=\d)/, '');
    if (digits.length > 9) return null;
    const cents = Number(digits) * 100 + Number(decimal.padEnd(2, '0'));
    return Number.isSafeInteger(cents) && cents > 0 && cents <= MAX_CENTS ? cents : null;
}

export function amountText(cents) {
    if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_CENTS) return '';
    const whole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.floor(cents / 100));
    return `${whole},${String(cents % 100).padStart(2, '0')}`;
}

export const moneyText = cents => `R$\u00a0${amountText(cents)}`;
