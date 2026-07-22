# Real push notifications for the rest timer — the honest option sheet

_Status update 2026-07-22 (v46): **the user's phone is a Google Pixel 8a
(Android), not an iPhone** — and on Android the no-server local path WORKS:
a hidden page keeps ~1 Hz timers alive far longer than any rest, so v46
ticks the countdown in the background and posts a real OS notification at
rest-end (opt-in "Alert me" on the first rest). Everything below about
servers is therefore only needed if (a) Chrome kills the page under memory
pressure mid-rest — rare at these durations — or (b) an iOS device ever
enters the picture. Deprioritized accordingly; kept for the facts._

_Originally written 2026-07-21 (v45) after the dead v42 "background rest
notifications" were removed._

## The physics

- An installed iOS PWA's JavaScript is **suspended within seconds** of the
  screen locking or the app backgrounding. Timers freeze. Nothing local
  fires. **Android is different**: hidden pages keep setTimeout alive at
  ~1/second (intensive throttling only after ~5 minutes hidden — longer
  than every rest in the plan), which is what v46 rides.
- The Notification Triggers API (schedule a notification for a future time,
  no server) is **dead**: WebKit never implemented it; Chromium removed it
  in 2021. v42 was built on it, which is why it never worked.
- The **only** web mechanism that can alert a locked iPhone is **Web Push**
  (iOS 16.4+, installed PWAs): the phone subscribes, and **a server** sends a
  signed HTTPS request to Apple's push service at the right moment. "At the
  right moment" is the problem — someone has to be awake at rest-end + 0s.
  GitHub Pages is static and cannot do this.

## Options

### A. Cloudflare Worker + Durable Object alarm — the real fix

Phone → `POST /arm {subscription, deadline}` at rest start → DO alarm fires
at the deadline (±1s) → Worker sends the Web Push → locked iPhone buzzes.
Logging the set early → `POST /disarm` cancels it. Free tier covers this
usage thousands of times over. Needs: a Cloudflare account, one `wrangler
deploy`, VAPID keys as Worker secrets, plus a small client patch (subscribe +
arm/disarm calls) that stays inert unless a push endpoint is configured.

- Reliability: excellent (~1–2 s of deadline). Privacy: your push
  subscription lives in the Worker, not the public repo.
- Cost: $0. Maintenance: ~none.

### B. GitHub Actions as the sender — "no new account", but honestly worse

`workflow_dispatch` at rest start; the job sleeps until the deadline and
pushes. Problems: runner pickup jitter (5–30 s typically, minutes under
load — a 60–75 s rest can be missed entirely), one public workflow run per
set (your training times become public metadata on the repo), and the push
subscription must be kept out of run inputs (public). Workable, not good.

### C. ntfy.sh + the ntfy iOS app — zero code tonight

The app POSTs to a secret ntfy topic at rest start with a `Delay:` header;
ntfy delivers a native push at rest end even to a locked phone. Costs: you
install a third-party app, rest-end pings can't be cancelled if you log the
set early (stale "rest's up" ghosts), and rest timing transits a third-party
service.

### D. What ships in v45 (no server, no accounts, honest)

- Screen wake lock for the whole rest (already existed — the phone face-up
  is the contract).
- The end-of-rest bell now **repeats** at +0:08 and +0:20 of overtime.
- Android in-background alert kept (the one path that ever worked).
- All copy tells the truth about what a locked iPhone will and won't do.

## Recommendation

Option A. It is the only punctual, private, reliable path. The client patch
is small and can ship dark (activates when a worker URL is configured in
settings), so deploying the worker later turns it on without another release.

## Appendix: Worker sketch (Option A)

```js
// wrangler.toml: [durable_objects] binding RESTS + [vars] VAPID_PUBLIC_KEY
// secrets: VAPID_PRIVATE_KEY (wrangler secret put), SUBJECT (mailto:you)
// POST /arm    {subscription, deadline, label} → stores + sets DO alarm
// POST /disarm {id}                            → deletes the alarm
// alarm() → webpush POST to subscription.endpoint with VAPID JWT, TTL 60,
//           payload {title: "Rest's up 💪", body: label}
// (Full implementation ~120 lines with the `web-push-libs/web-push` crypto
// inlined or the `@block65/webcrypto-web-push` package.)
```
