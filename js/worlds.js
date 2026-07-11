// THE UNIVERSES. Each session type is a universe; every visit lands in a
// different WORLD inside it, drawn from the pool without repeats until the
// pool is exhausted, then reshuffled. Painted in styles.css.
const r = (a, b) => +(a + Math.random() * (b - a)).toFixed(2);

function sprinkle(n, cls, fn) {
  let out = '';
  for (let i = 0; i < n; i++) out += `<i class="sp ${cls}" style="${fn(i)}"></i>`;
  return out;
}

// ——— per-universe sprite kits (shared physics classes live in styles.css) ———

const fish = (n, band = [15, 80]) => Array.from({ length: n }, () =>
  `<span class="sp fishy" style="top:${r(band[0], band[1])}%;--s:${r(12, 20)}px;--dur:${r(20, 36)}s;animation-delay:-${r(0, 36)}s">
    <svg viewBox="0 0 16 8" fill="currentColor"><path d="M1 4c3-3 8-3 11 0-3 3-8 3-11 0z"/><path d="M11.5 4l3.5-3v6z"/></svg>
  </span>`).join('');

const bubbles = (n) => sprinkle(n, 'bubble', () =>
  `left:${r(2, 98)}%;--s:${r(4, 13)}px;--dur:${r(9, 18)}s;animation-delay:-${r(0, 18)}s;--sway:${r(-40, 40)}px;--op:${r(0.25, 0.6)}`);

const snowfall = (n) => sprinkle(n, 'snow', () =>
  `left:${r(0, 100)}%;--s:${r(2.5, 6)}px;--dur:${r(10, 22)}s;animation-delay:-${r(0, 22)}s;--sway:${r(-45, 45)}px;--op:${r(0.35, 0.85)}`);

const petals = (n, c) => sprinkle(n, 'petal', (i) =>
  `left:${r(0, 100)}%;--c:${c[i % c.length]};--dur:${r(9, 18)}s;animation-delay:-${r(0, 18)}s;--sway:${r(-60, 60)}px;--rot:${r(120, 480)}deg;--op:${r(0.5, 0.9)}`);

const embers = (n) => sprinkle(n, 'ember', () =>
  `left:${r(2, 98)}%;--s:${r(3, 7)}px;--dur:${r(7, 14)}s;animation-delay:-${r(0, 14)}s;--sway:${r(-30, 30)}px;--op:${r(0.4, 0.9)}`);

const steam = (n) => sprinkle(n, 'steam', () =>
  `left:${r(4, 94)}%;--s:${r(10, 18)}px;--dur:${r(8, 14)}s;animation-delay:-${r(0, 14)}s;--sway:${r(-18, 18)}px`);

const lanterns = (n) => Array.from({ length: n }, (_, i) =>
  `<span class="sp lantern" style="left:${6 + i * (88 / Math.max(1, n - 1))}%;top:${r(4, 12)}%;--d:${r(3, 6)}s;--c:${['#ff5d5d', '#ffb84d', '#ff8a5c'][i % 3]}">
    <svg viewBox="0 0 20 28"><rect x="7" y="0" width="6" height="3" fill="#5a3218"/><ellipse cx="10" cy="13" rx="8" ry="10" fill="var(--c,#ff5d5d)"/><path d="M2 13h16" stroke="#7a1f12" stroke-width="1"/><rect x="7" y="23" width="6" height="4" fill="#5a3218"/><path d="M10 27v1.5" stroke="#e8b84d" stroke-width="2"/></svg>
  </span>`).join('');

const parrots = (n) => Array.from({ length: n }, (_, i) =>
  `<span class="sp parrot" style="left:${r(4, 92)}%;top:${r(6, 40)}%;--d:${r(2.5, 5)}s;--c:${['#ff4f5e', '#2fb56b', '#3a8fd9', '#ffb84d'][i % 4]}">
    <svg viewBox="0 0 20 24"><ellipse cx="10" cy="13" rx="6" ry="8" fill="var(--c)"/><circle cx="10" cy="6" r="4.5" fill="var(--c)"/><circle cx="11.5" cy="5" r="1.2" fill="#1c1208"/><path d="M14 6q4 1 3 4-2-1-3-2z" fill="#ffb84d"/><path d="M10 20l-1 3M12 20l1 3" stroke="#7a5a1c" stroke-width="1.4"/><path d="M5 12q-3 4 0 8" stroke="var(--c)" stroke-width="2" fill="none"/></svg>
  </span>`).join('');

