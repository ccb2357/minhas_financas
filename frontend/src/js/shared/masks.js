import IMask from 'imask';
import { MAX_CENTS } from './money.js';

const invalidMoney = 'Digite apenas os números do valor. Ex.: 6584 para 65,84.';

// A sequência digitada representa centavos, inclusive quando contém a vírgula.
export function normalizeMoneyText(value) {
    const text = value.trim().replace(/^R\$\s*/, '');
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{0,2})?$/.test(text)) return null;
    const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    if (digits.length > 11 || Number(digits) > MAX_CENTS) return null;
    return digits;
}

export function formatMoneyDigits(digits) {
    if (!digits) return '';
    const padded = digits.replace(/^0+(?=\d)/, '').padStart(3, '0');
    const whole = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${whole},${padded.slice(-2)}`;
}

export const maskPresets = {
    moedaBRL() {
        return {
            mask: value => /^[\d.,]*$/.test(value)
                && (value.match(/,/g) || []).length <= 1
                && value.replace(/\D/g, '').replace(/^0+/, '').length <= 11,
        };
    },
};

// Montagem centralizada; as telas somente declaram data-mask="moedaBRL".
export function mountMasks(root) {
    const mounted = new Map();
    for (const input of root.querySelectorAll('[data-mask]')) {
        const preset = maskPresets[input.dataset.mask];
        if (!preset) throw new Error(`Máscara não cadastrada: ${input.dataset.mask}`);
        let error = '';
        let active = true;
        function reject() {
            error = invalidMoney;
            input.dispatchEvent(new CustomEvent('mask:invalid', { bubbles: true, detail: { message: error } }));
        }
        const clearError = () => { error = ''; };
        input.addEventListener('input', clearError, true);
        const instance = IMask(input, preset());
        function format() {
            const value = instance.value;
            const right = value.slice(input.selectionStart ?? value.length).replace(/\D/g, '').length;
            const digits = value.replace(/\D/g, '');
            const formatted = formatMoneyDigits(digits);
            if (value === formatted) return;
            instance.value = formatted;
            // Preserva a posição em relação aos dígitos, inclusive na edição central.
            let cursor = formatted.length;
            for (let remaining = right; cursor > 0 && remaining > 0;) {
                cursor--;
                if (/\d/.test(formatted[cursor])) remaining--;
            }
            if (document.activeElement === input) input.setSelectionRange(cursor, cursor);
        }
        // O IMask processa primeiro; a apresentação monetária é atualizada antes
        // do evento chegar ao validador do formulário.
        input.addEventListener('input', format);
        function paste(event) {
            const text = event.clipboardData?.getData('text');
            if (text !== undefined && normalizeMoneyText(text) === null) {
                event.preventDefault();
                reject();
            }
        }
        input.addEventListener('paste', paste, true);
        format();
        mounted.set(input, {
            getCents() {
                const digits = instance.value.replace(/\D/g, '');
                const cents = Number(digits);
                return !error && digits && Number.isSafeInteger(cents) && cents > 0 && cents <= MAX_CENTS ? cents : null;
            },
            setCents(cents) {
                if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_CENTS) throw new Error('Valor em centavos inválido.');
                clearError(); instance.value = formatMoneyDigits(String(cents));
            },
            destroy() {
                if (!active) return;
                active = false;
                input.removeEventListener('input', clearError, true);
                input.removeEventListener('input', format);
                input.removeEventListener('paste', paste, true);
                instance.destroy();
            },
        });
    }
    return {
        get(input) { return mounted.get(input); },
        destroy() { for (const mask of mounted.values()) mask.destroy(); mounted.clear(); },
    };
}
