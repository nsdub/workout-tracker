// The worlds. Each session type is a place with its own art, physics,
// typography, and manners. Born here, painted in styles.css.
import { esc } from './util.js';

const r = (a, b) => +(a + Math.random() * (b - a)).toFixed(2);

function sprinkle(n, cls, fn) {
  let out = '';
  for (let i = 0; i < n; i++) out += `<i class="sp ${cls}" style="${fn(i)}"></i>`;
  return out;
}

export const WORLDS = {
  // ——————————————————————————————————————————————
  // PUSH A — BIG TOP MIDNIGHT
  // The carnival after everyone went home. It stayed open for you.
  // ——————————————————————————————————————————————
  PushA: {
    world: 'Big Top Midnight',
    cls: 'w1',
    tagline: 'the carnival stayed open for you',
    copy: {
      log: 'Ring it', rest: 'Intermission', results: 'Showstopper',
      objDone: 'Bell rung', pr: 'JACKPOT', finish: 'Close the show',
      trophyNote: 'tap a ticket to refund it',
    },
    scene: () => `
      <div class="fx bunting"></div>
      <div class="fx bunting b2"></div>
      <div class="fx wheel"><i></i><i></i><i></i><i></i><i></i><i></i></div>
      ${sprinkle(9, 'bulb', (i) => `left:${4 + i * 11.5}%;top:${i % 2 ? 5.4 : 7.8}%;--d:${r(0.8, 2.4)}s`)}
      ${sprinkle(10, 'ticket', () => `left:${r(0, 100)}%;--dur:${r(9, 17)}s;animation-delay:-${r(0, 17)}s;--sway:${r(-60, 60)}px;--rot:${r(120, 500)}deg`)}
      ${sprinkle(6, 'popcorn', () => `left:${r(0, 100)}%;--dur:${r(11, 19)}s;animation-delay:-${r(0, 19)}s;--sway:${r(-30, 30)}px`)}
    `,
  },

  // ——————————————————————————————————————————————
  // PULL A — THE UNFINISHED CEILING
  // Deadlifts inside a fresco nobody finished painting. Wet plaster,
  // nervous cherubs, gold behind the cracks.
  // ——————————————————————————————————————————————
  PullA: {
    world: 'The Unfinished Ceiling',
    cls: 'w2',
    tagline: 'the cherubs are watching your back angles',
    copy: {
      log: 'Carve it', rest: 'The paint dries', results: 'Masterpiece',
      objDone: 'Panel finished', pr: 'GOLD BREAKS THROUGH', finish: 'Sign the ceiling',
      trophyNote: 'tap a tablet to un-carve it',
    },
    scene: () => `
      <div class="fx sky-patch p1"></div>
      <div class="fx sky-patch p2"></div>
      <div class="fx scaffold"></div>
      <span class="sp putto" style="top:${r(9, 18)}%;--dur:52s;animation-delay:-${r(0, 45)}s">
        <svg viewBox="0 0 60 40"><ellipse cx="30" cy="24" rx="12" ry="10" fill="#e8b48f"/><circle cx="30" cy="12" r="8" fill="#eec3a2"/><path d="M18 22Q4 10 14 4q8-2 12 12z" fill="#fff" opacity=".85"/><path d="M42 22q14-12 4-18-8-2-12 12z" fill="#fff" opacity=".85"/><path d="M44 28l10 3" stroke="#8a5a2b" stroke-width="2.5" stroke-linecap="round"/><rect x="52" y="29" width="6" height="4" rx="1" fill="#c9a227"/></svg>
      </span>
      <span class="sp putto p2" style="top:${r(30, 44)}%;--dur:67s;animation-delay:-${r(0, 60)}s">
        <svg viewBox="0 0 60 40"><ellipse cx="30" cy="24" rx="11" ry="9" fill="#e8b48f"/><circle cx="30" cy="12" r="7.5" fill="#eec3a2"/><path d="M18 22Q4 10 14 4q8-2 12 12z" fill="#fff" opacity=".85"/><path d="M42 22q14-12 4-18-8-2-12 12z" fill="#fff" opacity=".85"/></svg>
      </span>
      ${sprinkle(8, 'goldfleck', () => `left:${r(0, 100)}%;--dur:${r(12, 22)}s;animation-delay:-${r(0, 22)}s;--sway:${r(-24, 24)}px;--rot:${r(90, 360)}deg`)}
      ${sprinkle(4, 'drip-paint', (i) => `left:${[12, 38, 63, 88][i]}%;--d:${r(3, 7)}s;--h:${r(30, 70)}px`)}
    `,
  },

  // ——————————————————————————————————————————————
  // LEGS A — THE UNDERDIRT
  // A cross-section of the colony. You are the megaproject. The ants
  // filed the paperwork.
  // ——————————————————————————————————————————————
  LegsA: {
    world: 'The Underdirt',
    cls: 'w3',
    tagline: 'the colony filed a work order for your quads',
    copy: {
      log: 'Dispatch', rest: 'Tunnel break', results: 'Project complete',
      objDone: 'Order filled', pr: 'DECREE OF THE QUEEN', finish: 'Seal the tunnel',
      trophyNote: 'tap a crate to send it back up',
    },
    scene: () => `
      <div class="fx strata s1"></div>
      <div class="fx strata s2"></div>
      <div class="fx strata s3"></div>
      ${sprinkle(3, 'root', (i) => `left:${[16, 52, 82][i]}%;--d:${r(5, 9)}s;--h:${r(70, 130)}px`)}
      ${[0, 1, 2, 3, 4, 5].map((i) => `
        <span class="sp ant" style="top:${r(28, 88)}%;--dur:${r(18, 34)}s;animation-delay:-${r(0, 30)}s;--flip:${i % 2 ? -1 : 1}">
          <svg viewBox="0 0 26 12"><g fill="#241a10"><ellipse cx="5" cy="7" rx="4" ry="3"/><ellipse cx="12" cy="6.4" rx="3.4" ry="2.6"/><ellipse cx="19" cy="6" rx="4.4" ry="3.4"/><circle cx="2.6" cy="4.6" r="1"/></g><g stroke="#241a10" stroke-width="1"><path d="M9 9l-2 3M12 9l0 3M15 9l2 3"/></g><rect x="14" y="-1" width="9" height="5" rx="1" fill="#c9803a" transform="rotate(-8 18 2)"/></svg>
        </span>`).join('')}
      ${sprinkle(7, 'spore', () => `left:${r(0, 100)}%;--dur:${r(14, 26)}s;animation-delay:-${r(0, 26)}s;--sway:${r(-20, 20)}px`)}
    `,
  },

  // ——————————————————————————————————————————————
  // PUSH B — MEEMAW'S MIDNIGHT KITCHEN
  // 3 AM. The wallpaper breathes. The fridge has opinions.
  // ——————————————————————————————————————————————
  PushB: {
    world: 'Meemaw’s Midnight Kitchen',
    cls: 'w4',
    tagline: 'the fridge believes in you, conditionally',
    copy: {
      log: 'Ding!', rest: 'Cooling rack', results: 'Supper’s ready',
      objDone: 'Dish served', pr: 'MEEMAW WINKED', finish: 'Say grace',
      trophyNote: 'tap a dish to un-serve it',
    },
    scene: () => `
      <div class="fx shelf"></div>
      <div class="fx jello"><i></i></div>
      <div class="fx portrait"><svg viewBox="0 0 60 74"><ellipse cx="30" cy="37" rx="27" ry="34" fill="#d9c6a3" stroke="#8a6a3a" stroke-width="4"/><circle cx="30" cy="30" r="12" fill="#eec3a2"/><path d="M18 26q12-14 24 0l-2-10q-10-8-20 0z" fill="#cfcfcf"/><circle cx="25.5" cy="29" r="1.6" fill="#3a2c1c" class="eye-l"/><circle cx="34.5" cy="29" r="1.6" fill="#3a2c1c"/><path d="M25 37q5 4 10 0" stroke="#8a5a3a" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="30" cy="52" rx="13" ry="9" fill="#b06a8a"/></svg></div>
      <div class="fx magnets">${['SOUP', 'BIG', 'LIFT', 'OK?'].map((w, i) => `<b style="--i:${i}">${w}</b>`).join('')}</div>
      ${sprinkle(5, 'steam', (i) => `left:${[10, 30, 55, 74, 90][i]}%;--dur:${r(7, 13)}s;animation-delay:-${r(0, 12)}s;--sway:${r(-16, 16)}px`)}
      ${sprinkle(6, 'crumb', () => `left:${r(0, 100)}%;--dur:${r(13, 23)}s;animation-delay:-${r(0, 23)}s;--sway:${r(-30, 30)}px;--rot:${r(90, 400)}deg`)}
    `,
  },

  // ——————————————————————————————————————————————
  // PULL B — CHANNEL 87
  // A dying CRT broadcasting the greatest match nobody saw. You.
  // ——————————————————————————————————————————————
  PullB: {
    world: 'Channel 87',
    cls: 'w5',
    tagline: 'live from a television that should not still work',
    copy: {
      log: '⏺ Rec', rest: 'Commercial break', results: 'Off the air',
      objDone: 'Taped', pr: 'SIGNAL LOST', finish: 'End broadcast',
      trophyNote: 'tap a clip to erase the tape',
    },
    scene: () => `
      <div class="fx crt-lines"></div>
      <div class="fx crt-glow"></div>
      <div class="fx rec"><i></i>REC</div>
      <div class="fx smpte"><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="fx chyron"><span>★ LOCAL LIFTER REFUSES TO MISS ★ CROWD ON ITS FEET ★ SPONSORED BY PROTEIN ★ DO NOT ADJUST YOUR SET ★ THE BACK DAY OF THE CENTURY ★</span></div>
      ${sprinkle(14, 'static-dot', () => `left:${r(0, 100)}%;top:${r(0, 100)}%;--d:${r(0.4, 1.8)}s`)}
    `,
  },

  // ——————————————————————————————————————————————
  // LEGS B — PARADE ETERNAL
  // A parade in your honor that never learned how to stop.
  // ——————————————————————————————————————————————
  LegsB: {
    world: 'Parade Eternal',
    cls: 'w6',
    tagline: 'the band has been playing since tuesday',
    copy: {
      log: 'Fire!', rest: 'Halftime', results: 'Parade dismissed',
      objDone: 'Float launched', pr: 'THE BALLOONS ARE FREE', finish: 'Wave goodbye',
      trophyNote: 'tap a streamer to take it back',
    },
    scene: () => `
      <div class="fx sunface"><svg viewBox="0 0 80 80"><g class="rays" stroke="#ffb63a" stroke-width="5" stroke-linecap="round"><path d="M40 2v12M40 66v12M2 40h12M66 40h12M13 13l8 8M59 59l8 8M67 13l-8 8M21 59l-8 8"/></g><circle cx="40" cy="40" r="20" fill="#ffd24a"/><circle cx="34" cy="37" r="2.4" fill="#7a4a10"/><circle cx="46" cy="37" r="2.4" fill="#7a4a10"/><path d="M33 45q7 6 14 0" stroke="#7a4a10" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg></div>
      ${[0, 1, 2].map((i) => `
        <span class="sp balloon b${i}" style="left:${[10, 46, 78][i]}%;--dur:${r(6, 9)}s;animation-delay:-${r(0, 8)}s">
          <svg viewBox="0 0 40 70"><path d="M20 44v22" stroke="#7a4a10" stroke-width="1.6"/><ellipse cx="14" cy="22" rx="11" ry="14" fill="${['#ff4f79', '#59c9a5', '#8f6fdc'][i]}"/><ellipse cx="28" cy="16" rx="8" ry="10" fill="${['#ff8fb1', '#8fe0c8', '#b59ff0'][i]}"/><circle cx="12" cy="18" r="1.8" fill="#2b1c0c"/><circle cx="19" cy="18" r="1.8" fill="#2b1c0c"/><path d="M12 26q4 3 8 0" stroke="#2b1c0c" stroke-width="1.4" fill="none"/></svg>
        </span>`).join('')}
      ${sprinkle(18, 'confetti', (i) => `left:${r(0, 100)}%;--c:${['#ff4f79', '#ffd24a', '#59c9a5', '#8f6fdc', '#ff8a3c'][i % 5]};--dur:${r(6, 13)}s;animation-delay:-${r(0, 13)}s;--sway:${r(-70, 70)}px;--rot:${r(200, 720)}deg`)}
      ${sprinkle(6, 'streamer', (i) => `left:${r(2, 96)}%;--c:${['#ff4f79', '#59c9a5', '#ffd24a'][i % 3]};--dur:${r(9, 15)}s;animation-delay:-${r(0, 15)}s;--sway:${r(-40, 40)}px`)}
    `,
  },
};

// Non-session spaces: the scrapbook (log) and the conspiracy board (plan).
export const SPACES = {
  sb: { cls: 'sb', world: 'The Scrapbook' },
  cb: { cls: 'cb', world: 'The Board' },
};

let current = null;

export function applyWorld(key) {
  if (key === current) return;
  current = key;
  const def = WORLDS[key] || SPACES[key] || null;
  document.documentElement.dataset.world = def ? def.cls : '';
  const scene = document.getElementById('scene');
  if (scene) scene.innerHTML = def && def.scene ? def.scene() : '';
}

export function worldOf(sessionType) {
  return WORLDS[sessionType];
}

export function worldTitle(sessionType) {
  return WORLDS[sessionType]?.world ?? sessionType;
}

export function worldTag(sessionType) {
  return esc(WORLDS[sessionType]?.tagline ?? '');
}
