#!/usr/bin/env node
// Generates the VAPID key pair, once. Writes push-worker/vapid.json
// (gitignored — it holds the private key). Refuses to overwrite: regenerating
// would invalidate every existing push subscription on the phone.
import { writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(dirname(fileURLToPath(import.meta.url))), 'vapid.json');
if (existsSync(out)) {
  console.error(`${out} already exists — refusing to overwrite (regenerating breaks the phone's existing subscription).`);
  process.exit(1);
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const publicKey = b64url(await crypto.subtle.exportKey('raw', pair.publicKey)); // 65-byte point
const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);

writeFileSync(out, JSON.stringify({ publicKey, privateJwk }, null, 2) + '\n', { mode: 0o600 });
console.log(`VAPID pair written to ${out}`);
console.log(`\nPublic key (goes in the app, safe to commit):\n${publicKey}\n`);
