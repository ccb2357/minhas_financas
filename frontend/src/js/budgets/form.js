import { createValidation, validationRules as rules } from '../validation.js';
import { escapeHtml as esc, icon } from '../shared/html.js';
import { amountText } from '../shared/money.js';
import { mountMasks } from '../shared/masks.js';
import { validMonth } from '../shared/calendar.js';
import { categoryOptions } from '../transactions/api.js';
import { saveBudget, removeBudget, budgetError } from './api.js';

let sequence = 0;
export function openBudgetForm(ctx, { budget = null, month = ctx.state.budgetMonth, onSaved, onClosed } = {}) {
    const editing = Boolean(budget), prefix = `budget-form-${++sequence}`;
    const selectedMonth = editing ? `${budget.year}-${String(budget.month).padStart(2, '0')}` : month;
    let alive = true, busy = false, loading = !editing, failed = false, confirming = false;
    let validation, confirmation;
    const events = new AbortController(), previousFocus = document.activeElement;
    const popup = ctx.app.popup.create({
        closeByBackdropClick: false, closeOnEscape: false, swipeToClose: false,
        content: `<div class="popup budget-popup" role="dialog" aria-modal="true" aria-labelledby="${prefix}-title"><div class="budget-popup-scroll"><div class="budget-form-container"><header><h2 id="${prefix}-title" tabindex="-1">${editing ? 'Editar orçamento' : 'Novo orçamento'}</h2><button type="button" class="icon-button" data-budget-close aria-label="Fechar formulário">${icon('xmark')}</button></header><p class="budget-form-intro">${editing ? 'Ajuste seu limite mensal. Os gastos vêm dos seus lançamentos.' : 'Defina um limite por categoria para acompanhar seus gastos.'}</p><form id="${prefix}" novalidate><fieldset><div class="budget-field" data-field><label for="${prefix}-period">Mês do orçamento</label><input id="${prefix}-period" name="period" type="month" min="1900-01" max="2100-12" value="${esc(selectedMonth)}" ${editing ? 'disabled' : ''}><div class="budget-error-slot"><div class="field-error" id="${prefix}-period-error" hidden></div></div></div><div class="budget-field" data-field><label for="${prefix}-category">Categoria de despesa</label><select id="${prefix}-category" name="category_id" disabled>${editing ? `<option value="${budget.category_id}">${esc(budget.category.name)}${budget.category.is_active ? '' : ' (inativa)'}</option>` : '<option value="">Carregando categorias...</option>'}</select><div class="budget-error-slot"><div class="field-error" id="${prefix}-category-error" hidden></div></div><p class="budget-category-note" data-budget-category-note role="status">${editing ? 'A categoria e o mês são definidos na criação.' : ''}</p>${editing ? '' : '<div class="budget-category-actions"><button type="button" data-budget-options-retry>Atualizar categorias</button><button type="button" data-budget-manage>Criar categoria</button></div>'}</div><div class="budget-field budget-limit-field" data-field><label for="${prefix}-limit">Limite mensal</label><div><span aria-hidden="true">R$</span><input id="${prefix}-limit" name="limit" data-mask="moedaBRL" type="text" inputmode="decimal" autocomplete="off" maxlength="22" placeholder="0,00" aria-label="Limite mensal em reais" value="${editing ? amountText(budget.limit_cents) : ''}"></div><div class="budget-error-slot"><div class="field-error" id="${prefix}-limit-error" hidden></div></div><small>Digite somente os números. Os dois últimos são centavos.</small></div></fieldset><p class="auth-error budget-form-error" role="alert" tabindex="-1" hidden></p><button type="submit" class="mf-button mf-button-primary" data-budget-save>Salvar orçamento</button>${editing ? `<button type="button" class="budget-remove" data-budget-remove>${icon('trash')} Remover orçamento</button>` : ''}<button type="button" class="budget-cancel" data-budget-close>Cancelar</button></form></div></div></div>`,
        on: {
            opened() { popup.el.querySelector('h2').focus(); },
            closed(instance) {
                if (!alive) return;
                alive = false; confirmation?.close?.(false); events.abort(); validation?.destroy(); masks.destroy();
                const element = instance.el; instance.destroy(); element.remove(); onClosed?.();
                if (previousFocus?.isConnected) previousFocus.focus();
            },
        },
    });
    const form = popup.el.querySelector('form'), fields = form.elements;
    const masks = mountMasks(form), limitMask = masks.get(fields.limit);
    const errorBox = form.querySelector('.budget-form-error'), save = form.querySelector('[data-budget-save]');
    function values() { return { period: fields.period.value, category_id: fields.category_id.value, limit: limitMask.getCents() ?? fields.limit.value.trim() }; }
    const initial = JSON.stringify(values());
    const dirty = () => JSON.stringify(values()) !== initial;
    function setBusy(value) {
        busy = value; form.setAttribute('aria-busy', String(value)); form.querySelector('fieldset').disabled = value;
        fields.category_id.disabled = value || editing || loading || failed;
        fields.period.disabled = value || editing;
        for (const button of popup.el.querySelectorAll('[data-budget-close], [data-budget-remove]')) button.disabled = value;
        save.disabled = value || loading || failed || !editing && fields.category_id.options.length < 2;
        save.textContent = value ? 'Aguarde...' : 'Salvar orçamento';
    }
    async function loadOptions() {
        if (!alive || editing || loading && fields.category_id.options.length > 1) return;
        const chosen = fields.category_id.value;
        loading = true; failed = false; fields.category_id.disabled = true; setBusy(busy);
        try {
            const categories = (await categoryOptions('active', () => !alive)).filter(item => item.type === 'expense' && item.is_active);
            if (!alive) return;
            fields.category_id.innerHTML = '<option value="">Selecione uma categoria</option>' + categories.map(item => `<option value="${item.id}">${esc(item.name)}</option>`).join('');
            if (categories.some(item => String(item.id) === chosen)) fields.category_id.value = chosen;
            form.querySelector('[data-budget-category-note]').textContent = categories.length ? 'Uma categoria pode ter um limite por mês.' : 'Crie uma categoria de despesa ativa para definir um orçamento.';
        } catch (error) {
            if (!alive) return;
            if (error.status === 401) { ctx.expireSession(); return; }
            failed = true; form.querySelector('[data-budget-category-note]').textContent = 'Não foi possível carregar as categorias. Tente atualizar.';
        } finally { if (alive) { loading = false; setBusy(busy); } }
    }
    function finishClose(done = () => {}) { popup.close(false); done(); }
    function confirmLeave(done, cancel = () => {}) {
        if (!alive) { done(); return; }
        if (busy || confirming) { cancel(); return; }
        if (!dirty()) { finishClose(done); return; }
        confirming = true;
        confirmation = ctx.app.dialog.create({ title: 'Descartar alterações?', text: 'As alterações ainda não foram salvas.', buttons: [
            { text: 'Continuar editando', onClick() { confirming = false; cancel(); } },
            { text: 'Descartar', bold: true, onClick() { confirming = false; finishClose(done); } },
        ] }).open();
    }
    async function mutate(action, kind) {
        if (!alive || busy) return;
        setBusy(true); errorBox.hidden = true;
        try {
            const response = await action();
            if (!alive) return;
            finishClose(() => onSaved?.(response?.data || budget, kind));
        } catch (error) {
            if (!alive) return;
            if (error.status === 401) { ctx.expireSession(); return; }
            const errors = { ...error.errors };
            if (errors.year || errors.month) errors.period = [...(errors.year || []), ...(errors.month || [])];
            validation.showServerErrors(errors); errorBox.textContent = budgetError(error); errorBox.hidden = false; errorBox.focus();
        } finally { if (alive) setBusy(false); }
    }
    const schema = {
        limit_cents: { selector: `#${prefix}-limit`, errorsContainer: `#${prefix}-limit-error`, rules: [
            rules.required('Informe o limite mensal.'), { validator: () => limitMask.getCents() !== null, errorMessage: 'Informe de R$ 0,01 a R$ 999.999.999,99.' },
        ] },
    };
    if (!editing) {
        schema.category_id = { selector: `#${prefix}-category`, errorsContainer: `#${prefix}-category-error`, rules: [rules.required('Selecione uma categoria de despesa.')] };
        schema.period = { selector: `#${prefix}-period`, errorsContainer: `#${prefix}-period-error`, rules: [
            rules.required('Selecione o mês do orçamento.'), { validator: validMonth, errorMessage: 'Selecione um mês entre janeiro de 1900 e dezembro de 2100.' },
        ] };
    }
    validation = createValidation(form, schema, {
        isBusy: () => busy || loading || failed || confirming,
        onInput() { errorBox.hidden = true; },
        onValid() {
            const data = { limit_cents: limitMask.getCents() };
            if (!Number.isSafeInteger(data.limit_cents)) return;
            if (!editing) {
                const [year, month] = fields.period.value.split('-').map(Number);
                Object.assign(data, { category_id: Number(fields.category_id.value), year, month });
                if (!data.category_id || !validMonth(fields.period.value)) return;
            }
            void mutate(() => saveBudget(budget?.id, data), editing ? 'updated' : 'created');
        },
    });
    popup.el.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button || busy || confirming) return;
        if (button.hasAttribute('data-budget-close')) confirmLeave(() => {});
        if (button.hasAttribute('data-budget-options-retry') && !loading) void loadOptions();
        if (button.hasAttribute('data-budget-manage')) confirmLeave(() => ctx.navigate('/categorias/'));
        if (button.hasAttribute('data-budget-remove')) {
            confirming = true;
            confirmation = ctx.app.dialog.create({ title: 'Remover orçamento?', text: `O limite de “${esc(budget.category.name)}” será removido deste mês. Seus lançamentos serão preservados.`, buttons: [
                { text: 'Cancelar', onClick() { confirming = false; } },
                { text: 'Remover', color: 'red', bold: true, onClick() { confirming = false; void mutate(() => removeBudget(budget.id), 'deleted'); } },
            ] }).open();
        }
    }, { signal: events.signal });
    window.addEventListener('beforeunload', event => { if (dirty() || busy) { event.preventDefault(); event.returnValue = ''; } }, { signal: events.signal });
    popup.el.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); confirmLeave(() => {}); }
        if (event.key !== 'Tab') return;
        const controls = [...popup.el.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')].filter(item => item.offsetParent !== null);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }, { signal: events.signal });
    setBusy(false); popup.open(); if (!editing) void loadOptions();
    return {
        close(force = false) { if (force) finishClose(); else confirmLeave(() => {}); },
        beforeLeave(resolve, reject) { confirmLeave(resolve, reject); },
    };
}
