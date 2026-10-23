import { escapeHtml as esc } from './html.js';

export function pageHeader(title, subtitle) {
    return `<header class="finance-header page-hero"><div class="page-hero-copy"><h1 tabindex="-1">${esc(title)}</h1><p>${esc(subtitle)}</p></div><svg class="page-hero-art" viewBox="0 0 100 76" aria-hidden="true" focusable="false"><rect x="30" y="30" width="15" height="29" rx="5" fill="currentColor" opacity=".2"/><rect x="51" y="18" width="15" height="41" rx="5" fill="currentColor" opacity=".4"/><rect x="72" y="5" width="15" height="54" rx="5" fill="currentColor" opacity=".7"/><path d="M6 66C30 43 48 85 94 57" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".6"/></svg><svg class="page-hero-wave" viewBox="0 0 600 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 90C150 120 200 0 350 45S500 100 600 55V100H0Z" fill="currentColor"/></svg></header>`;
}
