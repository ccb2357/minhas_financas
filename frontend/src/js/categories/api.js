import { apiRequest, prepareCsrf } from '../api.js';

export function listCategories({ type = '', status = 'active', page = 1 } = {}) {
    const query = new URLSearchParams({ status, page: String(page), per_page: '100' });
    if (type) query.set('type', type);
    return apiRequest(`/categories?${query}`);
}

export async function saveCategory(id, data) {
    await prepareCsrf();
    return apiRequest(id ? `/categories/${id}` : '/categories', {
        method: id ? 'PATCH' : 'POST', data,
    });
}

export async function deactivateCategory(id) {
    await prepareCsrf();
    return apiRequest(`/categories/${id}`, { method: 'DELETE' });
}
