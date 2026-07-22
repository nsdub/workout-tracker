# protocol-rest-push

The rest-timer alarm. The phone arms it when a rest starts; a Durable Object
alarm fires at the deadline and sends a Web Push — so the bell arrives even
if the phone is locked, pocketed, or the page has been evicted from memory.

Dependency-free: RFC 8291 (aes128gcm payload encryption), RFC 8188 (header
layout) and RFC 8292 (VAPID) are implemented directly on WebCrypto in
`src/webpush.mjs`, which runs unchanged in Workers and in node.

## Deploy (one time, ~2 minutes)

```sh
cd push-worker
npx wrangler login        # opens a browser; free account is enough
./scripts/deploy.sh
```

`deploy.sh` generates the VAPID pair if needed (`vapid.json`, gitignored,
mode 600), runs the crypto tests, uploads the private key as a Worker secret,
deploys, and prints the worker URL.

Then, in the app: **Mission → Systems console → Rest alerts** → paste the URL
→ *Save & turn on*. Chrome asks for notification permission once. Done.

**Never regenerate `vapid.json`** — the phone's existing subscription is bound
to that key pair and would silently stop receiving pushes.

## How it behaves

| Event | What happens |
| --- | --- |
| Rest starts | `POST /arm` with `{subscription, deadline, label}`; DO alarm set to the deadline |
| Set logged / Skip / new rest / night finished | `POST /disarm`; alarm and stored state deleted |
| Deadline reached | `alarm()` encrypts + sends the push; the SW `push` handler shows it |
| Re-arm before the deadline | `setAlarm` overwrites — stale bells can never queue up |
| Push service says 404/410 | Subscription is dead; nothing retried, nothing logged |

The app arms at rest **start**, not at backgrounding: a page can be killed
before any `visibilitychange` fires. `/arm` and `/disarm` are fire-and-forget
with `keepalive` — a gym dead spot never delays the lifter, because the
in-page timer, wake lock and repeating bell are still the primary path. Push
is the belt on top of those braces.

## Safety rails

- Only `https://nsdub.github.io` (and localhost dev) may call it — CORS
  allowlist, enforced server-side too.
- Endpoints must be real push services (`googleapis.com`, `mozilla.com`,
  `mozaws.net`, `windows.com`, `apple.com`), so this can't be turned into an
  open POST relay.
- Deadlines must be 1 s – 30 min out; anything else is rejected.
- One DO per subscription, keyed by endpoint; state is a single record.
- The private VAPID key exists only as a Worker secret and in the gitignored
  `vapid.json`. `.dev.vars` (local dev only) is gitignored too.

## Tests

```sh
node test.mjs
```

Pins the encryption against RFC 8291 Appendix A's published test vector —
same keys, same salt, byte-identical ciphertext — plus the RFC 8188 header
layout and per-message key/salt freshness. Verified additionally against the
live FCM endpoint: a push signed by these keys returns `410` for a retired
subscription (i.e. Google accepted the VAPID auth and payload format) rather
than `401`/`403`.

## Cost

Free tier: 100k Worker requests/day and the free Durable Objects allocation.
A heavy training day is a few dozen requests.
