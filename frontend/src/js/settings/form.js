import { createValidation, validationRules as rules } from '../validation.js';
import { escapeHtml as esc, icon } from '../shared/html.js';
import { emailChanged, profilePayload, validPasswordLength, validPasswordBytes } from './data.js';
import { updateProfile, updatePassword, settingsError } from './api.js';

let sequence = 0;
export function openSettingsForm(ctx, { mode = 'profile', onSaved, onPasswordChanged, onClosed } = {}) {
    const passwordMode = mode === 'password', prefix = `settings-form-${++sequence}`;
    const original = { ...ctx.state.user }, previousFocus = document.activeElement;
    const events = new AbortController();
    let alive = true, busy = false, confirming = false, closing = false, validation, confirmation, afterClose;
    const field = (name, label, { type = 'text', value = '', autocomplete = '', maxLength = '' } = {}) => `<div class="settings-field" data-field><label for="${prefix}-${name}">${label}</label><div class="settings-input-wrap"><input id="${prefix}-${name}" name="${name}" type="${type}" value="${esc(value)}" autocomplete="${autocomplete}" ${maxLength ? `maxlength="${maxLength}"` : ''} ${type === 'password' ? '' : 'autocapitalize="none"'}>${type === 'password' ? `<button type="button" data-settings-toggle="${name}" aria-label="Mostrar ${label.toLowerCase()}" aria-controls="${prefix}-${name}" aria-pressed="false">${icon('eye')}</button>` : ''}</div><div class="settings-error-slot"><div class="field-error" id="${prefix}-${name}-error" hidden></div></div></div>`;
    const popup = ctx.app.popup.create({
        closeByBackdropClick: false, closeOnEscape: false, swipeToClose: false,
        content: `<div class="popup settings-popup" role="dialog" aria-modal="true" aria-labelledby="${prefix}-title"><div class="settings-popup-scroll"><div class="settings-form-container"><header><h2 id="${prefix}-title" tabindex="-1">${passwordMode ? 'Alterar senha' : 'Editar perfil'}</h2><button class="icon-button" type="button" data-settings-close aria-label="Fechar formulário">${icon('xmark')}</button></header><p class="settings-form-intro">${passwordMode ? 'Escolha uma senha com pelo menos 12 caracteres. Após salvar, entre novamente com a nova senha.' : 'Mantenha seu nome e e-mail atualizados.'}</p><form id="${prefix}" novalidate><fieldset>${passwordMode ? field('current_password', 'Senha atual', { type: 'password', autocomplete: 'current-password' }) + field('password', 'Nova senha', { type: 'password', autocomplete: 'new-password' }) + field('password_confirmation', 'Confirmar nova senha', { type: 'password', autocomplete: 'new-password' }) : field('name', 'Nome', { value: original.name, autocomplete: 'name', maxLength: 255 }) + field('email', 'E-mail', { type: 'email', value: original.email, autocomplete: 'email', maxLength: 255 }) + `<div data-settings-email-password hidden>${field('current_password', 'Senha atual', { type: 'password', autocomplete: 'current-password' })}<p class="settings-field-note">Para sua segurança, confirme a senha atual ao alterar o e-mail.</p></div>`}</fieldset><p class="auth-error settings-form-error" role="alert" tabindex="-1" hidden></p><button type="submit" class="mf-button mf-button-primary" data-settings-save>${passwordMode ? 'Salvar nova senha' : 'Salvar perfil'}</button><button type="button" class="settings-cancel" data-settings-close>Cancelar</button></form></div></div></div>`,
        on: {
            opened() { popup.el.querySelector('h2').focus(); },
            closed(instance) {
                if (!alive) return;
                alive = false; events.abort(); confirmation?.close?.(false); validation?.destroy();
                // Limpa também os campos revelados antes de remover o modal.
                for (const input of instance.el.querySelectorAll('input')) input.value = '';
                const element = instance.el; instance.destroy(); element.remove(); onClosed?.();
                if (previousFocus?.isConnected) previousFocus.focus();
                afterClose?.();
            },
        },
    });
    const form = popup.el.querySelector('form'), fields = form.elements;
    const errorBox = form.querySelector('.settings-form-error'), save = form.querySelector('[data-settings-save]');
    const values = () => [...form.querySelectorAll('input')].map(input => input.value);
    const initial = JSON.stringify(values());
    const dirty = () => JSON.stringify(values()) !== initial;
    function setBusy(value) {
        busy = value; form.setAttribute('aria-busy', String(value)); form.querySelector('fieldset').disabled = value;
        for (const button of popup.el.querySelectorAll('button')) button.disabled = value;
        save.textContent = value ? 'Salvando...' : passwordMode ? 'Salvar nova senha' : 'Salvar perfil';
    }
    function finishClose(done = () => {}) {
        if (!alive || closing) return;
        closing = true;
        afterClose = done;
        popup.close(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
    function confirmLeave(done, cancel = () => {}) {
        if (!alive) { done(); return; }
        if (busy || confirming || closing) { cancel(); return; }
        if (!dirty()) { finishClose(done); return; }
        confirming = true;
        confirmation = ctx.app.dialog.create({ title: 'Descartar alterações?', text: 'As alterações ainda não foram salvas.', buttons: [
            { text: 'Continuar editando', onClick() { confirming = false; cancel(); } },
            { text: 'Descartar', bold: true, onClick() { confirming = false; finishClose(done); } },
        ] }).open();
    }
    async function submit() {
        if (!alive || busy || confirming || closing) return;
        const payload = passwordMode ? { current_password: fields.current_password.value, password: fields.password.value, password_confirmation: fields.password_confirmation.value }
            : profilePayload(fields.name.value, fields.email.value, fields.current_password.value, original.email);
        setBusy(true); errorBox.hidden = true;
        try {
            const user = await (passwordMode ? updatePassword(payload) : updateProfile(payload));
            if (!alive) return;
            finishClose(() => passwordMode ? onPasswordChanged?.(original.email) : onSaved?.(user));
        } catch (error) {
            if (!alive) return;
            if (error.status === 401) { ctx.expireSession(); return; }
            if (error.errors?.current_password && !passwordMode) form.querySelector('[data-settings-email-password]').hidden = false;
            validation.showServerErrors(error.errors); errorBox.textContent = settingsError(error); errorBox.hidden = false; errorBox.focus();
        } finally {
            for (const key of ['current_password', 'password', 'password_confirmation']) if (key in payload) payload[key] = '';
            if (alive) setBusy(false);
        }
    }
    const config = (name, ruleList) => ({ selector: `#${prefix}-${name}`, errorsContainer: `#${prefix}-${name}-error`, rules: ruleList });
    const schema = passwordMode ? {
        current_password: config('current_password', [rules.required('Informe sua senha atual.')]),
        password: config('password', [rules.required('Informe a nova senha.'),
            { validator: validPasswordLength, errorMessage: 'A nova senha deve ter pelo menos 12 caracteres.' },
            { validator: validPasswordBytes, errorMessage: 'Use até 72 bytes, sem caracteres nulos. Acentos e emojis ocupam mais espaço.' },
            { validator: value => value !== fields.current_password.value, errorMessage: 'A nova senha deve ser diferente da senha atual.' },
        ]),
        password_confirmation: config('password_confirmation', [rules.required('Confirme a nova senha.'),
            { validator: value => value === fields.password.value, errorMessage: 'A confirmação não corresponde à nova senha.' },
        ]),
    } : {
        name: config('name', [rules.required('Informe seu nome.'), rules.maxLength(255)]),
        email: config('email', [rules.required('Informe seu e-mail.'), rules.email(), rules.maxLength(255)]),
        current_password: config('current_password', [{ validator: value => !emailChanged(fields.email.value, original.email) || Boolean(value), errorMessage: 'Informe sua senha atual para alterar o e-mail.' }]),
    };
    validation = createValidation(form, schema, {
        onValid: submit, isBusy: () => busy || confirming || closing,
        onInput(event) {
            errorBox.hidden = true;
            if (!passwordMode && event.target === fields.email) {
                const changed = emailChanged(fields.email.value, original.email);
                form.querySelector('[data-settings-email-password]').hidden = !changed;
                if (!changed) { fields.current_password.value = ''; validation.reset(); }
            }
        },
    });
    popup.el.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button || busy || confirming || closing) return;
        if (button.hasAttribute('data-settings-close')) confirmLeave(() => {});
        if (button.dataset.settingsToggle) {
            const input = fields[button.dataset.settingsToggle], show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            button.setAttribute('aria-pressed', String(show));
            button.setAttribute('aria-label', `${show ? 'Ocultar' : 'Mostrar'} ${form.querySelector(`label[for="${input.id}"]`).textContent.toLowerCase()}`);
            button.innerHTML = icon(show ? 'eye_slash' : 'eye');
        }
    }, { signal: events.signal });
    window.addEventListener('beforeunload', event => { if (dirty() || busy) { event.preventDefault(); event.returnValue = ''; } }, { signal: events.signal });
    popup.el.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); confirmLeave(() => {}); }
        if (event.key !== 'Tab') return;
        const controls = [...popup.el.querySelectorAll('button:not(:disabled), input:not(:disabled)')].filter(item => item.offsetParent !== null);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) { event.preventDefault(); first?.focus(); }
    }, { signal: events.signal });
    popup.open();
    return { close(force = false) { if (force) { afterClose = undefined; popup.close(false); } else confirmLeave(() => {}); }, beforeLeave: confirmLeave };
}
