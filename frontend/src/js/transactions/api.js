import { apiRequest, prepareCsrf } from '../api.js';
import { listCategories } from '../categories/api.js';

export function listTransactions({ month, type = '', category = '', search = '', page = 1, unbudgeted = false, range = 'month' }) {
    const [year, number] = month.split('-').map(Number);
    const query = new URLSearchParams({ year, month: number, page: String(page), per_page: '25' });
    if (unbudgeted) query.set('unbudgeted', '1');
    if (range !== 'month') query.set('range', range);
    if (type) query.set('type', type);
    if (category) query.set('category_id', category);
    if (search.trim()) query.set('search', search.trim());
    return apiRequest(`/transactions?${query}`);
}

export const getTransaction = id => apiRequest(`/transactions/${id}`);

export async function saveTransaction(id, data) {
    await prepareCsrf();
    return apiRequest(id ? `/transactions/${id}` : '/transactions', { method: id ? 'PATCH' : 'POST', data });
}

export async function deleteTransaction(id) {
    await prepareCsrf();
    return apiRequest(`/transactions/${id}`, { method: 'DELETE' });
}

export async function categoryOptions(status = 'active', cancelled = () => false) {
    const rows = [];
    let page = 1;
    while (!cancelled()) {
        const response = await listCategories({ status, page });
        if (cancelled()) return [];
        rows.push(...response.data);
        if (page >= response.meta.last_page) return rows;
        page++;
    }
    return [];
}

export function transactionError(error) {
    if (error.status === 409) return 'Esta operação já foi processada. Feche o formulário e atualize a sincronização.';
    if (error.status === 419) return 'A sessão de segurança expirou. Tente novamente.';
    if (error.status === 422) return 'Confira os campos indicados para continuar.';
    if (error.status === 404) return 'Este lançamento não está mais disponível. Atualize o Histórico.';
    if (error.status === 429) return 'Aguarde um instante antes de tentar novamente.';
    if (error.status >= 500) return 'Não foi possível concluir agora. Tente novamente em instantes.';
    return 'Não foi possível confirmar a operação. Confira sua conexão e o Histórico antes de tentar novamente.';
}
