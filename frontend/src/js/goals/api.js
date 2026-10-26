import { apiRequest, prepareCsrf } from '../api.js';
export const listGoals = (status = 'active', page = 1) => apiRequest(`/goals?${new URLSearchParams({ status, page, per_page: 25 })}`);
export const getGoal = id => apiRequest(`/goals/${id}`);
export const listMovements = (id, page = 1) => apiRequest(`/goals/${id}/movements?${new URLSearchParams({ page, per_page: 25 })}`);
async function write(path, method, data) { await prepareCsrf(); return apiRequest(path, { method, data }); }
export const saveGoal = (id, data) => write(id ? `/goals/${id}` : '/goals', id ? 'PATCH' : 'POST', data);
export const changeGoalState = (goal, action) => write(`/goals/${goal.id}/state`, 'POST', { version: goal.version, action });
export const saveMovement = (goal, id, data) => write(`/goals/${goal.id}/movements${id ? `/${id}` : ''}`, id ? 'PATCH' : 'POST', { ...data, version: goal.version });
export const deleteMovement = (goal, id) => write(`/goals/${goal.id}/movements/${id}`, 'DELETE', { version: goal.version });
export function goalError(error) {
    if (error.status === 422) return Object.values(error.errors || {}).flat().join(' ') || 'Confira os campos para continuar.';
    if ([403, 409].includes(error.status)) return error.message;
    if (error.status === 404) return 'Este objetivo ou movimentação não está mais disponível. Feche e atualize a lista.';
    if (error.status === 419) return 'A sessão de segurança expirou. Atualize a página e tente novamente.';
    return 'Não foi possível confirmar a operação. Confira sua conexão e tente novamente.';
}
