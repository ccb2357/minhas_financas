import { apiRequest } from '../api.js';

export function getDashboard(month) {
    const [year, number] = month.split('-').map(Number);
    return apiRequest(`/dashboard?${new URLSearchParams({ year, month: number })}`);
}
