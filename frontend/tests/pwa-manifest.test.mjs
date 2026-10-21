import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const publicRoot = new URL('../public/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.webmanifest', publicRoot), 'utf8'));

test('manifest mantém identidade estável, BRL pessoal e abertura standalone na mesma origem', () => {
    assert.equal(manifest.id, '/');
    assert.equal(manifest.start_url, '/');
    assert.equal(manifest.scope, '/');
    assert.equal(manifest.name, 'Minhas Finanças');
    assert.equal(manifest.lang, 'pt-BR');
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.prefer_related_applications, false);
});

test('ícones do manifest existem e possuem as dimensões PNG declaradas', () => {
    for (const size of ['192x192', '512x512']) assert.ok(manifest.icons.some(icon => icon.sizes === size && icon.purpose === 'any'));
    assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
    for (const icon of manifest.icons) {
        assert.match(icon.src, /^\/icons\/[a-z0-9-]+\.png$/);
        assert.equal(icon.type, 'image/png');
        const png = readFileSync(new URL(icon.src.slice(1), publicRoot));
        assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
        assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
    }
    const apple = readFileSync(new URL('icons/apple-touch-icon.png', publicRoot));
    assert.equal(apple.readUInt32BE(16), 180);
    assert.equal(apple.readUInt32BE(20), 180);
});
