import { apiRequest } from '../api.js';

export function getReport(month, range) {
    const [year, number] = month.split('-').map(Number);
    return apiRequest(`/reports?${new URLSearchParams({ year, month: number, range })}`);
}
