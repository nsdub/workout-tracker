// Web Push, from primitives: RFC 8291 (aes128gcm message encryption),
// RFC 8188 (the header layout), RFC 8292 (VAPID). Zero dependencies —
// WebCrypto only, so the same code runs in Cloudflare Workers and in node
// (test.mjs proves the encryption against RFC 8291's Appendix A vector).

const te = new TextEncoder();

export const b64url = {
  decode(s) {
    const pad = '='.repeat((4 - (s.length % 4)) % 4);
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  },
  encode(buf) {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
};

const concat = (...arrs) => {
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
};

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8);
  return new Uint8Array(bits);
}

// ECDH public key (65-byte uncompressed point) → CryptoKey
function importEcdhPublic(raw) {
  return crypto.subtle.importKey('raw', raw, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
}

// RFC 8291 encryption. `asKeys` (the per-message sender ECDH pair) and `salt`
// are injectable ONLY so the test can pin them to the RFC vector; production
// callers omit both and get a fresh ephemeral pair + random salt per message.
export async function encryptPayload(plaintext, p256dhB64, authB64, asKeys = null, saltIn = null) {
  const uaPublicRaw = b64url.decode(p256dhB64);
  const authSecret = b64url.decode(authB64);
  const salt = saltIn ?? crypto.getRandomValues(new Uint8Array(16));

  const as = asKeys ?? await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));

  const uaPublic = await importEcdhPublic(uaPublicRaw);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaPublic }, as.privateKey, 256));

  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info" || 0x00 || ua_public || as_public, 32)
  const keyInfo = concat(te.encode('WebPush: info'), new Uint8Array([0]), uaPublicRaw, asPublicRaw);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);
  const cek = await hkdf(salt, ikm, concat(te.encode('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16);
  const nonce = await hkdf(salt, ikm, concat(te.encode('Content-Encoding: nonce'), new Uint8Array([0])), 12);

  // One record: plaintext || 0x02 (final-record delimiter), AES-128-GCM.
  const padded = concat(te.encode(plaintext), new Uint8Array([2]));
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, padded));

  // RFC 8188 body: salt(16) || rs(4) || idlen(1) || keyid(as_public) || ciphertext
  const header = concat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([asPublicRaw.length]), asPublicRaw);
  return { body: concat(header, ciphertext), ciphertext };
}

// RFC 8292: ES256 JWT, aud = push service origin, exp ≤ 24h out.
export async function vapidHeaders(endpoint, subject, publicKeyB64, privateJwk) {
  const key = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const enc = (obj) => b64url.encode(te.encode(JSON.stringify(obj)));
  const head = enc({ typ: 'JWT', alg: 'ES256' });
  const claims = enc({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  });
  const signingInput = `${head}.${claims}`;
  // WebCrypto ECDSA emits raw r||s (64 bytes) — exactly the JWS ES256 format.
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(signingInput));
  return { Authorization: `vapid t=${signingInput}.${b64url.encode(sig)}, k=${publicKeyB64}` };
}

// Encrypt + POST one push message. Returns the push service's response.
export async function sendPush(subscription, payloadObj, { subject, publicKey, privateJwk }, ttl = 60) {
  const { endpoint, keys } = subscription;
  const { body } = await encryptPayload(JSON.stringify(payloadObj), keys.p256dh, keys.auth);
  const auth = await vapidHeaders(endpoint, subject, publicKey, privateJwk);
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      ...auth,
      TTL: String(ttl),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      Urgency: 'high',
    },
    body,
  });
}
