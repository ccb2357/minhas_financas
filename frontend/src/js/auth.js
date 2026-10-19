import { apiRequest, prepareCsrf } from './api.js';
import { createValidation, validationRules } from './validation.js';

export function mountAuth({ onAuthenticated, onSignedOut } = {}) {
    const form = document.querySelector('#login-form');
    const fields = document.querySelector('#login-fields');
    const email = document.querySelector('#login-email');
    const password = document.querySelector('#login-password');
    const remember = document.querySelector('#login-remember');
    const errorMessage = document.querySelector('#auth-error');
    const loginPanel = document.querySelector('#login-panel');
    const loading = document.querySelector('#auth-loading');
    const toggle = document.querySelector('#password-toggle');
    const passwordIcon = document.querySelector('#password-icon');
    let submitting = false;
    let signingOut = false;

    const validation = createValidation(form, {
        email: {
            selector: '#login-email',
            errorsContainer: '#email-error',
            rules: [
                validationRules.required('Informe seu e-mail para entrar.'),
                validationRules.email(),
                validationRules.maxLength(254),
            ],
        },
        password: {
            selector: '#login-password',
            errorsContainer: '#password-error',
            rules: [validationRules.required('Informe sua senha.')],
        },
    }, {
        onValid: submitLogin,
        onInput: clearGeneralError,
        isBusy: () => submitting,
    });

    function clearGeneralError() {
        errorMessage.hidden = true;
        errorMessage.textContent = '';
    }

    function messageFor(error) {
        if (error.status === 429) return 'Muitas tentativas. Aguarde um minuto antes de tentar novamente.';
        if (error.status === 419) return 'Sua sessão de segurança expirou. Tente entrar novamente.';
        if (error.status === 422) return 'Confira os campos indicados para continuar.';
        if (error.status >= 500) return 'Não foi possível concluir agora. Tente novamente em instantes.';
        return 'Não foi possível conectar. Confira sua conexão e tente novamente.';
    }

    function showLoginError(error) {
        const invalidCredentials = error.status === 422
            && (error.errors?.email || []).includes('E-mail ou senha inválidos.');
        if (invalidCredentials) {
            validation.reset();
            errorMessage.textContent = 'Não conseguimos entrar. Confira seu e-mail e sua senha.';
            errorMessage.hidden = false;
            return;
        }
        if (error.status === 422 && validation.showServerErrors(error.errors)) return;
        errorMessage.textContent = messageFor(error);
        errorMessage.hidden = false;
    }

    function resetPassword() {
        password.value = '';
        password.type = 'password';
        validation.clearSuccess('password');
        toggle.setAttribute('aria-pressed', 'false');
        toggle.setAttribute('aria-label', 'Mostrar senha');
        passwordIcon.setAttribute('href', '#icon-eye-off');
    }

    function showLogin() {
        loading.hidden = true;
        loginPanel.hidden = false;
        document.title = 'Entrar · Minhas Finanças';
        onSignedOut?.();
    }

    function showSession(user) {
        loading.hidden = true;
        loginPanel.hidden = true;
        onAuthenticated?.(user);
    }

    function setBusy(busy) {
        submitting = busy;
        fields.disabled = busy;
        form.setAttribute('aria-busy', String(busy));
        document.querySelector('#login-label').textContent = busy ? 'Entrando...' : 'Entrar';
        document.querySelector('#login-arrow').toggleAttribute('hidden', busy);
        document.querySelector('#login-spinner').hidden = !busy;
    }

    async function submitLogin() {
        if (submitting) return;
        clearGeneralError();
        const credentials = { email: email.value.trim(), password: password.value, remember: remember.checked };
        setBusy(true);
        try {
            await prepareCsrf();
            showSession(await apiRequest('/auth/login', { method: 'POST', data: credentials }));
        } catch (error) {
            showLoginError(error);
        } finally {
            credentials.password = '';
            resetPassword();
            setBusy(false);
            if (!loginPanel.hidden && !errorMessage.hidden) errorMessage.focus();
        }
    }

    toggle.addEventListener('click', () => {
        const visible = password.type === 'password';
        password.type = visible ? 'text' : 'password';
        toggle.setAttribute('aria-pressed', String(visible));
        toggle.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
        passwordIcon.setAttribute('href', visible ? '#icon-eye' : '#icon-eye-off');
    });

    async function signOut() {
        if (signingOut) return;
        signingOut = true;
        try {
            await prepareCsrf();
            await apiRequest('/auth/logout', { method: 'POST' });
        } catch (error) {
            if (error.status !== 401) throw new Error(messageFor(error));
        } finally {
            signingOut = false;
        }
        resetPassword();
        validation.reset();
        clearGeneralError();
        remember.checked = false;
        showLogin();
        email.focus();
    }

    async function restoreSession() {
        try {
            showSession(await apiRequest('/me'));
        } catch (error) {
            showLogin();
            if (error.status !== 401) {
                errorMessage.textContent = messageFor(error);
                errorMessage.hidden = false;
            }
        }
    }

    void restoreSession();
    return {
        logout: signOut,
        expireSession() {
            resetPassword();
            validation.reset();
            remember.checked = false;
            showLogin();
            errorMessage.textContent = 'Sua sessão expirou. Entre novamente para continuar.';
            errorMessage.hidden = false;
            email.focus();
        },
        destroy: () => validation.destroy(),
    };
}
