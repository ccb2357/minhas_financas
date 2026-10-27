import { pageHeader } from '../shared/page-header.js';
import { icon, escapeHtml as esc } from '../shared/html.js';
import { mountSmartSelects } from '../shared/smart-select.js';
import { todayBrazil } from '../shared/calendar.js';
import { cycleDates, previewCycle } from './state.js';
import { saveCycleConfiguration } from './api.js';
let sequence = 0;

export function openCycleForm(ctx, { configuration, onClosed, onSaved }) {
    let alive = true, busy = false, closing = false, confirmation, saved;
    const previousFocus = document.activeElement, events = new AbortController();
    const selected = configuration.pending_cut_day || configuration.current?.cut_day || '';
    const prefix = `cycle-form-${++sequence}`;
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const popup = ctx.app.popup.create({
        animate, closeByBackdropClick: false, closeOnEscape: false, swipeToClose: false,
        content: `<div class="popup cycle-popup" role="dialog" aria-modal="true" aria-labelledby="${prefix}-title"><div class="cycle-popup-scroll"><div class="cycle-form-container finance-container">${pageHeader('Ciclo financeiro', 'Organize suas finanças entre uma data de corte e a próxima.')}${configuration.configured ? `<section class="finance-card cycle-current"><span>Ciclo atual</span><strong>${esc(cycleDates(configuration.current))}</strong><small>Este período e os ciclos anteriores serão preservados.</small></section>` : '<p class="cycle-setup-note">Escolha o dia de corte para começar. Essa configuração organiza todo o aplicativo.</p>'}<form id="${prefix}" novalidate><fieldset><section class="finance-card cycle-field"><label for="${prefix}-day">Dia de corte</label><select id="${prefix}-day" name="cut_day"><option value="">Selecione o dia</option>${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${String(selected) === String(i + 1) ? 'selected' : ''}>Dia ${i + 1}</option>`).join('')}</select><p>O ciclo começa no dia do corte e termina na véspera do próximo. Em meses mais curtos, usamos o último dia disponível.</p></section><section class="finance-card cycle-preview" aria-live="polite"><span>${configuration.configured ? 'Próximo ciclo' : 'Seu primeiro ciclo'}</span><strong data-cycle-preview>Escolha o dia de corte</strong><p>${configuration.configured ? 'A mudança vale somente para o próximo ciclo. Na transição, ele pode ser mais curto ou mais longo, sem repetir nem deixar dias de fora.' : 'As telas usarão esse intervalo para entradas, saídas e orçamentos.'}</p></section></fieldset><p class="auth-error cycle-error" role="alert" tabindex="-1" hidden></p></form></div></div><footer class="cycle-form-footer"><button class="mf-button mf-button-primary" type="submit" form="${prefix}" data-cycle-save>${configuration.configured ? 'Salvar configuração' : 'Definir ciclo'}</button><button type="button" class="transaction-cancel" data-cycle-close>Cancelar</button></footer></div>`,
        on: {
            opened() { popup.el.querySelector('h1').focus({ preventScroll: true }); },
            closed(instance) {
                if (!alive) return;
                alive = false; confirmation?.close(false); events.abort(); smartSelects.destroy();
                const element = instance.el;
                queueMicrotask(() => { instance.destroy(); element.remove(); });
                onClosed?.();
                if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
                if (saved) onSaved(saved);
            },
        },
    });
    popup.el.querySelector('h1').id = `${prefix}-title`;
    const form = popup.el.querySelector('form'), select = form.elements.cut_day;
    const smartSelects = mountSmartSelects(form, ctx.app), errorBox = form.querySelector('.cycle-error');
    form.querySelector('.mf-smart-trigger').insertAdjacentHTML('afterbegin', `<span class="cycle-cut-icon" aria-hidden="true">${icon('calendar')}</span>`);
    const initial = select.value;
    function preview() {
        const period = previewCycle(configuration, Number(select.value), todayBrazil());
        form.querySelector('[data-cycle-preview]').textContent = period ? cycleDates(period) : 'Escolha o dia de corte';
    }
    function close(force = false) {
        if (!alive || closing || busy) return;
        closing = true; popup.close(force ? false : animate);
    }
    function confirmLeave(resolve = () => {}, reject = () => {}) {
        if (busy || closing || confirmation) { reject(); return; }
        if (select.value === initial) { close(); resolve(); return; }
        confirmation = ctx.app.dialog.create({ animate, title: 'Descartar alteração?', text: 'A nova data de corte ainda não foi salva.', buttons: [
            { text: 'Continuar editando', onClick() { reject(); } },
            { text: 'Descartar', bold: true, onClick() { close(); resolve(); } },
        ], on: { closed() { confirmation = null; } } }).open();
    }
    form.addEventListener('change', () => { errorBox.hidden = true; preview(); }, { signal: events.signal });
    popup.el.addEventListener('click', event => { if (event.target.closest('[data-cycle-close]')) confirmLeave(); }, { signal: events.signal });
    popup.el.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); confirmLeave(); }
        if (event.key !== 'Tab') return;
        const controls = [...popup.el.querySelectorAll('button:not(:disabled)')].filter(e => !e.hidden);
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }, { signal: events.signal });
    form.addEventListener('submit', async event => {
        event.preventDefault(); if (busy || closing || confirmation) return;
        const day = Number(select.value);
        if (!Number.isInteger(day) || day < 1 || day > 31) { errorBox.textContent = 'Selecione o dia de corte.'; errorBox.hidden = false; errorBox.focus(); return; }
        busy = true; form.setAttribute('aria-busy', 'true'); form.querySelector('fieldset').disabled = true;
        for (const button of popup.el.querySelectorAll('button')) button.disabled = true;
        errorBox.hidden = true;
        try {
            const response = await saveCycleConfiguration(day, configuration.version);
            if (!alive) return;
            saved = response.data; busy = false; close();
        } catch (error) {
            if (!alive) return;
            if (error.status === 401) { ctx.expireSession(); return; }
            errorBox.textContent = error.errors?.cut_day?.[0] || (error.status === 419 ? 'A sessão de segurança expirou. Tente novamente.' : 'Não foi possível salvar o ciclo. Confira sua conexão e tente novamente.');
            errorBox.hidden = false; errorBox.focus();
        } finally {
            if (alive && !closing) { busy = false; form.setAttribute('aria-busy', 'false'); form.querySelector('fieldset').disabled = false; for (const button of popup.el.querySelectorAll('button')) button.disabled = false; }
        }
    }, { signal: events.signal });
    preview(); popup.open(animate);
    return { beforeLeave: confirmLeave, close(force = false) { if (force) { saved = null; busy = false; close(true); } else confirmLeave(); } };
}