const yetiChair = (i, dur, delay, top) =>
  `<span class="sp chair" style="top:${top}%;--dur:${dur}s;animation-delay:${delay}s">
    <svg viewBox="0 0 34 40"><path d="M17 0v10" stroke="#4a3a2a" stroke-width="2"/><rect x="6" y="10" width="22" height="4" rx="2" fill="#4a3a2a"/><rect x="8" y="14" width="18" height="14" rx="3" fill="#c04848"/>${i % 2 === 0 ? '<circle cx="17" cy="18" r="6" fill="#eef4f8"/><circle cx="15" cy="17" r="1" fill="#223"/><circle cx="19" cy="17" r="1" fill="#223"/><path d="M14 21q3 2 6 0" stroke="#223" stroke-width="1" fill="none"/>' : ''}</svg>
  </span>`;

// ——— THE SIX UNIVERSES ———

export const UNIVERSES = {
  // PUSH A — MOUNT VOLCANO DOJO: brush-painted training mountain.
  PushA: {
    name: 'Mount Volcano Dojo',
    cls: 'dojo',
    swatch: '#c23b22',
    copy: {
      log: 'Strike', rest: 'Meditate', results: 'Training complete',
      objDone: 'Form complete', pr: 'THE MOUNTAIN BOWS', finish: 'Descend the stairs',
      trophyNote: 'tap a scroll to unlearn it',
    },
    worlds: [
      {
        id: 'stairs', name: 'The Thousand Stairs', cls: 'dojo-stairs',
        scene: () => `
          <div class="fx mountain"></div>
          <div class="fx stairs"></div>
          <div class="fx redsun"></div>
          ${petals(14, ['#e8a0b4', '#f2c4d0', '#d97a94'])}
          ${sprinkle(3, 'brushbird', () => `left:${r(10, 80)}%;top:${r(8, 22)}%;--d:${r(4, 7)}s`)}
        `,
      },
      {
        id: 'waterfall', name: 'The Waterfall of Discipline', cls: 'dojo-falls',
        scene: () => `
          <div class="fx cascade"></div>
          <div class="fx cascade c2"></div>
          <div class="fx mist"></div>
          ${bubbles(6)}
          ${sprinkle(2, 'koi', (i) => `top:${r(55, 78)}%;--dur:${r(26, 40)}s;animation-delay:-${r(0, 30)}s;--c:${i ? '#e8843c' : '#e05a5a'}`)}
          ${petals(6, ['#e8a0b4', '#f2c4d0'])}
        `,
      },
      {
        id: 'summit', name: 'The Lava-Forge Summit', cls: 'dojo-summit',
        scene: () => `
          <div class="fx redsun big"></div>
          <div class="fx lava-line"></div>
          ${embers(14)}
          ${sprinkle(4, 'brushsmoke', () => `left:${r(8, 88)}%;--s:${r(30, 60)}px;--dur:${r(13, 20)}s;animation-delay:-${r(0, 18)}s;--sway:${r(-30, 30)}px`)}
        `,
      },
    ],
  },

  // PULL A — THE DEEP: bioluminescent trench civilization. You pull from below.
  PullA: {
    name: 'The Deep',
    cls: 'deep',
    swatch: '#38dcc8',
    copy: {
      log: 'Descend', rest: 'Decompression', results: 'Back from the deep',
      objDone: 'Depth reached', pr: 'THE LEVIATHAN STIRS', finish: 'Surface',
      trophyNote: 'tap a depth marker to rise',
    },
    worlds: [
      {
        id: 'vents', name: 'The Vent Gardens', cls: 'deep-vents',
        scene: () => `
          <div class="fx ventglow"></div>
          ${sprinkle(3, 'vent', (i) => `left:${[18, 52, 82][i]}%;--h:${r(60, 110)}px;--d:${r(4, 7)}s`)}
          ${sprinkle(5, 'tubeworm', () => `left:${r(6, 92)}%;--h:${r(34, 64)}px;--d:${r(5, 9)}s`)}
          ${bubbles(12)}
          ${fish(3, [20, 55])}
        `,
      },
      {
        id: 'whalefall', name: 'Whale-Fall City', cls: 'deep-whalefall',
        scene: () => `
          <div class="fx ribcage"><svg viewBox="0 0 320 120" fill="none" stroke="#b8c9c4" stroke-width="5" stroke-linecap="round" opacity=".5"><path d="M10 110q0-90 60-95M60 112q-4-80 50-92M115 114q-6-72 44-86M168 114q-6-62 36-78M214 112q-4-52 30-66M254 110q-2-40 24-52"/><path d="M4 112h310" stroke-width="3"/></svg></div>
          ${bubbles(10)}
          ${fish(6, [12, 70])}
          ${sprinkle(8, 'marine-snow', () => `left:${r(0, 100)}%;--dur:${r(16, 30)}s;animation-delay:-${r(0, 30)}s;--sway:${r(-16, 16)}px`)}
        `,
      },
      {
        id: 'anglermarket', name: 'The Anglerfish Night Market', cls: 'deep-market',
        scene: () => `
          ${sprinkle(7, 'lure', () => `left:${r(6, 94)}%;top:${r(6, 46)}%;--d:${r(2, 5)}s;--s:${r(6, 12)}px`)}
          <span class="sp angler" style="top:${r(24, 46)}%;--dur:58s;animation-delay:-${r(0, 50)}s">
            <svg viewBox="0 0 70 40"><path d="M8 22q14-16 34-14 16 2 20 12-4 10-20 12-20 2-34-10z" fill="#12232b"/><path d="M42 10q8-8 14-6" stroke="#12232b" stroke-width="3" fill="none"/><circle cx="58" cy="4" r="4" fill="#8ff2e0"><animate attributeName="opacity" values="1;.3;1" dur="1.6s" repeatCount="indefinite"/></circle><circle cx="26" cy="18" r="2.6" fill="#8ff2e0"/><path d="M18 26q8 5 18 3" stroke="#8ff2e0" stroke-width="1.6" fill="none"/></svg>
          </span>
          ${bubbles(8)}
          ${fish(4, [50, 80])}
        `,
      },
    ],
  },

  // LEGS A — CRYPTID NATIONAL PARK: every trail has a classified resident.
  LegsA: {
    name: 'Cryptid National Park',
    cls: 'park',
    swatch: '#3e7a3a',
    copy: {
      log: 'Sighting!', rest: 'Trail break', results: 'Case closed',
      objDone: 'Trail cleared', pr: 'CONFIRMED SIGHTING', finish: 'File the report',
      trophyNote: 'tap a photo to redact it',
    },
    worlds: [
      {
        id: 'trailhead', name: 'Sasquatch Trailhead', cls: 'park-trail',
        scene: () => `
          <div class="fx treeline"></div>
          ${sprinkle(6, 'footprint', (i) => `left:${8 + i * 15}%;bottom:${6 + (i % 2) * 5}%;--d:${2 + i * 0.9}s;transform:rotate(${i % 2 ? 14 : -10}deg)`)}
          <span class="sp squatch" style="--dur:85s;animation-delay:-${r(6, 70)}s">
            <svg viewBox="0 0 40 60" fill="#241d12"><ellipse cx="20" cy="34" rx="13" ry="20"/><circle cx="20" cy="12" r="9"/><path d="M8 30q-6 6-4 14M32 30q6 6 4 14" stroke="#241d12" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M14 52l-2 8M26 52l2 8" stroke="#241d12" stroke-width="7" stroke-linecap="round"/></svg>
          </span>
          ${sprinkle(5, 'firefly', () => `left:${r(6, 92)}%;top:${r(30, 80)}%;--dur:${r(3, 6)}s;animation-delay:-${r(0, 6)}s`)}
        `,
      },
      {
        id: 'mothman', name: 'Mothman Overlook', cls: 'park-mothman',
        scene: () => `
          <div class="fx treeline dark"></div>
          <div class="fx bigmoon"></div>
          ${sprinkle(4, 'redeyes', () => `left:${r(8, 86)}%;top:${r(38, 74)}%;--d:${r(3, 8)}s`)}
          ${sprinkle(7, 'moth', () => `left:${r(4, 92)}%;top:${r(8, 60)}%;--d:${r(2, 4)}s;--s:${r(8, 14)}px`)}
        `,
      },
      {
        id: 'marina', name: 'Lake-Monster Marina', cls: 'park-marina',
        scene: () => `
          <div class="fx lake"></div>
          <span class="sp nessie" style="--dur:44s;animation-delay:-${r(0, 40)}s">
            <svg viewBox="0 0 90 50" fill="#2a5a4a"><path d="M12 26q6-24 20-16 8 5 4 14" fill="none" stroke="#2a5a4a" stroke-width="8" stroke-linecap="round"/><circle cx="14" cy="10" r="6"/><circle cx="12.5" cy="8.5" r="1.2" fill="#dff2ec"/><ellipse cx="52" cy="34" rx="14" ry="7"/><ellipse cx="76" cy="36" rx="9" ry="5"/></svg>
          </span>
          ${sprinkle(4, 'buoy', (i) => `left:${[12, 38, 66, 88][i]}%;top:${r(62, 72)}%;--d:${r(2.5, 4.5)}s;--c:${i % 2 ? '#d94f3c' : '#e8b84d'}`)}
          ${sprinkle(5, 'ripple', () => `left:${r(10, 86)}%;top:${r(58, 84)}%;--d:${r(3, 6)}s`)}
        `,
      },
    ],
  },

  // PUSH B — THE NOODLE COSMOS: a night-market galaxy inside a dragon's wok.
  PushB: {
    name: 'The Noodle Cosmos',
    cls: 'wok',
    swatch: '#ff6b3d',
    copy: {
      log: 'Wok toss', rest: 'Simmer', results: 'Kitchen closed',
      objDone: 'Order up', pr: 'THE DRAGON APPROVES', finish: 'Last call',
      trophyNote: 'tap a ticket to refire it',
    },
    worlds: [
      {
        id: 'inferno', name: 'The Wok Inferno', cls: 'wok-inferno',
        scene: () => `
          <div class="fx flamewall"></div>
          ${embers(12)}
          ${sprinkle(6, 'noodle', () => `left:${r(2, 96)}%;--dur:${r(6, 11)}s;animation-delay:-${r(0, 10)}s;--sway:${r(-50, 50)}px;--rot:${r(180, 560)}deg`)}
          ${steam(4)}
        `,
      },
      {
        id: 'steamgardens', name: 'The Dumpling Steam Gardens', cls: 'wok-steam',
        scene: () => `
          <div class="fx steambank"></div>
          ${Array.from({ length: 4 }, (_, i) => `
            <span class="sp dumpling" style="left:${[14, 42, 66, 84][i]}%;top:${r(14, 55)}%;--d:${r(5, 9)}s;animation-delay:-${r(0, 8)}s">
              <svg viewBox="0 0 34 26"><path d="M4 20q0-14 13-14t13 14q-13 5-26 0z" fill="#f2e2c8"/><path d="M9 8q2-4 4-1M15 6q2-4 4-1M21 7q2-4 4 0" stroke="#d9b88a" stroke-width="2" fill="none"/><circle cx="13" cy="15" r="1.3" fill="#4a3218"/><circle cx="21" cy="15" r="1.3" fill="#4a3218"/><path d="M15 18.5q2 1.6 4 0" stroke="#4a3218" stroke-width="1.2" fill="none"/></svg>
            </span>`).join('')}
          ${steam(7)}
        `,
      },
      {
        id: 'ramenalley', name: 'Midnight Ramen Alley', cls: 'wok-alley',
        scene: () => `
          ${lanterns(5)}
          <div class="fx shopsign"></div>
          <div class="fx shopsign s2"></div>
          ${steam(5)}
          ${sprinkle(6, 'noodle', () => `left:${r(2, 96)}%;--dur:${r(8, 13)}s;animation-delay:-${r(0, 12)}s;--sway:${r(-30, 30)}px;--rot:${r(120, 400)}deg;--op:.5`)}
        `,
      },
    ],
  },

  // PULL B — PIRATE RADIO ATOLL: an illegal station run from a volcano.
  PullB: {
    name: 'Pirate Radio Atoll',
    cls: 'atoll',
    swatch: '#d9903c',
    copy: {
      log: 'On air', rest: 'Dead air', results: 'Off the air',
      objDone: 'Track played', pr: 'HEARD ON THE MAINLAND', finish: 'Sign off',
      trophyNote: 'tap a record to scratch it',
    },
    worlds: [
      {
        id: 'shipwreck', name: 'The Shipwreck Gym', cls: 'atoll-wreck',
        scene: () => `
          <div class="fx wreck"><svg viewBox="0 0 220 120" fill="#4a3420"><path d="M10 90q100 40 200-10l-14 34-160 6z"/><path d="M96 8v76" stroke="#4a3420" stroke-width="7"/><path d="M96 14q44 10 0 42z" fill="#d9c9a3"/></svg></div>
          <div class="fx waves"></div>
          ${sprinkle(3, 'crab', () => `left:${r(8, 80)}%;bottom:${r(4, 10)}%;--dur:${r(16, 26)}s;animation-delay:-${r(0, 20)}s`)}
          ${sprinkle(6, 'radiowave', () => `left:${r(10, 88)}%;top:${r(6, 30)}%;--d:${r(2, 4)}s;--s:${r(14, 26)}px`)}
        `,
      },
      {
        id: 'lighthouse', name: 'The Volcano Lighthouse', cls: 'atoll-light',
        scene: () => `
          <div class="fx volcano"></div>
          <div class="fx beam"></div>
          ${embers(7)}
          <div class="fx waves"></div>
          ${sprinkle(5, 'radiowave', () => `left:${r(8, 90)}%;top:${r(4, 26)}%;--d:${r(2, 4)}s;--s:${r(14, 30)}px`)}
        `,
      },
      {
        id: 'parrots', name: 'The Parrot Congress', cls: 'atoll-parrots',
        scene: () => `
          <div class="fx rigging"></div>
          ${parrots(6)}
          ${sprinkle(8, 'feather', (i) => `left:${r(0, 100)}%;--c:${['#ff4f5e', '#2fb56b', '#3a8fd9', '#ffb84d'][i % 4]};--dur:${r(9, 16)}s;animation-delay:-${r(0, 15)}s;--sway:${r(-55, 55)}px;--rot:${r(120, 420)}deg`)}
          ${sprinkle(4, 'radiowave', () => `left:${r(10, 88)}%;top:${r(4, 20)}%;--d:${r(2, 4)}s;--s:${r(12, 22)}px`)}
        `,
      },
    ],
  },

  // LEGS B — YETI SKI RESORT: a 1980s alpine resort staffed by yetis who love you.
  LegsB: {
    name: 'Yeti Ski Resort',
    cls: 'yeti',
    swatch: '#3a8fd9',
    copy: {
      log: 'Send it', rest: 'Lodge break', results: 'Après-ski',
      objDone: 'Run cleared', pr: 'AVALANCHE!', finish: 'Last run',
      trophyNote: 'tap a lift ticket to refund it',
    },
    worlds: [
      {
        id: 'chairlift', name: 'The Chairlift', cls: 'yeti-lift',
        scene: () => `
          <div class="fx peaks"></div>
          <div class="fx cable"></div>
          ${yetiChair(0, 42, -6, 12)}${yetiChair(1, 42, -20, 15)}${yetiChair(2, 42, -34, 13)}
          ${snowfall(14)}
        `,
      },
      {
        id: 'blackdiamond', name: 'The Black Diamond Run', cls: 'yeti-diamond',
        scene: () => `
          <div class="fx slope"></div>
          ${sprinkle(5, 'gate', (i) => `left:${12 + i * 18}%;top:${28 + i * 12}%;--c:${i % 2 ? '#d94f3c' : '#3a8fd9'}`)}
          <span class="sp skiyeti" style="--dur:9s;animation-delay:-${r(0, 8)}s">
            <svg viewBox="0 0 40 44"><circle cx="20" cy="12" r="9" fill="#eef4f8"/><circle cx="17" cy="11" r="1.4" fill="#223"/><circle cx="23" cy="11" r="1.4" fill="#223"/><path d="M16 15q4 3 8 0" stroke="#223" stroke-width="1.4" fill="none"/><ellipse cx="20" cy="28" rx="11" ry="12" fill="#eef4f8"/><path d="M4 40l14-4M36 40l-14-4" stroke="#c04848" stroke-width="3" stroke-linecap="round"/><path d="M2 42q18 6 36 0" stroke="#3a8fd9" stroke-width="3" stroke-linecap="round" fill="none"/></svg>
          </span>
          ${snowfall(16)}
        `,
      },
      {
        id: 'apresski', name: 'Après-Ski Disco', cls: 'yeti-disco',
        scene: () => `
          <div class="fx discoball"><i></i></div>
          ${sprinkle(8, 'discodot', (i) => `left:${r(4, 94)}%;top:${r(10, 70)}%;--d:${r(1.5, 3.5)}s;--c:${['#ff4f9e', '#3adcc8', '#ffd24a', '#8f6fdc'][i % 4]}`)}
          <div class="fx firepit"></div>
          ${snowfall(8)}
        `,
      },
    ],
  },
};

