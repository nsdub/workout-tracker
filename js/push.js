// Rest-timer push client. Talks to the Cloudflare Worker (push-worker/) that
// holds a Durable Object alarm at each rest deadline and sends the Web Push —
// the one mechanism that survives a pocketed, locked, or memory-evicted page.
//
// Everything here is inert until the user pastes a worker URL in the Systems
// console: no URL, no subscribe, no network, no prompt. The in-page bell,
// wake lock, and background tick keep working regardless — push is the belt
// on top of those braces, never a replacement.
import { store } from './store.js';

// Public half of the VAPID pair in push-worker/vapid.json (the private half
// lives only as a Worker secret). Safe to ship: it identifies the sender.
export const VAPID_PUBLIC_KEY = 'BIWUl60wK7nfCMRHSRHaZ8tUjw-gBxhfhoQ9kaQ6HyVy-vbyIKbK_pjg_PVVkVgJZYXbwQqFev_vy0WE68kdqN8';

const b64urlToBytes = (s) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

export const pushConfigured = () => !!store.settings.pushUrl;

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Live status for the Systems console: what's true right now, not what we hope.
export async function pushStatus() {
  if (!pushSupported()) return { state: 'unsupported', txt: 'This browser has no push support' };
  if (!pushConfigured()) return { state: 'off', txt: 'Not set up — paste your worker URL to enable' };
  if (Notification.permission === 'denied') return { state: 'blocked', txt: 'Chrome is blocking notifications for this app — allow them in site settings' };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return { state: 'off', txt: 'Set up, but this phone is not subscribed yet' };
    return { state: 'on', txt: 'On — the alarm fires even with the phone locked' };
  } catch {
    return { state: 'off', txt: 'Not subscribed' };
  }
}

// Ask permission (must be called from a tap) and subscribe this device.
export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser has no push support');
  if (!pushConfigured()) throw new Error('Add the worker URL first');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Your phone said no to notifications');
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription()
    ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64urlToBytes(VAPID_PUBLIC_KEY),
    });
  // Prove the worker is reachable before claiming success — a typo'd URL
  // must fail HERE, in front of the user, not silently at rest-end.
  const res = await fetch(`${store.settings.pushUrl.replace(/\/$/, '')}/health`).catch(() => null);
  if (!res?.ok) {
    await sub.unsubscribe().catch(() => {});
    throw new Error("Couldn't reach that worker URL — check it and try again");
  }
  return sub;
}

export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await disarmPush(); // never leave an alarm pointed at a dead subscription
      await sub.unsubscribe();
    }
  } catch { /* nothing subscribed */ }
}

async function currentSubscription() {
  if (!pushConfigured() || !pushSupported() || Notification.permission !== 'granted') return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch { return null; }
}

// Arm the worker for this rest. Fire-and-forget on purpose: a gym dead spot
// must never delay the set the lifter is standing there waiting to do — the
// in-page timer is already running and is the primary bell.
export async function armPush(deadline, label) {
  const sub = await currentSubscription();
  if (!sub) return false;
  try {
    const res = await fetch(`${store.settings.pushUrl.replace(/\/$/, '')}/arm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), deadline, label: label ?? null }),
      keepalive: true, // survives the page being backgrounded mid-request
    });
    return res.ok;
  } catch { return false; }
}

// Cancel a pending bell: the set was logged early, Skip was tapped, a new
// rest started, or the night finished. keepalive matters here — this often
// fires as the page is going away.
export async function disarmPush() {
  const sub = await currentSubscription();
  if (!sub) return false;
  try {
    const res = await fetch(`${store.settings.pushUrl.replace(/\/$/, '')}/disarm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() }),
      keepalive: true,
    });
    return res.ok;
  } catch { return false; }
}
