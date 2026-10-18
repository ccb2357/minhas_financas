import JustValidate from 'just-validate';

// Mensagens padrão compartilhadas. Cada formulário pode fornecer outra mensagem.
export const validationRules = {
    required: (message = 'Preencha este campo.') => ({ rule: 'required', errorMessage: message }),
    email: (message = 'Confira o e-mail. Exemplo: voce@dominio.com') => ({ rule: 'email', errorMessage: message }),
    maxLength: (value, message = `Use no máximo ${value} caracteres.`) => ({ rule: 'maxLength', value, errorMessage: message }),
};

// JustValidate permite HTML nas mensagens. Este projeto apresenta apenas texto,
// inclusive quando uma mensagem vem da API.
function escapeMessage(message) {
    return String(message).replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
}

/**
 * schema: { nomeNoLaravel: { selector, errorsContainer, rules } }
 * A biblioteca executa as regras; este adaptador padroniza apresentação e API.
 */
export function createValidation(formSelector, schema, {
    onValid,
    onInput = () => {},
    isBusy = () => false,
} = {}) {
    const form = typeof formSelector === 'string' ? document.querySelector(formSelector) : formSelector;
    if (!form) throw new Error('Formulário de validação não encontrado.');

    const entries = Object.entries(schema).map(([name, config]) => {
        const input = form.querySelector(config.selector);
        const feedback = form.querySelector(config.errorsContainer);
        if (!input || !feedback) throw new Error(`Configuração de validação incompleta: ${name}.`);
        input.setAttribute('aria-describedby', [...new Set([
            ...(input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean),
            feedback.id,
        ].filter(Boolean))].join(' '));
        return { name, config, input, feedback };
    });

    const validator = new JustValidate(form, {
        errorFieldCssClass: 'mf-input-invalid',
        successFieldCssClass: 'mf-input-valid',
        errorLabelCssClass: 'mf-validation-message',
        errorFieldStyle: {},
        successFieldStyle: {},
        errorLabelStyle: {},
        focusInvalidField: true,
        validateBeforeSubmitting: true,
        lockForm: false,
        submitFormAutomatically: false,
    });

    for (const { config } of entries) {
        validator.addField(config.selector, config.rules.map(rule => ({
            ...rule,
            ...(rule.errorMessage ? { errorMessage: escapeMessage(rule.errorMessage) } : {}),
        })), { errorsContainer: config.errorsContainer });
    }

    function syncPresentation() {
        for (const { input, feedback } of entries) {
            const invalid = input.classList.contains('mf-input-invalid');
            const valid = input.classList.contains('mf-input-valid');
            const field = input.closest('.auth-field, [data-field]');
            field?.classList.toggle('is-invalid', invalid);
            field?.classList.toggle('is-valid', valid && !invalid);
            if (invalid) input.setAttribute('aria-invalid', 'true');
            else input.removeAttribute('aria-invalid');
            feedback.hidden = !invalid;
            field?.querySelector('.field-validation-icon use')?.setAttribute('href', invalid ? '#icon-alert' : '#icon-check');
        }
    }

    let frame;
    function schedulePresentation() {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(syncPresentation);
    }

    function handleBlur(event) {
        if (isBusy()) return;
        const entry = entries.find(item => item.input === event.target);
        if (entry) void validator.revalidateField(entry.config.selector).then(syncPresentation);
    }

    function guardSubmit(event) {
        if (isBusy()) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }

    validator.onValidate(schedulePresentation);
    validator.onSuccess(() => {
        syncPresentation();
        if (!isBusy()) void onValid?.();
    });
    validator.onFail(syncPresentation);
    form.addEventListener('focusout', handleBlur);
    form.addEventListener('input', onInput);
    form.addEventListener('submit', guardSubmit, true);

    return {
        showServerErrors(errors = {}) {
            const mapped = {};
            for (const { name, config } of entries) {
                const messages = errors[name];
                if (Array.isArray(messages) && messages.length) {
                    mapped[config.selector] = escapeMessage(messages.join(' '));
                }
            }
            if (!Object.keys(mapped).length) return false;
            validator.showErrors(mapped);
            syncPresentation();
            return true;
        },
        reset() {
            validator.refresh();
            syncPresentation();
        },
        clearSuccess(name) {
            entries.find(entry => entry.name === name)?.input.classList.remove('mf-input-valid');
            syncPresentation();
        },
        destroy() {
            cancelAnimationFrame(frame);
            form.removeEventListener('focusout', handleBlur);
            form.removeEventListener('input', onInput);
            form.removeEventListener('submit', guardSubmit, true);
            validator.destroy();
            syncPresentation();
        },
    };
}
