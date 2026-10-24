import { apiRequest, prepareCsrf } from '../api.js';
export const listOperations = (page = 1) => apiRequest(`/reconciliation?${new URLSearchParams({ page, per_page: 25 })}`);
async function mutate(path, data) {
    await prepareCsrf();
    return apiRequest(path, { method: 'POST', data });
}
export const synchronize = () => mutate('/reconciliation/sync');
export const ignoreOperation = id => mutate(`/reconciliation/${encodeURIComponent(id)}/ignore`);
export const addOperation = (id, data) => mutate(`/reconciliation/${encodeURIComponent(id)}/add`, data);
export function reconciliationError(error) {
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente.';
    if ([403, 409, 422].includes(error.status)) return error.message;
    if (error.status === 419) return 'A sessão de segurança expirou. Tente novamente.';
    if (error.status === 429) return 'Aguarde um instante antes de consultar novamente.';
    return 'Não foi possível concluir a consulta. Confira sua conexão e tente novamente.';
}
