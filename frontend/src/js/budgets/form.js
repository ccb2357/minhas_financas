import { pageHeader } from '../shared/page-header.js';
import { cycleDates, knownCycle } from '../cycles/state.js';
import { getCycleConfiguration } from '../cycles/api.js';
import { mountDateFields } from '../shared/date-picker.js';
import { safeIcon, safeColor } from '../categories/catalog.js';
import { mountSmartSelects } from '../shared/smart-select.js';
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
    let validation, confirmation, afterClose;
    let closing = false;
    const events = new AbortController(), previousFocus = document.activeElement;
    const popup = ctx.app.popup.create({
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        closeByBackdropClick: false, closeOnEscape: false, swipeToClose: false,
        content: `<div class="popup budget-popup" role="dialog" aria-modal="true" aria-labelledby="${prefix}-title"><div class="budget-popup-scroll"><div class="budget-form-container finance-container">${pageHeader(editing ? 'Editar orçamento' : 'Novo orçamento', editing ? 'Ajuste seu limite por ciclo' : 'Planeje seus gastos por ciclo')}<form id="${prefix}" novalidate><fieldset><section class="finance-card budget-form-card"><div class="budget-field" data-field><label for="${prefix}-period">Ciclo do orçamento</label><input id="${prefix}-period" name="period" type="month" min="1900-01" max="2100-12" value="${esc(selectedMonth)}" ${editing ? 'disabled' : ''}><div class="budget-error-slot"><div class="field-error" id="${prefix}-period-error" hidden></div></div></div><div class="budget-field" data-field><label for="${prefix}-category">Categoria de despesa</label><select id="${prefix}-category" name="category_id" disabled>${editing ? `<option value="${budget.category_id}" data-option-icon="${safeIcon(budget.category.icon)}" data-option-color="${safeColor(budget.category.color)}">${esc(budget.category.name)}${budget.category.is_active ? '' : ' (inativa)'}</option>` : '<option value="">Carregando categorias...</option>'}</select><div class="budget-error-slot"><div class="field-error" id="${prefix}-category-error" hidden></div></div><p class="budget-category-note" data-budget-category-note role="status" ${editing ? 'hidden' : ''}></p><button type="button" class="budget-options-retry" data-budget-options-retry hidden>Tentar novamente</button></div><div class="budget-field budget-limit-field" data-field><label for="${prefix}-limit">Limite do ciclo</label><div><span aria-hidden="true">R$</span><input id="${prefix}-limit" name="limit" data-mask="moedaBRL" type="text" inputmode="decimal" autocomplete="off" maxlength="22" placeholder="0,00" aria-label="Limite do ciclo em reais" value="${editing ? amountText(budget.limit_cents) : ''}"></div><div class="budget-error-slot"><div class="field-error" id="${prefix}-limit-error" hidden></div></div></div></section></fieldset><p class="auth-error budget-form-error" role="alert" tabindex="-1" hidden></p><div class="budget-form-actions"><button type="submit" class="mf-button mf-button-primary budget-save" data-budget-save>Salvar orçamento</button>${editing ? `<button type="button" class="budget-remove" data-budget-remove>${icon('trash')} Remover orçamento</button>` : ''}<button type="button" class="budget-cancel" data-budget-close>Cancelar</button></div></form></div></div></div>`,
        on: {
            opened() { popup.el.querySelector('h1').focus({ preventScroll: true }); },
            closed(instance) {
                if (!alive) return;
                alive = false; confirmation?.close?.(false); events.abort(); categoryChoiceObserver.disconnect(); dateFields.destroy(); smartSelects.destroy(); validation?.destroy(); masks.destroy();
                const element = instance.el; instance.destroy(); element.remove(); onClosed?.();
                if (previousFocus?.isConnected) previousFocus.focus();
                afterClose?.();
            },
        },
    });
    popup.el.querySelector('h1').id = `${prefix}-title`;
    const form = popup.el.querySelector('form'), fields = form.elements;
    const smartSelects = mountSmartSelects(form, ctx.app);
    const dateFields = mountDateFields(form, ctx.app);
    const cycleButton = fields.period.closest('.mf-picker-control').querySelector('.mf-date-trigger');
    const categoryButton = fields.category_id.closest('.mf-smart-control').querySelector('.mf-smart-trigger');
    cycleButton.classList.add('budget-choice-button', 'budget-cycle-choice');
    categoryButton.classList.add('budget-choice-button');
    cycleButton.insertAdjacentHTML('afterbegin', `<span class="budget-choice-icon" aria-hidden="true">${icon('calendar')}</span>`);
    const categoryIcon = document.createElement('span');
    categoryIcon.className = 'budget-choice-icon'; categoryIcon.setAttribute('aria-hidden', 'true');
    categoryButton.prepend(categoryIcon);
    function syncCategoryChoice() {
        const option = fields.category_id.selectedOptions[0];
        categoryIcon.innerHTML = icon(safeIcon(option?.dataset.optionIcon || 'tag'));
        categoryIcon.style.setProperty('--budget-choice-color', safeColor(option?.dataset.optionColor || '#1564FF'));
    }
    const categoryChoiceObserver = new MutationObserver(syncCategoryChoice);
    categoryChoiceObserver.observe(fields.category_id, { childList: true, subtree: true, attributes: true });
    fields.category_id.addEventListener('change', syncCategoryChoice, { signal: events.signal });
    syncCategoryChoice();

    const masks = mountMasks(form), limitMask = masks.get(fields.limit);
    const errorBox = form.querySelector('.budget-form-error'), save = popup.el.querySelector('[data-budget-save]');
    let periodRevision = 0;
    async function showPeriod() {
        const current = ++periodRevision, month = fields.period.value;
        fields.period.dataset.dateLabel = validMonth(month) ? cycleDates(knownCycle(month)) : 'Selecione o ciclo';
        if (!validMonth(month) || knownCycle(month)) return;
        try { await getCycleConfiguration(month); if (alive && current === periodRevision) fields.period.dataset.dateLabel = cycleDates(knownCycle(month)); }
        catch { if (alive && current === periodRevision) fields.period.dataset.dateLabel = 'Período indisponível. Tente selecionar o ciclo novamente.'; }
    }
    fields.period.addEventListener('change', () => { void showPeriod(); }, { signal: events.signal });
    void showPeriod();
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
        form.querySelector('[data-budget-options-retry]').hidden = true;
        try {
            const categories = (await categoryOptions('active', () => !alive)).filter(item => item.type === 'expense' && item.is_active);
            if (!alive) return;
            fields.category_id.innerHTML = '<option value="">Selecione uma categoria</option>' + categories.map(item => `<option value="${item.id}" data-option-icon="${safeIcon(item.icon)}" data-option-color="${safeColor(item.color)}">${esc(item.name)}</option>`).join('');
            if (categories.some(item => String(item.id) === chosen)) fields.category_id.value = chosen;
            const note = form.querySelector('[data-budget-category-note]');
            note.textContent = categories.length ? '' : 'Crie uma categoria de despesa ativa para definir um orçamento.';
            note.hidden = categories.length > 0;
            syncCategoryChoice();
        } catch (error) {
            if (!alive) return;
            if (error.status === 401) { ctx.expireSession(); return; }
            failed = true; form.querySelector('[data-budget-category-note]').hidden = false;
            form.querySelector('[data-budget-category-note]').textContent = 'Não foi possível carregar as categorias.';
            form.querySelector('[data-budget-options-retry]').hidden = false;
        } finally { if (alive) { loading = false; setBusy(busy); } }
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
        confirmation = ctx.app.dialog.create({ animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, title: 'Descartar alterações?', text: 'As alterações ainda não foram salvas.', buttons: [
            { text: 'Continuar editando', onClick() { confirming = false; cancel(); } },
            { text: 'Descartar', bold: true, onClick() { confirming = false; finishClose(done); } },
        ] }).open();
    }
    async function mutate(action, kind) {
        if (!alive || busy || closing) return;
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
            rules.required('Informe o limite por ciclo.'), { validator: () => limitMask.getCents() !== null, errorMessage: 'Informe de R$ 0,01 a R$ 999.999.999,99.' },
        ] },
    };
    if (!editing) {
        schema.category_id = { selector: `#${prefix}-category`, errorsContainer: `#${prefix}-category-error`, rules: [rules.required('Selecione uma categoria de despesa.')] };
        schema.period = { selector: `#${prefix}-period`, errorsContainer: `#${prefix}-period-error`, rules: [
            rules.required('Selecione o ciclo do orçamento.'), { validator: validMonth, errorMessage: 'Selecione um ciclo entre janeiro de 1900 e dezembro de 2100.' },
        ] };
    }
    validation = createValidation(form, schema, {
        isBusy: () => busy || loading || failed || confirming || closing,
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
        if (!button || busy || confirming || closing) return;
        if (button.hasAttribute('data-budget-close')) confirmLeave(() => {});
        if (button.hasAttribute('data-budget-options-retry') && !loading) void loadOptions();
        if (button.hasAttribute('data-budget-remove')) {
            confirming = true;
            confirmation = ctx.app.dialog.create({ animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, title: 'Remover orçamento?', text: `O limite de “${esc(budget.category.name)}” será removido deste mês. Seus lançamentos serão preservados.`, buttons: [
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
        close(force = false) { if (force) { afterClose = undefined; popup.close(false); } else confirmLeave(() => {}); },
        beforeLeave(resolve, reject) { confirmLeave(resolve, reject); },
    };
}
