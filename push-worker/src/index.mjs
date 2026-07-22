// Protocol rest-timer push worker.
//
// The phone POSTs /arm at the start of a rest with its push subscription and
// the deadline; a Durable Object alarm fires at that exact moment and sends a
// Web Push, so a pocketed, locked, or memory-killed phone still gets the
// bell. /disarm cancels when the set is logged early or Skip is tapped.
//
// One DO per subscription (id derived from the endpoint), so a rest re-arm
// simply overwrites the pending alarm — a lifter can never accumulate a queue
// of stale bells. State is a single record: {subscription, deadline, label}.
import { sendPush } from './webpush.mjs';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// The app is served from GitHub Pages; only that origin may arm this worker.
const ALLOWED = new Set([
  'https://nsdub.github.io',
  'http://localhost:8409', // local dev server (scripts/serve.py)
  'http://127.0.0.1:8409',
]);

function cors(origin) {
  const allow = origin && ALLOWED.has(origin) ? origin : 'https://nsdub.github.io';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const json = (obj, status, origin) =>
  new Response(JSON.stringify(obj), { status, headers: { ...JSON_HEADERS, ...cors(origin) } });

// Only real push endpoints, so this worker can't be used to POST anywhere.
const PUSH_HOSTS = /(^|\.)(googleapis\.com|mozilla\.com|mozaws\.net|windows\.com|apple\.com)$/;

function validSubscription(sub) {
  if (!sub || typeof sub.endpoint !== 'string') return false;
  let u;
  try { u = new URL(sub.endpoint); } catch { return false; }
  if (u.protocol !== 'https:' || !PUSH_HOSTS.test(u.hostname)) return false;
  return typeof sub.keys?.p256dh === 'string' && typeof sub.keys?.auth === 'string';
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    const url = new URL(request.url);

    if (url.pathname === '/health') return json({ ok: true, service: 'protocol-rest-push' }, 200, origin);

    if (request.method !== 'POST') return json({ error: 'POST only' }, 405, origin);
    if (origin && !ALLOWED.has(origin)) return json({ error: 'origin not allowed' }, 403, origin);

    let payload;
    try { payload = await request.json(); } catch { return json({ error: 'bad json' }, 400, origin); }
    if (!validSubscription(payload.subscription)) return json({ error: 'bad subscription' }, 400, origin);

    const id = env.RESTS.idFromName(payload.subscription.endpoint);
    const stub = env.RESTS.get(id);

    if (url.pathname === '/arm') {
      const ms = Number(payload.deadline) - Date.now();
      // Sane bounds: a rest is seconds-to-minutes. Anything else is a bug or
      // an abuse attempt, and a far-future alarm would be a landmine.
      if (!(ms > 1000 && ms < 30 * 60 * 1000)) return json({ error: 'deadline out of range' }, 400, origin);
      await stub.fetch('https://do/arm', { method: 'POST', body: JSON.stringify(payload) });
      return json({ ok: true, firesInMs: ms }, 200, origin);
    }

    if (url.pathname === '/disarm') {
      await stub.fetch('https://do/disarm', { method: 'POST' });
      return json({ ok: true }, 200, origin);
    }

    return json({ error: 'not found' }, 404, origin);
  },
};

export class RestAlarm {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/arm') {
      const { subscription, deadline, label } = await request.json();
      await this.state.storage.put('rest', { subscription, deadline, label: label ?? null });
      // setAlarm overwrites any pending alarm — exactly the re-arm semantics
      // a new rest needs.
      await this.state.storage.setAlarm(Number(deadline));
      return new Response('ok');
    }
    if (path === '/disarm') {
      await this.state.storage.deleteAlarm();
      await this.state.storage.delete('rest');
      return new Response('ok');
    }
    return new Response('not found', { status: 404 });
  }

  async alarm() {
    const rest = await this.state.storage.get('rest');
    await this.state.storage.delete('rest'); // one bell per arm, whatever happens next
    if (!rest) return;
    // A misconfigured deploy must log a clear cause, not throw an opaque
    // SyntaxError out of the alarm handler.
    let vapid;
    try {
      vapid = {
        subject: this.env.VAPID_SUBJECT,
        publicKey: this.env.VAPID_PUBLIC_KEY,
        privateJwk: JSON.parse(this.env.VAPID_PRIVATE_JWK ?? 'null'),
      };
      if (!vapid.privateJwk || !vapid.publicKey) throw new Error('VAPID keys missing');
    } catch (err) {
      console.log(`push not configured: ${err?.message ?? err} — run scripts/deploy.sh`);
      return;
    }
    try {
      const res = await sendPush(rest.subscription, {
        title: 'Rest’s up 💪',
        body: `${rest.label || 'Back to it'} — time for your next set.`,
        tag: 'p3-rest-done',
      }, vapid, 60);
      // 404/410 = the browser dropped this subscription; nothing to retry.
      if (!res.ok && res.status !== 404 && res.status !== 410) {
        console.log(`push failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
    } catch (err) {
      console.log(`push threw: ${err?.message ?? err}`);
    }
  }
}
