import test from 'node:test';
import assert from 'node:assert/strict';
import IMask from 'imask';
import { maskPresets, normalizeMoneyText, formatMoneyDigits } from '../src/js/shared/masks.js';

test('dois últimos dígitos são sempre centavos, com ponto de milhar', () => {
    for (const [input, display] of [
        ['6584', '65,84'], ['658', '6,58'], ['68528', '685,28'],
        ['1', '0,01'], ['12', '0,12'], ['123456', '1.234,56'], ['685288', '6.852,88'], ['6852884', '68.528,84'],
        ['99999999999', '999.999.999,99'], ['0001', '0,01'],
    ]) {
        assert.equal(formatMoneyDigits(normalizeMoneyText(input)), display, input);
    }
    assert.equal(formatMoneyDigits(''), '');
});

test('colagem preserva centavos e aceita milhares e rejeita sinais, texto e excesso', () => {
    assert.equal(normalizeMoneyText('R$ 65,84'), '6584');
    assert.equal(normalizeMoneyText('68.528,84'), '6852884');
    for (const input of ['-39,99', 'abc', '1,234', '12.34,56', '100000000000', '']) {
        assert.equal(normalizeMoneyText(input), null, input);
    }
});

test('IMask aceita estados intermediários e limita os dígitos monetários', () => {
    const mask = IMask.createMask(maskPresets.moedaBRL());
    for (const value of ['', '0', '0,01', '1234,56', '999.999.999,99']) {
        mask.value = value;
        assert.equal(mask.value, value);
    }
    mask.value = '999.999.999,99';
    mask.append('9');
    assert.equal(mask.value, '999.999.999,99');
});
