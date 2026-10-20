import { mountSmartSelects } from '../shared/smart-select.js';
import { createValidation, validationRules as rules } from '../validation.js';
import { escapeHtml as esc, icon } from '../shared/html.js';
import { amountText } from '../shared/money.js';
import { mountMasks } from '../shared/masks.js';
import { todayBrazil, validDate } from '../shared/calendar.js';
import { safeIcon, safeColor } from '../categories/catalog.js';
import { categoryOptions, saveTransaction, deleteTransaction, transactionError } from './api.js';

let sequence = 0;

export function openTransactionForm(ctx, { transaction = null, onSaved, onClosed } = {}) {
    const editing = Boolean(transaction);
    const prefix = `transaction-form-${++sequence}`;
    let type = transaction?.type || 'income';
    let alive = true, busy = false, loading = true, failed = false, confirming = false;
    let categories = [], validation, confirmation;
    const listeners = new AbortController();
    const previousFocus = document.activeElement;
    const popup = ctx.app.popup.create({
        closeByBackdropClick: false, closeOnEscape: false, swipeToClose: false,
        content: `<div class="popup transaction-popup" role="dialog" aria-modal="true" aria-labelledby="${prefix}-title"><div class="transaction-popup-scroll"><div class="transaction-form-container"><header class="transaction-form-header"><button type="button" class="icon-button" data-tx-close aria-label="Voltar">${icon('chevron_left')}</button><h2 id="${prefix}-title">${editing ? 'Editar lançamento' : 'Novo lançamento'}</h2><span></span></header><form id="${prefix}" novalidate><fieldset><div class="transaction-type-picker" role="group" aria-label="Tipo de lançamento">${[['income', 'Entrada', 'arrow_up'], ['expense', 'Saída', 'arrow_down']].map(([value, label, glyph]) => `<button type="button" data-tx-type="${value}" aria-pressed="${type === value}"><span class="transaction-type-icon ${value}">${icon(glyph)}</span>${label}</button>`).join('')}</div><input type="hidden" name="type" id="${prefix}-type" value="${type}"><div id="${prefix}-type-error" class="field-error" hidden></div><section class="finance-card transaction-amount" data-field><label for="${prefix}-amount">Valor</label><div><span aria-hidden="true">R$</span><input id="${prefix}-amount" name="amount" data-mask="moedaBRL" type="text" inputmode="decimal" autocomplete="off" maxlength="22" placeholder="0,00" value="${transaction ? amountText(transaction.amount_cents) : ''}" aria-label="Valor em reais"></div><div id="${prefix}-amount-error" class="field-error" hidden></div></section><section class="finance-card transaction-fields"><div class="transaction-field" data-field><label for="${prefix}-description">Descrição</label><div class="transaction-input">${icon('doc_text')}<input type="text" id="${prefix}-description" name="description" maxlength="255" placeholder="Ex.: Salário, supermercado, aluguel..." value="${esc(transaction?.description || '')}"></div><div id="${prefix}-description-error" class="field-error" hidden></div></div><div class="transaction-field" data-field><label for="${prefix}-category">Categoria</label><div class="transaction-input transaction-category-input"><span class="tx-category-icon" data-tx-category-icon>${icon('tag')}</span><select name="category_id" id="${prefix}-category" aria-describedby="${prefix}-category-note" disabled><option value="">Carregando categorias...</option></select></div><div id="${prefix}-category-error" class="field-error" hidden></div><p id="${prefix}-category-note" class="transaction-field-hint" data-tx-category-note role="status"></p><div class="transaction-category-actions"><button type="button" data-tx-categories-retry>Atualizar categorias</button><button type="button" data-tx-manage>Criar categoria</button></div></div><div class="transaction-field" data-field><label for="${prefix}-date">Data</label><div class="transaction-input">${icon('calendar')}<input type="date" name="transaction_date" id="${prefix}-date" min="1900-01-01" max="2100-12-31" value="${esc(transaction?.transaction_date || todayBrazil())}"></div><div id="${prefix}-date-error" class="field-error" hidden></div></div><div class="transaction-field" data-field><label for="${prefix}-notes">Observação <span>(opcional)</span></label><div class="transaction-input transaction-notes">${icon('doc_text')}<textarea id="${prefix}-notes" name="notes" maxlength="2000" placeholder="Adicione uma observação...">${esc(transaction?.notes || '')}</textarea></div><small class="transaction-note-count" data-tx-note-count></small><div id="${prefix}-notes-error" class="field-error" hidden></div></div></section></fieldset><p class="auth-error transaction-error" role="alert" tabindex="-1" hidden></p><button type="submit" class="mf-button mf-button-primary transaction-save" data-tx-save>${icon('checkmark_alt')}<span>Salvar lançamento</span></button>${editing ? `<button type="button" class="transaction-delete" data-tx-delete>${icon('trash')} Excluir lançamento</button>` : ''}<button type="button" class="transaction-cancel" data-tx-close>Cancelar</button></form></div></div></div>`,
        on: {
            closed(instance) {
                if (!alive) return;
                alive = false;
                confirmation?.close?.(false);
                listeners.abort();
                smartSelects.destroy(); validation?.destroy();
                masks.destroy();
                const element = instance.el;
                instance.destroy(); element.remove();
                onClosed?.();
                if (previousFocus?.isConnected) previousFocus.focus();
            },
        },
    });
    const form = popup.el.querySelector('form');
    const smartSelects = mountSmartSelects(form, ctx.app);
    const fields = form.elements;
    const masks = mountMasks(form);
    const amountMask = masks.get(fields.amount);
    const select = fields.category_id;
    const errorBox = form.querySelector('.transaction-error');
    const save = form.querySelector('[data-tx-save]');

    function values() {
        return { type, category_id: loading && editing && type === transaction.type && !select.value ? String(transaction.category_id) : select.value,
            amount: amountMask.getCents() ?? fields.amount.value.trim(),
            description: fields.description.value.trim(), transaction_date: fields.transaction_date.value, notes: fields.notes.value.trim() };
    }
    // A categoria inicial será aplicada assim que a listagem terminar de carregar.
    const initial = JSON.stringify({ ...values(), category_id: String(transaction?.category_id || '') });
    const dirty = () => JSON.stringify(values()) !== initial;

    function setBusy(value) {
        busy = value;
        form.setAttribute('aria-busy', String(value));
        form.querySelector('fieldset').disabled = value;
        for (const button of popup.el.querySelectorAll('[data-tx-close], [data-tx-delete]')) button.disabled = value;
        save.disabled = value || loading || failed || select.options.length < 2;
        save.querySelector('span').textContent = value ? 'Aguarde...' : 'Salvar lançamento';
    }

    function categoryNote() {
        const chosen = categories.find(item => String(item.id) === select.value);
        const badge = form.querySelector('[data-tx-category-icon]');
        badge.innerHTML = icon(safeIcon(chosen?.icon || 'tag'));
        badge.style.setProperty('--category-color', safeColor(chosen?.color || '#2463EB'));
        if (!loading && !failed) form.querySelector('[data-tx-category-note]').textContent = chosen && !chosen.is_active
            ? 'Categoria inativa preservada neste lançamento.'
            : select.options.length < 2 ? 'Crie uma categoria deste tipo para continuar.' : '';
    }

    function renderCategories(preferred = select.value) {
        const available = categories.filter(item => item.type === type
            && (item.is_active || (editing && item.id === transaction.category_id && type === transaction.type)));
        select.innerHTML = `<option value="">${loading ? 'Carregando categorias...' : failed ? 'Não foi possível carregar' : 'Selecione uma categoria'}</option>`
            + available.map(item => `<option value="${item.id}" data-option-icon="${safeIcon(item.icon)}" data-option-color="${safeColor(item.color)}">${esc(item.name)}${item.is_active ? '' : ' (inativa)'}</option>`).join('');
        select.value = available.some(item => String(item.id) === preferred) ? preferred : '';
        select.disabled = loading || failed || available.length === 0;
        categoryNote(); setBusy(busy);
    }

    async function loadCategories() {
        if (!alive || busy || (loading && categories.length)) return;
        const preferred = select.value || (editing && !categories.length ? String(transaction.category_id) : '');
        loading = true; failed = false;
        renderCategories(preferred);
        try {
            const rows = await categoryOptions('active', () => !alive);
            if (!alive) return;
            categories = rows;
            if (editing && !categories.some(item => item.id === transaction.category_id)) categories.push(transaction.category);
        } catch (error) {
            if (!alive) return;
            if (error.status === 401) { ctx.expireSession(); return; }
            failed = true;
            form.querySelector('[data-tx-category-note]').textContent = 'Não foi possível carregar as categorias. Confira sua conexão e tente atualizar.';
        } finally {
            if (alive) { loading = false; renderCategories(preferred); }
        }
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
            const row = response?.data || transaction;
            finishClose(() => onSaved?.(row, kind));
        } catch (error) {
            if (!alive) return;
            if (error.status === 401) { ctx.expireSession(); return; }
            validation.showServerErrors(error.errors || {});
            errorBox.textContent = transactionError(error);
            errorBox.hidden = false;
            errorBox.focus();
        } finally { if (alive) setBusy(false); }
    }

    validation = createValidation(form, {
        type: { selector: `#${prefix}-type`, errorsContainer: `#${prefix}-type-error`, rules: [rules.required('Selecione Entrada ou Saída.')] },
        amount_cents: { selector: `#${prefix}-amount`, errorsContainer: `#${prefix}-amount-error`, rules: [
            rules.required('Informe o valor do lançamento.'),
            { validator: () => amountMask.getCents() !== null, errorMessage: 'Informe de R$ 0,01 a R$ 999.999.999,99. Ex.: 234,90.' },
        ] },
        description: { selector: `#${prefix}-description`, errorsContainer: `#${prefix}-description-error`, rules: [
            rules.required('Informe a descrição.'), { validator: value => Boolean(value.trim()), errorMessage: 'Informe a descrição.' }, rules.maxLength(255),
        ] },
        category_id: { selector: `#${prefix}-category`, errorsContainer: `#${prefix}-category-error`, rules: [rules.required('Selecione uma categoria.')] },
        transaction_date: { selector: `#${prefix}-date`, errorsContainer: `#${prefix}-date-error`, rules: [
            rules.required('Informe a data.'), { validator: validDate, errorMessage: 'Informe uma data válida entre 1900 e 2100.' },
        ] },
        notes: { selector: `#${prefix}-notes`, errorsContainer: `#${prefix}-notes-error`, rules: [rules.maxLength(2000)] },
    }, {
        isBusy: () => busy || loading || failed || confirming,
        onInput() { errorBox.hidden = true; form.querySelector('[data-tx-note-count]').textContent = `${fields.notes.value.length}/2000`; },
        onValid() {
            const data = { type, amount_cents: amountMask.getCents(), category_id: Number(select.value),
                description: fields.description.value.trim(), transaction_date: fields.transaction_date.value, notes: fields.notes.value.trim() || null };
            if (!select.value || !Number.isSafeInteger(data.amount_cents)) return;
            void mutate(() => saveTransaction(transaction?.id, data), editing ? 'updated' : 'created');
        },
    });

    popup.el.addEventListener('click', event => {
        const target = event.target.closest('button');
        if (!target || busy || confirming) return;
        if (target.dataset.txType && target.dataset.txType !== type) {
            type = target.dataset.txType; fields.type.value = type;
            for (const button of form.querySelectorAll('[data-tx-type]')) button.setAttribute('aria-pressed', String(button === target));
            renderCategories(''); validation.reset();
        }
        if (target.hasAttribute('data-tx-close')) confirmLeave(() => {});
        if (target.hasAttribute('data-tx-categories-retry') && !loading) void loadCategories();
        if (target.hasAttribute('data-tx-manage')) confirmLeave(() => ctx.navigate('/categorias/'));
        if (target.hasAttribute('data-tx-delete')) {
            confirming = true;
            confirmation = ctx.app.dialog.create({ title: 'Excluir lançamento?', text: `“${esc(transaction.description)}” será removido do Histórico e dos cálculos.`, buttons: [
                { text: 'Cancelar', onClick() { confirming = false; } },
                { text: 'Excluir', bold: true, color: 'red', onClick() { confirming = false; void mutate(() => deleteTransaction(transaction.id), 'deleted'); } },
            ] }).open();
        }
    }, { signal: listeners.signal });
    select.addEventListener('change', categoryNote, { signal: listeners.signal });
    window.addEventListener('beforeunload', event => {
        if (dirty() || busy) { event.preventDefault(); event.returnValue = ''; }
    }, { signal: listeners.signal });
    popup.el.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); confirmLeave(() => {}); }
        if (event.key !== 'Tab') return;
        const controls = [...popup.el.querySelectorAll('button:not(:disabled), input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)')];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }, { signal: listeners.signal });
    form.querySelector('[data-tx-note-count]').textContent = `${fields.notes.value.length}/2000`;
    popup.open(); void loadCategories();
    return {
        close(force = false) { if (force) finishClose(); else confirmLeave(() => {}); },
        beforeLeave(resolve, reject) { confirmLeave(resolve, reject); },
    };
}
