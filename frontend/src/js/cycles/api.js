import { apiRequest, prepareCsrf } from '../api.js';
export const getCycleConfiguration = month => {
    if (!month) return apiRequest('/financial-cycle');
    const [year, number] = month.split('-').map(Number);
    return apiRequest(`/financial-cycle?${new URLSearchParams({ year, month: number })}`);
};
export async function saveCycleConfiguration(cutDay, version) {
    await prepareCsrf();
    return apiRequest('/financial-cycle', { method: 'PUT', data: { cut_day: cutDay, version } });
}
