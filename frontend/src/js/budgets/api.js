import { apiRequest, prepareCsrf } from '../api.js';

export function listBudgets(month, page = 1) {
    const [year, number] = month.split('-').map(Number);
    return apiRequest(`/budgets?${new URLSearchParams({ year, month: number, page, per_page: 25 })}`);
}
export const getBudget = id => apiRequest(`/budgets/${encodeURIComponent(id)}`);
export async function saveBudget(id, data) {
    await prepareCsrf();
    return apiRequest(id ? `/budgets/${id}` : '/budgets', { method: id ? 'PATCH' : 'POST', data });
}
export async function removeBudget(id) {
    await prepareCsrf();
    return apiRequest(`/budgets/${id}`, { method: 'DELETE' });
}
export function budgetError(error) {
    if (error.status === 419) return 'A sessão de segurança expirou. Tente novamente.';
    if (error.status === 422) return 'Confira os campos indicados para continuar.';
    if (error.status === 404) return 'Este orçamento não está mais disponível. Atualize a lista.';
    if (error.status === 429) return 'Aguarde um instante antes de tentar novamente.';
    if (error.status >= 500) return 'Não foi possível concluir agora. Tente novamente em instantes.';
    return 'Não foi possível confirmar a operação. Confira sua conexão e atualize a lista antes de tentar novamente.';
}

export async function copyBudget(source, destination) {
    await prepareCsrf();
    const [source_year, source_month] = source.split('-').map(Number);
    return apiRequest('/budgets/copy', { method: 'POST', data: { source_year, source_month, ...destination } });
}
