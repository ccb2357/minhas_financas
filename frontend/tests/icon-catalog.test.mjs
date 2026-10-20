import test from 'node:test';
import assert from 'node:assert/strict';
import { ICON_CATALOG, filterIcons, iconLabel } from '../src/js/categories/icon-catalog.js';
import { safeIcon } from '../src/js/categories/catalog.js';

test('busca usa português, sinônimos e ignora acentos e caixa', () => {
    for (const [query,id] of [[' SUPERMERCADO ','cart'],['ACOES','arrow_up_right'],['Poupanca','archivebox'],['CDB','chart_bar_square'],['dividendos','chart_bar'],['pix','arrow_2_squarepath']]) {
        assert.ok(filterIcons(query).some(item=>item.id===id),query);
    }
    assert.deepEqual(filterIcons('AÇÕES').map(item=>item.id),['arrow_up_right']);
    assert.ok(filterIcons('renda fixa','investment').some(item=>item.id==='chart_bar_square'));
    assert.equal(filterIcons('<img src=x onerror=alert(1)>').length,0);
});
test('filtros se combinam com a busca e não alteram a escolha', () => {
    assert.ok(filterIcons('salário','income').length>0);
    assert.equal(filterIcons('salário','expense').length,0);
    assert.ok(filterIcons('','investment').every(item=>item.groups.includes('investment')));
    assert.equal(filterIcons('zzzzzz').length,0);
    assert.equal(iconLabel('building_columns'),'Banco');
});
test('catálogo tem ids únicos e preserva os ícones já salvos', () => {
    assert.equal(new Set(ICON_CATALOG.map(item=>item.id)).size,ICON_CATALOG.length);
    for (const id of ['cart','car_fill','house','heart','film','book','bag','gift','briefcase','money_dollar_circle','creditcard','airplane','paw','phone','wifi','bolt','sportscourt','wrench','tag','ellipsis_circle']) assert.equal(safeIcon(id),id);
    assert.equal(safeIcon('<svg onload=alert(1)>'),'tag');
    assert.equal(safeIcon('icone_inexistente'),'tag');
});
