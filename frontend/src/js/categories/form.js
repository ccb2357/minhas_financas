import { pageHeader } from '../shared/page-header.js';
import { openIconPicker } from './icon-picker.js';
import { iconLabel } from './icon-catalog.js';
import { mountSmartSelects } from '../shared/smart-select.js';
import { createValidation, validationRules } from '../validation.js';
import { escapeHtml as esc, icon } from '../shared/html.js';
import { CATEGORY_COLORS, safeIcon, safeColor, operationMessage } from './catalog.js';
import { saveCategory, deactivateCategory } from './api.js';

let formSequence = 0;

export function openCategoryForm(ctx, { category = null, onSaved, onClosed } = {}) {
    const editing = Boolean(category);
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefix = `category-form-${++formSequence}`;
    let chosenIcon = safeIcon(category?.icon || 'cart');
    let chosenColor = safeColor(category?.color || '#FF503F');
    let busy = false;
    let alive = true;
    let confirming = false;
    let validation;
    let confirmation;
    let iconPicker;
    const events = new AbortController();
    const originalFocus = document.activeElement;
    // Keep a previously saved custom color selected without adding a fourth row.
    const palette = [...CATEGORY_COLORS];
    if (!palette.includes(chosenColor)) palette[palette.length - 1] = chosenColor;
    const colorOptions = palette.map(color => `<button type="button" class="category-color-option" data-color="${color}" style="--swatch:${color}" aria-label="Cor ${color}" aria-pressed="${color === chosenColor}">${icon('checkmark')}</button>`).join('');
    const popup = ctx.app.popup.create({
        animate, closeByBackdropClick: false, closeOnEscape: false, swipeToClose: false,
        content: `<div class="popup category-popup" role="dialog" aria-modal="true" aria-labelledby="${prefix}-title"><div class="category-popup-scroll"><div class="finance-container category-popup-content">${pageHeader(editing ? 'Editar categoria' : 'Nova categoria', editing ? 'Deixe esta categoria do seu jeito.' : 'Tudo começa com uma boa organização.')}<form id="${prefix}" novalidate><div class="finance-card category-form-card"><fieldset class="category-fieldset"><div class="category-live-preview"><span class="category-avatar" data-preview-icon></span><span><strong data-preview-name></strong><small data-preview-type></small></span></div><div data-field class="category-field"><label for="${prefix}-name">Nome da categoria</label><input id="${prefix}-name" name="name" type="text" maxlength="80" autocomplete="off" placeholder="Ex.: Alimentação" value="${esc(category?.name || '')}"><div id="${prefix}-name-error" class="field-error" hidden></div></div><div data-field class="category-field"><label for="${prefix}-type">Tipo</label><select id="${prefix}-type" name="type" ${editing ? 'disabled' : ''}><option value="">Selecione o tipo</option><option value="income" ${category?.type === 'income' ? 'selected' : ''}>Receita</option><option value="expense" ${category?.type === 'expense' ? 'selected' : ''}>Despesa</option></select><div id="${prefix}-type-error" class="field-error" hidden></div>${editing ? '<small class="category-field-hint">O tipo é definido na criação e não pode ser alterado.</small>' : ''}</div><div data-field class="category-field"><span id="${prefix}-icon-label" class="category-field-label">Ícone</span><input id="${prefix}-icon" type="hidden" name="icon" value="${chosenIcon}"><button type="button" class="category-icon-trigger" data-choose-icon aria-haspopup="dialog" aria-expanded="false" aria-labelledby="${prefix}-icon-label ${prefix}-icon-action"><span data-chosen-icon aria-hidden="true"></span><span><strong id="${prefix}-icon-action">Escolher ícone</strong><small data-chosen-icon-label></small></span>${icon('chevron_right')}</button><div id="${prefix}-icon-error" class="field-error" hidden></div></div><div data-field class="category-field"><span id="${prefix}-color-label" class="category-field-label">Cor</span><input id="${prefix}-color" type="hidden" name="color" value="${chosenColor}"><div class="category-color-grid" role="group" aria-labelledby="${prefix}-color-label">${colorOptions}</div><div id="${prefix}-color-error" class="field-error" hidden></div></div></fieldset><p class="auth-error category-form-error" role="alert" tabindex="-1" hidden></p></div>${editing ? `<button type="button" class="category-state-button ${category.is_active ? 'category-deactivate' : ''}" data-status>${icon(category.is_active ? 'archivebox' : 'arrow_counterclockwise')} ${category.is_active ? 'Desativar categoria' : 'Reativar categoria'}</button>` : ''}</form></div></div><footer class="category-form-footer"><button type="submit" form="${prefix}" class="mf-button mf-button-primary" data-save>Salvar categoria</button><button type="button" class="category-cancel" data-close>Cancelar</button></footer></div>`,
        on: {
            opened() { popup.el.querySelector('h1').focus({ preventScroll: true }); },
            closed(instance) {
                if (!alive) return;
                alive = false;
                confirmation?.close?.(false);
                iconPicker?.destroy();
                events.abort();
                smartSelects.destroy(); validation?.destroy();
                const element = instance.el;
                instance.destroy();
                element.remove();
                onClosed?.();
                if (originalFocus?.isConnected) originalFocus.focus();
            },
        },
    });
    popup.el.querySelector('h1').id = `${prefix}-title`;
    const form = popup.el.querySelector('form');
    const smartSelects = mountSmartSelects(form, ctx.app);
    const name = form.elements.name;
    const type = form.elements.type;
    const color = form.elements.color;
    const errorBox = form.querySelector('.category-form-error');

    function values() {
        return { name: name.value.trim(), type: type.value, icon: chosenIcon, color: chosenColor };
    }
    const initial = JSON.stringify(values());

    function preview() {
        const avatar = form.querySelector('[data-preview-icon]');
        avatar.innerHTML = icon(chosenIcon);
        avatar.style.setProperty('--category-color', chosenColor);
        form.querySelector('[data-preview-name]').textContent = name.value.trim() || 'Sua categoria';
        form.querySelector('[data-preview-type]').textContent = type.value === 'income' ? 'Receita' : type.value === 'expense' ? 'Despesa' : 'Selecione o tipo';
        form.querySelector('[data-chosen-icon]').innerHTML = icon(chosenIcon);
        form.querySelector('[data-chosen-icon-label]').textContent = iconLabel(chosenIcon);
        for (const button of form.querySelectorAll('[data-color]')) button.setAttribute('aria-pressed', String(button.dataset.color === chosenColor));
    }

    function setBusy(value) {
        busy = value;
        form.setAttribute('aria-busy', String(value));
        form.querySelector('fieldset').disabled = value;
        for (const button of popup.el.querySelectorAll('[data-save], [data-status], [data-close]')) button.disabled = value;
        popup.el.querySelector('[data-save]').textContent = value ? 'Aguarde...' : 'Salvar categoria';
    }

    async function mutate(action, message) {
        if (busy || !alive) return;
        setBusy(true);
        errorBox.hidden = true;
        try {
            await action();
            if (!alive) return;
            setBusy(false);
            popup.close(animate);
            onSaved?.(message);
        } catch (error) {
            if (!alive) return;
            if (error.status === 401) { ctx.expireSession(); return; }
            const mapped = error.status === 422 && validation.showServerErrors(error.errors);
            errorBox.textContent = operationMessage(error);
            errorBox.hidden = false;
            if (!mapped) errorBox.focus();
        } finally {
            if (alive) setBusy(false);
        }
    }

    function requestClose(force = false) {
        if (!alive || (busy && !force) || (!force && confirming)) return;
        if (!force && iconPicker) { iconPicker.close(); return; }
        if (!force && JSON.stringify(values()) !== initial) {
            confirming = true;
            confirmation = ctx.app.dialog.confirm('As alterações ainda não foram salvas. Deseja descartá-las?', 'Descartar alterações?', () => {
                confirming = false;
                popup.close(animate);
            }, () => { confirming = false; });
            return;
        }
        confirmation?.close?.(false);
        popup.close(force ? false : animate);
    }

    const schema = {
        name: { selector: `#${prefix}-name`, errorsContainer: `#${prefix}-name-error`, rules: [
            validationRules.required('Informe o nome da categoria.'),
            { validator: value => typeof value === 'string' && value.trim().length > 0, errorMessage: 'Informe o nome da categoria.' },
            validationRules.maxLength(80),
        ] },
        icon: { selector: `#${prefix}-icon`, errorsContainer: `#${prefix}-icon-error`, rules: [validationRules.required('Selecione um ícone.')] },
        color: { selector: `#${prefix}-color`, errorsContainer: `#${prefix}-color-error`, rules: [validationRules.required('Selecione uma cor.')] },
    };
    if (!editing) schema.type = { selector: `#${prefix}-type`, errorsContainer: `#${prefix}-type-error`, rules: [validationRules.required('Selecione receita ou despesa.')] };
    validation = createValidation(form, schema, {
        isBusy: () => busy || confirming,
        onInput() { errorBox.hidden = true; preview(); },
        onValid() {
            name.value = name.value.trim();
            const data = values();
            if (editing) delete data.type;
            return mutate(() => saveCategory(category?.id, data), editing ? 'Categoria atualizada.' : 'Categoria criada.');
        },
    });

    popup.el.addEventListener('click', event => {
        const target = event.target.closest('button');
        if (!target || busy) return;
        if (target.hasAttribute('data-close')) requestClose();
        if (target.hasAttribute('data-choose-icon') && !iconPicker && !confirming) {
            target.setAttribute('aria-expanded','true');
            iconPicker = openIconPicker(ctx.app, {
                value: chosenIcon,
                onSelect(value) { chosenIcon = value; form.elements.icon.value = value; form.elements.icon.dispatchEvent(new Event('input',{bubbles:true})); preview(); },
                onClosed() { iconPicker = null; target.setAttribute('aria-expanded','false'); if (alive && target.isConnected && !busy) target.focus({preventScroll:true}); },
            });
        }
        if (target.dataset.color) { chosenColor = target.dataset.color; color.value = chosenColor; color.dispatchEvent(new Event('input', { bubbles: true })); }
        if (target.hasAttribute('data-status') && !confirming) {
            if (JSON.stringify(values()) !== initial) {
                ctx.app.dialog.alert('Salve as alterações antes de mudar o estado da categoria.', 'Alterações pendentes');
                return;
            }
            if (!category.is_active) {
                void mutate(() => saveCategory(category.id, { is_active: true }), 'Categoria reativada.');
                return;
            }
            confirming = true;
            confirmation = ctx.app.dialog.create({
                title: 'Desativar categoria?',
                text: `“${esc(category.name)}” ficará indisponível para novos lançamentos. O histórico será preservado.`,
                buttons: [
                    { text: 'Cancelar', onClick() { confirming = false; } },
                    { text: 'Desativar', bold: true, color: 'red', onClick() {
                        confirming = false;
                        void mutate(() => deactivateCategory(category.id), 'Categoria desativada.');
                    } },
                ],
            }).open();
        }
    }, { signal: events.signal });
    color.addEventListener('input', () => { chosenColor = safeColor(color.value); preview(); }, { signal: events.signal });
    type.addEventListener('change', preview, { signal: events.signal });
    popup.el.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); requestClose(); }
        if (event.key !== 'Tab') return;
        const focusable = [...popup.el.querySelectorAll('button:not(:disabled), input:not([type="hidden"]):not(:disabled), select:not(:disabled)')];
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }, { signal: events.signal });
    preview();
    popup.open();
    return { close: requestClose };
}
