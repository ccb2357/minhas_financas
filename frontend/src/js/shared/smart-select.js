import { escapeHtml as esc, icon } from './html.js';
import { safeColor, safeIcon } from '../categories/catalog.js';

const controls = new Set();
let sequence = 0;

// One adapter for forms and filters. The original select remains the source of
// truth for FormData, validation and existing API handlers; Framework7 owns the sheet.
export function closeActiveSmartSelect(app) {
    const active = [...controls].find(control => control.app === app && control.instance.opened);
    if (!active) return false;
    active.instance.close();
    return true;
}

export function mountSmartSelects(root, app) {
    const disposers = [...root.querySelectorAll('select')].map(select => {
        const wrapper = document.createElement('div');
        wrapper.className = 'mf-smart-control';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mf-smart-trigger';
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-expanded', 'false');
        const text = document.createElement('span');
        button.append(text);
        button.insertAdjacentHTML('beforeend', icon('chevron_down'));
        select.before(wrapper);
        wrapper.append(select, button);
        const oldTabindex = select.getAttribute('tabindex');
        select.tabIndex = -1;
        select.classList.add('mf-smart-native');
        const title = select.getAttribute('aria-label') || [...root.querySelectorAll('label[for]')].find(label => label.htmlFor === select.id)?.textContent.trim() || [...(select.labels || [])].map(label => label.textContent.trim()).join(' ') || 'Selecione uma opção';
        const sheetId = `mf-smart-sheet-${++sequence}`;
        button.setAttribute('aria-controls', sheetId);
        let destroyed = false;

        function sync() {
            if (destroyed) return;
            const label = select.selectedOptions[0]?.textContent || 'Selecione uma opção';
            if (text.textContent !== label) text.textContent = label;
            button.title = label;
            button.setAttribute('aria-label', `${title}: ${label}`);
            button.disabled = select.matches(':disabled');
            for (const attribute of ['aria-invalid', 'aria-describedby']) {
                const value = select.getAttribute(attribute);
                if (value) button.setAttribute(attribute, value);
                else button.removeAttribute(attribute);
            }
            button.classList.toggle('mf-input-invalid', select.classList.contains('mf-input-invalid'));
            wrapper.classList.toggle('mf-smart-placeholder', !select.value);
        }
        const instance = app.smartSelect.create({
            el: wrapper, openIn: 'sheet', routableModals: false,
            setValueText: false, closeOnSelect: true, sheetBackdrop: true,
            sheetSwipeToClose: false, closeByBackdropClick: true,
            searchbar: false, cssClass: 'mf-smart-sheet',
            renderItem(item) {
                if (item.value === '' && select.name) return '';
                const option = [...select.options].find(option => option.value === item.value);
                const glyph = option?.dataset.optionIcon || (item.value === 'income' ? 'arrow_up' : item.value === 'expense' ? 'arrow_down' : 'tag');
                return `<li class="${item.disabled ? 'disabled' : ''}"><label class="item-content item-radio"><input type="radio" name="${esc(item.inputName)}" value="${esc(item.value)}" ${item.selected ? 'checked' : ''} ${item.disabled ? 'disabled' : ''}><span class="mf-smart-option-icon" style="--option-color:${safeColor(option?.dataset.optionColor || (item.value === 'income' ? '#05944A' : item.value === 'expense' ? '#E92B3B' : '#1564ff'))}">${icon(['arrow_up', 'arrow_down'].includes(glyph) ? glyph : safeIcon(glyph))}</span><div class="item-inner"><div class="item-title">${esc(item.text)}</div><span class="mf-smart-check" aria-hidden="true">${icon('checkmark')}</span></div></label></li>`;
            },
            renderSheet(items) {
                const searchable = select.name === 'category_id' || select.hasAttribute('data-history-category');
                this.params.searchbar = searchable ? { disableButton: false, backdrop: false, searchIn: '.item-title', notFoundEl: `#${sheetId} .searchbar-not-found` } : false;
                return `<div id="${sheetId}" class="sheet-modal smart-select-sheet mf-smart-sheet" role="dialog" aria-modal="true" aria-labelledby="${sheetId}-title"><div class="mf-smart-grip" aria-hidden="true"></div><header class="mf-smart-heading"><h2 id="${sheetId}-title">${esc(title)}</h2><button type="button" class="sheet-close icon-button" aria-label="Fechar seleção">${icon('xmark')}</button></header>${searchable ? `<form class="searchbar mf-smart-search" role="search"><div class="searchbar-inner"><div class="searchbar-input-wrap"><input type="search" placeholder="Buscar categoria" aria-label="Buscar categoria" autocomplete="off"><i class="searchbar-icon"></i><span class="input-clear-button"></span></div></div></form>` : ''}<div class="sheet-modal-inner"><div class="page-content"><div class="list smart-select-list-${this.id}"><ul>${this.renderItems(items)}</ul></div><p class="searchbar-not-found" role="status">Nenhuma categoria encontrada.</p></div></div></div>`;
            },
            on: {
                beforeOpen(_ss, prevent) { sync(); if (button.disabled) prevent(); },
                open(ss) {
                    button.setAttribute('aria-expanded', 'true');
                    document.addEventListener('keydown', onSheetKeydown, true);
                },
                opened(ss) { ss.$containerEl[0].querySelector('input:checked:not(:disabled), .sheet-close')?.focus({ preventScroll: true }); },
                close() { document.removeEventListener('keydown', onSheetKeydown, true); },
                closed() {
                    document.getElementById(sheetId)?.remove();
                    button.setAttribute('aria-expanded', 'false');
                    if (!destroyed && button.isConnected && !button.disabled) button.focus({ preventScroll: true });
                },
            },
        });
        const control = { app, instance };
        controls.add(control);
        function onSheetKeydown(event) {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); instance.close(); }
            if (event.key !== 'Tab') return;
            const elements = [...instance.$containerEl[0].querySelectorAll('button:not(:disabled), input:not(:disabled)')].filter(el => el.getClientRects().length);
            const radios = elements.filter(el => el.type === 'radio');
            const tabbableRadio = radios.find(el => el.checked) || radios[0];
            const focusable = elements.filter(el => el.type !== 'radio' || el === tabbableRadio);
            const first = focusable[0], last = focusable.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
        function onChange() { sync(); select.dispatchEvent(new Event('input', { bubbles: true })); }
        function onFocus() { if (!button.disabled) button.focus(); }
        // Avoid label activation opening the platform picker after the sheet opens.
        function onClick(event) { event.preventDefault(); }
        wrapper.addEventListener('click', onClick);
        select.addEventListener('change', onChange);
        select.addEventListener('focus', onFocus);
        const observer = new MutationObserver(sync);
        observer.observe(select, { attributes: true, childList: true, subtree: true, characterData: true });
        const fieldset = select.closest('fieldset');
        if (fieldset) observer.observe(fieldset, { attributes: true, attributeFilter: ['disabled'] });
        sync();
        return () => {
            destroyed = true;
            controls.delete(control);
            document.removeEventListener('keydown', onSheetKeydown, true);
            observer.disconnect();
            select.removeEventListener('change', onChange);
            select.removeEventListener('focus', onFocus);
            wrapper.removeEventListener('click', onClick);
            const modal = instance.modal;
            const modalElement = modal?.el;
            if (instance.opened) modal?.close(false);
            modal?.destroy();
            modalElement?.remove();
            instance.destroy();
            select.classList.remove('mf-smart-native');
            if (oldTabindex === null) select.removeAttribute('tabindex');
            else select.setAttribute('tabindex', oldTabindex);
            wrapper.replaceWith(select);
        };
    });
    return { destroy() { for (const dispose of disposers.splice(0)) dispose(); } };
}
