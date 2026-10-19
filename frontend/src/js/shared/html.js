export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

export const icon = name => `<i class="f7-icons" aria-hidden="true">${escapeHtml(name)}</i>`;
