#!/usr/bin/env node
// Proves the hand-rolled Web Push crypto against RFC 8291 Appendix A's
// published test vector. If this passes, a real push service will decrypt
// what we send; if it fails, no amount of "it deployed fine" means anything.
import assert from 'node:assert/strict';
import { encryptPayload, b64url } from './src/webpush.mjs';

let n = 0;
const ok = async (name, fn) => { await fn(); n++; console.log(`  ✓ ${name}`); };

// ——— RFC 8291 A. Push Message Encryption Example ———
const V = {
  plaintext: 'When I grow up, I want to be a watermelon',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  uaPublic: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  asPublic: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  ciphertext: '8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ',
};

// Rebuild the RFC's sender key pair as a CryptoKey pair (JWK carries d + the
// public point, so both halves come from the vector, nothing generated).
async function senderKeys() {
  const pub = b64url.decode(V.asPublic);
  const jwk = {
    kty: 'EC', crv: 'P-256',
    x: b64url.encode(pub.slice(1, 33)),
    y: b64url.encode(pub.slice(33, 65)),
    d: V.asPrivate,
    ext: true,
  };
  const privateKey = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const publicKey = await crypto.subtle.importKey('raw', pub, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
  return { privateKey, publicKey };
}

await ok('RFC 8291 A: ciphertext matches the published vector byte for byte', async () => {
  const { ciphertext } = await encryptPayload(
    V.plaintext, V.uaPublic, V.auth, await senderKeys(), b64url.decode(V.salt),
  );
  assert.equal(b64url.encode(ciphertext), V.ciphertext);
});

await ok('RFC 8188 header: salt || rs=4096 || idlen=65 || as_public precedes the ciphertext', async () => {
  const { body, ciphertext } = await encryptPayload(
    V.plaintext, V.uaPublic, V.auth, await senderKeys(), b64url.decode(V.salt),
  );
  assert.deepEqual(body.slice(0, 16), b64url.decode(V.salt));
  assert.deepEqual([...body.slice(16, 20)], [0, 0, 16, 0]); // rs = 4096, big-endian
  assert.equal(body[20], 65);
  assert.deepEqual(body.slice(21, 86), b64url.decode(V.asPublic));
  assert.deepEqual(body.slice(86), ciphertext);
  assert.equal(body.length, 86 + ciphertext.length);
});

await ok('a fresh call uses a random ephemeral key + salt (never repeats a nonce)', async () => {
  const a = await encryptPayload('rest', V.uaPublic, V.auth);
  const b = await encryptPayload('rest', V.uaPublic, V.auth);
  assert.notDeepEqual(a.body.slice(0, 16), b.body.slice(0, 16), 'salt must differ');
  assert.notDeepEqual(a.body.slice(21, 86), b.body.slice(21, 86), 'ephemeral key must differ');
  assert.notDeepEqual(a.ciphertext, b.ciphertext);
});

await ok('base64url round-trips without padding, +/ mapped to -_', () => {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  const s = b64url.encode(bytes);
  assert.ok(!/[+/=]/.test(s));
  assert.deepEqual(b64url.decode(s), bytes);
});

console.log(`\n${n} push-crypto tests passed`);