// Non-session spaces: the scrapbook (log) and the board (plan).
export const SPACES = {
  sb: { cls: 'sb', name: 'The Scrapbook' },
  cb: { cls: 'cb', name: 'The Board' },
};

// ——— world pool: no repeats until a universe is exhausted ———

const POOL_KEY = 'p3.worldPools';

function readPools() {
  try { return JSON.parse(localStorage.getItem(POOL_KEY)) || {}; } catch { return {}; }
}

export function pickWorld(sessionType) {
  const U = UNIVERSES[sessionType];
  if (!U) return null;
  const pools = readPools();
  let pool = pools[sessionType];
  if (!Array.isArray(pool) || !pool.length || pool.some((id) => !U.worlds.find((w) => w.id === id))) {
    pool = U.worlds.map((w) => w.id).sort(() => Math.random() - 0.5);
  }
  const id = pool.shift();
  pools[sessionType] = pool;
  try { localStorage.setItem(POOL_KEY, JSON.stringify(pools)); } catch { /* full */ }
  return id;
}

export function universeOf(sessionType) {
  return UNIVERSES[sessionType];
}

export function worldDef(sessionType, worldId) {
  const U = UNIVERSES[sessionType];
  return U?.worlds.find((w) => w.id === worldId) ?? U?.worlds[0] ?? null;
}

// ——— apply: data-universe (skin) + data-world (backdrop) + live scene ———

let current = null;

export function applyWorld(sessionType, worldId = null) {
  const key = `${sessionType}:${worldId ?? ''}`;
  if (key === current) return;
  current = key;
  const root = document.documentElement;
  const scene = document.getElementById('scene');
  if (SPACES[sessionType]) {
    root.dataset.universe = SPACES[sessionType].cls;
    root.dataset.world = '';
    if (scene) scene.innerHTML = '';
    return;
  }
  const U = UNIVERSES[sessionType];
  const W = worldDef(sessionType, worldId);
  root.dataset.universe = U ? U.cls : '';
  root.dataset.world = W ? W.cls : '';
  if (scene) scene.innerHTML = W?.scene ? W.scene() : '';
}
