import test from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, prepareCsrf, hasPendingWrites } from '../src/js/api.js';

const withNetwork = async action => {
    const originalFetch = globalThis.fetch;
    const originalDocument = globalThis.document;
    globalThis.document = { cookie:'XSRF-TOKEN=test-token' };
    try { await action(); }
    finally { globalThis.fetch=originalFetch; if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument; }
};

test('API e CSRF usam rede sem cache, preservando sessão e proteção CSRF', () => withNetwork(async () => {
    const requests=[];
    globalThis.fetch=async(url,options)=>{requests.push({url,options});return url.startsWith('/sanctum')?new Response(null,{status:204}):new Response(JSON.stringify({ok:true}),{status:200});};
    await prepareCsrf();await apiRequest('/me');await apiRequest('/transactions',{method:'POST',data:{amount_cents:3999}});
    assert.ok(requests.every(({options})=>options.cache==='no-store'&&options.credentials==='same-origin'));
    assert.equal(requests[2].options.headers['X-XSRF-TOKEN'],'test-token');
    assert.equal(JSON.parse(requests[2].options.body).amount_cents,3999);
}));

test('atualização consegue identificar gravações até leitura da resposta terminar', () => withNetwork(async () => {
    let finish;
    globalThis.fetch=()=>new Promise(resolve=>finish=resolve);
    const operation=apiRequest('/me',{method:'PATCH',data:{name:'Christopher'}});
    assert.equal(hasPendingWrites(),true);
    finish(new Response(JSON.stringify({id:1}),{status:200}));
    await operation;assert.equal(hasPendingWrites(),false);
}));

test('erros de validação ou rede liberam a contagem sem esconder a falha', () => withNetwork(async () => {
    globalThis.fetch=async()=>new Response(JSON.stringify({message:'Inválido',errors:{name:['Informe o nome.']}}),{status:422});
    await assert.rejects(apiRequest('/me',{method:'PATCH',data:{}}),error=>error.status===422);
    assert.equal(hasPendingWrites(),false);
    globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};
    await assert.rejects(apiRequest('/me',{method:'PATCH',data:{}}),/Failed to fetch/);
    assert.equal(hasPendingWrites(),false);
}));
