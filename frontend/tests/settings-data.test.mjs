import test from 'node:test';
import assert from 'node:assert/strict';
import { emailChanged, profilePayload, validPasswordLength, validPasswordBytes } from '../src/js/settings/data.js';

test('e-mail normalizado mantém a senha atual fora do payload quando não há troca', () => {
    assert.equal(emailChanged(' MEU@EXAMPLE.COM ', 'meu@example.com'), false);
    assert.deepEqual(profilePayload(' Christopher ', ' MEU@EXAMPLE.COM ', 'segredo', 'meu@example.com'), { name: 'Christopher', email: 'meu@example.com' });
    assert.deepEqual(profilePayload(' Nome ', ' NOVO@EXAMPLE.COM ', ' senha com espaços ', 'meu@example.com'), { name: 'Nome', email: 'novo@example.com', current_password: ' senha com espaços ' });
});

test('mínimo de senha conta caracteres Unicode como o backend', () => {
    assert.equal(validPasswordLength('a'.repeat(11)), false);
    assert.equal(validPasswordLength('a'.repeat(12)), true);
    assert.equal(validPasswordLength('😀'.repeat(6)), false);
    assert.equal(validPasswordLength('😀'.repeat(12)), true);
});

test('limite de bcrypt usa bytes e rejeita caractere nulo', () => {
    assert.equal(validPasswordBytes('a'.repeat(72)), true);
    assert.equal(validPasswordBytes('a'.repeat(73)), false);
    assert.equal(validPasswordBytes('á'.repeat(36)), true);
    assert.equal(validPasswordBytes('á'.repeat(37)), false);
    assert.equal(validPasswordBytes('😀'.repeat(18)), true);
    assert.equal(validPasswordBytes('😀'.repeat(19)), false);
    assert.equal(validPasswordBytes('senha longa\0invalida'), false);
});
