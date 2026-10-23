import { rememberCycleResponse } from './cycles/state.js';
let pendingWrites = 0;
export const hasPendingWrites = () => pendingWrites > 0;
const API_BASE = '/api/v1';
export class ApiError extends Error {
    constructor(status, data) {
        super(data.message || 'Não foi possível concluir a solicitação.');
        this.status = status;
        this.errors = data.errors || {};
    }
}
async function readResponse(response) {
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new ApiError(response.status, data || {});
    rememberCycleResponse(data);
    return data;
}
export async function prepareCsrf() {
    return readResponse(await fetch('/sanctum/csrf-cookie', {
        credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
    }));
}
export async function apiRequest(path, { method = 'GET', data } = {}) {
    const headers = { Accept: 'application/json' };
    if (method !== 'GET') {
        const cookie = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='));
        if (!cookie) throw new Error('Sessão de segurança ausente. Atualize a página.');
        headers['X-XSRF-TOKEN'] = decodeURIComponent(cookie.substring('XSRF-TOKEN='.length));
    }
    if (data !== undefined) headers['Content-Type'] = 'application/json';
    const mutation = method !== 'GET';
    if (mutation) pendingWrites++;
    try {
        return await readResponse(await fetch(`${API_BASE}${path}`, {
            method, credentials:'same-origin', cache:'no-store', headers,
            body:data === undefined ? undefined : JSON.stringify(data),
        }));
    } finally {
        if (mutation) pendingWrites--;
    }
}
