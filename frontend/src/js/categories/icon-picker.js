import { escapeHtml as esc, icon } from '../shared/html.js';
import { safeIcon } from './catalog.js';
import { filterIcons, iconLabel } from './icon-catalog.js';

const active = new Set();
let sequence = 0;
export function closeActiveIconPicker(app) {
    const entry = [...active].find(entry => entry.app === app);
    if (!entry) return false;
    entry.close(); return true;
}

export function openIconPicker(app, { value, onSelect, onClosed, animate } = {}) {
    const id = `category-icon-picker-${++sequence}`;
    let draft = safeIcon(value), query = '', searchbar, closed = false;
    const events = new AbortController();
    const viewport = window.visualViewport;
    const initialHeight = viewport?.height || window.innerHeight;
    const modal = app.sheet.create({
        ...(typeof animate === 'boolean' ? { animate } : {}),
        backdrop: true, backdropUnique: true, closeByBackdropClick: true,
        closeByOutsideClick: false, swipeToClose: false,
        content: `<section class="sheet-modal category-icon-sheet" role="dialog" aria-modal="true" aria-labelledby="${id}-title"><div class="icon-picker-grip" aria-hidden="true"></div><div class="icon-picker-head"><header class="icon-picker-heading"><div><h2 id="${id}-title">Escolher ícone</h2></div><button type="button" class="icon-button" data-icon-close aria-label="Fechar escolha de ícone">${icon('xmark')}</button></header><form class="searchbar icon-picker-search" role="search"><div class="searchbar-inner"><div class="searchbar-input-wrap"><input type="search" placeholder="Buscar por nome ou palavra-chave" aria-label="Buscar ícone por nome ou palavra-chave" autocomplete="off" maxlength="100"><i class="searchbar-icon"></i><span class="input-clear-button"></span></div></div></form></div><div class="icon-picker-scroll"><div class="icon-picker-grid" role="group" aria-label="Ícones disponíveis"></div><div class="icon-picker-empty" role="status" hidden>${icon('search')}<h3>Nenhum ícone encontrado</h3><p>Tente outro nome ou palavra-chave.</p><button type="button" data-icon-clear>Limpar busca</button></div><span class="sr-only" data-icon-count role="status" aria-live="polite"></span></div><footer class="icon-picker-footer"><div class="icon-picker-selection"><span data-icon-preview aria-hidden="true"></span><span>Selecionado: <strong data-icon-label></strong></span></div><button type="button" class="mf-button mf-button-primary" data-icon-apply>Usar este ícone</button></footer></section>`,
        on: {
            open() {
                resize();
                searchbar = app.searchbar.create({
                    el: modal.el.querySelector('.searchbar'), customSearch: true,
                    backdrop: false, disableButton: false,
                    on: { search(_bar, value) { query = value; render(); } },
                });
                modal.el.addEventListener('click', click, { signal: events.signal });
                modal.el.querySelector('form').addEventListener('submit', event => event.preventDefault(), { signal: events.signal });
                document.addEventListener('keydown', keydown, true);
                viewport?.addEventListener('resize', resize); viewport?.addEventListener('scroll', resize);
                window.addEventListener('resize', resize);
                render();
            },
            opened() { if (!closed) modal.el.querySelector('[data-icon-close]').focus({ preventScroll:true }); },
            closed: finish,
        },
    });
    const entry = {
        app,
        close() { if (!closed) modal.close(); },
        destroy() { if (!closed) { modal.close(false); finish(); } },
    };
    function resize() {
        if (closed) return;
        const height = viewport?.height || window.innerHeight;
        modal.el.style.setProperty('--icon-picker-height', `${Math.round(height * .65)}px`);
        modal.el.style.setProperty('--icon-picker-bottom', `${Math.max(0, window.innerHeight - height - (viewport?.offsetTop || 0))}px`);
        modal.el.classList.toggle('icon-picker-compact', height < 500 || height < initialHeight * .8);
    }
    function render() {
        if (closed) return;
        const rows = filterIcons(query), root = modal.el;
        root.querySelector('.icon-picker-grid').innerHTML = rows.map(item => `<button type="button" class="icon-picker-option ${item.label.length > 11 ? 'icon-picker-long' : ''}" data-icon-choice="${item.id}" aria-label="${esc(item.label)}" aria-pressed="${item.id === draft}">${icon(item.id)}<span>${esc(item.label)}</span><span class="icon-picker-check" aria-hidden="true">${icon('checkmark')}</span></button>`).join('');
        root.querySelector('.icon-picker-empty').hidden = rows.length > 0;
        root.querySelector('[data-icon-count]').textContent = `${rows.length} ${rows.length === 1 ? 'ícone disponível' : 'ícones disponíveis'}`;
        root.querySelector('[data-icon-preview]').innerHTML = icon(draft);
        root.querySelector('[data-icon-label]').textContent = iconLabel(draft);
    }
    function click(event) {
        const button = event.target.closest('button'); if (!button) return;
        if (button.hasAttribute('data-icon-close')) entry.close();
        else if (button.hasAttribute('data-icon-choice')) {
            draft = safeIcon(button.dataset.iconChoice); render();
            modal.el.querySelector(`[data-icon-choice="${draft}"]`)?.focus({ preventScroll:true });
        } else if (button.hasAttribute('data-icon-clear')) searchbar.search('');
        else if (button.hasAttribute('data-icon-apply')) { onSelect?.(draft); entry.close(); }
    }
    function keydown(event) {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); entry.close(); return; }
        if (event.key !== 'Tab') return;
        const items = [...modal.el.querySelectorAll('button:not(:disabled), input:not(:disabled)')].filter(el => el.getClientRects().length);
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    function finish() {
        if (closed) return;
        closed = true; active.delete(entry); events.abort(); searchbar?.destroy();
        document.removeEventListener('keydown', keydown, true);
        viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', resize); window.removeEventListener('resize', resize);
        const element = modal.el, backdrop = modal.backdropEl;
        element.remove(); backdrop?.remove();
        queueMicrotask(() => modal.destroy());
        onClosed?.();
    }
    active.add(entry); modal.open(); return entry;
}
