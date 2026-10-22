import test from 'node:test';
import assert from 'node:assert/strict';
import { listTransactions } from '../src/js/transactions/api.js';

test('histórico envia os 12 meses sem zero à esquerda e preserva os filtros', async () => {
    const originalFetch = globalThis.fetch;
    const requests = [];
    globalThis.fetch = async (url, options) => {
        requests.push({ url: new URL(url, 'https://example.test'), options });
        return new Response(JSON.stringify({ data: [], meta: { total: 0 } }), { status: 200 });
    };
    try {
        for (const year of [2025, 2026, 2027]) {
            for (let month = 1; month <= 12; month++) {
                await listTransactions({
                    month: `${year}-${String(month).padStart(2, '0')}`,
                    type: 'income', category: '12', search: '  Salário & bônus  ', page: 2,
                });
                const { url, options } = requests.at(-1);
                assert.equal(url.pathname, '/api/v1/transactions');
                assert.equal(url.searchParams.get('year'), String(year));
                assert.equal(url.searchParams.get('month'), String(month));
                assert.equal(url.searchParams.get('type'), 'income');
                assert.equal(url.searchParams.get('category_id'), '12');
                assert.equal(url.searchParams.get('search'), 'Salário & bônus');
                assert.equal(url.searchParams.get('page'), '2');
                assert.equal(url.searchParams.get('per_page'), '25');
                assert.equal(options.credentials, 'same-origin');
            }
        }
        await listTransactions({ month: '2026-07' });
        const query = requests.at(-1).url.searchParams;
        assert.equal(query.get('month'), '7');
        assert.equal(query.get('page'), '1');
        for (const optional of ['type', 'category_id', 'search']) assert.equal(query.has(optional), false);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
