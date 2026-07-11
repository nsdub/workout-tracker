// Theme engine. One axis only: the session world. The worlds are committed —
// there is no light mode, no user theme knob. Each session IS its theme.
export function initTheme() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = '#08070a';
}

// null → app accent; a session type → that session's world (palette + live scene)
let currentScene = undefined;

export function setAccent(sessionType) {
  const root = document.documentElement;
  if (sessionType) root.dataset.accent = sessionType;
  else delete root.dataset.accent;
  if (sessionType !== currentScene) {
    currentScene = sessionType;
    const el = document.getElementById('scene');
    if (el) el.innerHTML = sessionType && SCENES[sessionType] ? SCENES[sessionType]() : '';
  }
}

// ——— Live scenes: the weather of each world ———
// Every sprite animates transform/opacity only, and negative delays mean the
// scene is already mid-flight on first paint.

const r = (a, b) => +(a + Math.random() * (b - a)).toFixed(2);

function swarm(n, cls, fn) {
  let out = '';
  for (let i = 0; i < n; i++) out += `<i class="sp ${cls}" style="${fn(i)}"></i>`;
  return out;
}

const mark = (type) => `<span class="fx mark">${THEMES[type].emblem}</span>`;

const SPRINKLE_COLORS = ['#ff8ab5', '#7fe3c3', '#ffd479', '#a5b4fc', '#ff9e7d'];

// Showpiece sprites
const SVG = {
  whale: `<svg viewBox="0 0 64 34" fill="currentColor" aria-hidden="true"><path d="M4 19c8-9 22-13 34-10 6 1.5 10 0 14-5-1 5-1 9 2 13-8 8-20 11-31 9-8-1.5-15-4-19-7z"/><path d="M22 25c-1 4-4 6-8 6 2-3 3-5 3-8z"/></svg>`,
  fish: `<svg viewBox="0 0 16 8" fill="currentColor" aria-hidden="true"><path d="M1 4c3-3 8-3 11 0-3 3-8 3-11 0z"/><path d="M11.5 4l3.5-3v6z"/></svg>`,
  kelp: `<svg viewBox="0 0 16 90" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 90c4-12-3-18 0-30s-4-16 0-28 -3-14 0-22"/><path d="M8 62q7-2 8 5" /><path d="M8 34q-7-2-8 5"/></svg>`,
  vine: `<svg viewBox="0 0 20 120" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M10 0c4 20-4 28 0 46s-5 26 0 44 0 22 0 30"/><path d="M10 34q8-2 9 6" /><path d="M10 72q-8-2-9 6"/><path d="M10 100q8-2 9 6"/></svg>`,
  butterfly: `<svg viewBox="0 0 20 14" fill="currentColor" aria-hidden="true"><path d="M10 7C7 1 1 0 1 5c0 4 5 6 9 4z"/><path d="M10 7c3-6 9-7 9-2 0 4-5 6-9 4z"/><circle cx="10" cy="7" r="1.1"/></svg>`,
  popsicle: `<svg viewBox="0 0 16 27" aria-hidden="true"><rect x="2" y="1" width="12" height="17" rx="6" fill="currentColor"/><path d="M8 18v7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity=".6"/></svg>`,
  cherry: `<svg viewBox="0 0 18 20" aria-hidden="true"><circle cx="6" cy="14" r="4.6" fill="currentColor"/><circle cx="13" cy="15" r="3.8" fill="currentColor" opacity=".8"/><path d="M6.5 9C8 5 11 3 15 2M13.5 11c0-4 .5-6 1.5-9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".7"/></svg>`,
  penguin: `<svg viewBox="0 0 20 26" aria-hidden="true"><path d="M10 1C5.5 1 3.5 6 3.5 12c0 7 2 12 6.5 12s6.5-5 6.5-12c0-6-2-11-6.5-11z" fill="currentColor"/><ellipse cx="10" cy="15" rx="3.4" ry="6" fill="var(--bg0)"/><path d="M8.4 6.5L10 8.4l1.6-1.9z" fill="#ff9e3d"/></svg>`,
  iceberg: `<svg viewBox="0 0 60 26" fill="currentColor" aria-hidden="true"><path d="M2 26L14 10l8 6 8-14 10 12 8-6 8 18z"/></svg>`,
  skyline: `<svg viewBox="0 0 400 60" preserveAspectRatio="none" fill="currentColor" aria-hidden="true"><path d="M0 60V36h16V24h12v16h10V16h18v20h12v-8h20V14h14v26h12V30h18v12h10V12h16v30h14V28h20v16h12V20h16v22h14V34h20V18h14v26h12V30h18v12h14V24h16v36z"/></svg>`,
};

const SCENES = {
  PushA: () => `
    ${mark('PushA')}
    <div class="fx forge-glow"></div>
    <div class="fx lava"></div>
    ${swarm(5, 'smoke', () =>
      `left:${r(5, 90)}%;--s:${r(40, 74)}px;--dur:${r(14, 22)}s;animation-delay:-${r(0, 22)}s;--sway:${r(-40, 40)}px`)}
    ${swarm(16, 'ember', () =>
      `left:${r(2, 98)}%;--s:${r(3, 7)}px;--dur:${r(7, 14)}s;animation-delay:-${r(0, 14)}s;--sway:${r(-34, 34)}px;--op:${r(0.45, 0.95)}`)}
  `,
  PullA: () => `
    ${mark('PullA')}
    <div class="fx rays"></div>
    <span class="sp whale" style="top:${r(38, 52)}%;--dur:95s;animation-delay:-${r(10, 80)}s">${SVG.whale}</span>
    ${Array.from({ length: 5 }, () =>
      `<span class="sp fishy" style="top:${r(22, 72)}%;--s:${r(11, 17)}px;--dur:${r(22, 36)}s;animation-delay:-${r(0, 36)}s">${SVG.fish}</span>`).join('')}
    <span class="sp kelp" style="left:3%;--s:${r(100, 130)}px;--dur:${r(6, 8)}s">${SVG.kelp}</span>
    <span class="sp kelp" style="right:5%;--s:${r(80, 110)}px;--dur:${r(7, 9)}s;animation-delay:-3s">${SVG.kelp}</span>
    ${swarm(12, 'bubble', () =>
      `left:${r(2, 98)}%;--s:${r(4, 15)}px;--dur:${r(9, 18)}s;animation-delay:-${r(0, 18)}s;--sway:${r(-40, 40)}px;--op:${r(0.25, 0.6)}`)}
    <span class="sp jelly" style="top:${r(8, 24)}%;--s:52px;--dur:44s;animation-delay:-${r(0, 40)}s">${THEMES.PullA.emblem}</span>
    <span class="sp jelly" style="top:${r(56, 70)}%;--s:34px;--dur:58s;animation-delay:-${r(0, 50)}s">${THEMES.PullA.emblem}</span>
  `,
  LegsA: () => `
    ${mark('LegsA')}
    ${[6, 44, 86].map((x, i) =>
      `<span class="sp vine" style="left:${x}%;--s:${r(110, 150)}px;--dur:${r(6, 9)}s;animation-delay:-${i * 2}s">${SVG.vine}</span>`).join('')}
    ${swarm(12, 'leafp', () =>
      `left:${r(0, 100)}%;--s:${r(8, 15)}px;--dur:${r(10, 19)}s;animation-delay:-${r(0, 19)}s;--sway:${r(-60, 60)}px;--rot:${r(160, 420)}deg;--op:${r(0.35, 0.7)}`)}
    ${swarm(10, 'firefly', () =>
      `left:${r(4, 94)}%;top:${r(10, 88)}%;--dur:${r(3, 6)}s;animation-delay:-${r(0, 6)}s`)}
    <span class="sp butterfly" style="top:${r(14, 30)}%;--s:19px;--c:#ffb340;--dur:${r(30, 40)}s;animation-delay:-${r(0, 30)}s">${SVG.butterfly}</span>
    <span class="sp butterfly" style="top:${r(48, 66)}%;--s:15px;--c:#d98be0;--dur:${r(38, 50)}s;animation-delay:-${r(0, 40)}s">${SVG.butterfly}</span>
  `,
  PushB: () => `
    ${mark('PushB')}
    ${[6, 22, 43, 68, 87].map((x, i) =>
      `<i class="sp drip" style="left:${x}%;--s:${r(20, 30)}px;height:${r(85, 130)}px;--dur:${r(4, 7)}s;animation-delay:-${i}s"></i>`).join('')}
    ${swarm(16, 'sprk', (i) =>
      `left:${r(1, 99)}%;--c:${SPRINKLE_COLORS[i % SPRINKLE_COLORS.length]};--dur:${r(8, 15)}s;animation-delay:-${r(0, 15)}s;--sway:${r(-50, 50)}px;--rot:${r(240, 640)}deg;--op:${r(0.4, 0.8)}`)}
    ${[[8, 24], [70, 15], [38, 66], [84, 74]].map(([x, y]) =>
      `<span class="sp scoop" style="left:${x}%;top:${y}%;--s:${r(30, 52)}px;--dur:${r(7, 11)}s;animation-delay:-${r(0, 10)}s">${THEMES.PushB.emblem}</span>`).join('')}
    <span class="sp scoop pop" style="left:18%;top:78%;--s:30px;--dur:9s;animation-delay:-4s">${SVG.popsicle}</span>
    <span class="sp scoop pop" style="left:88%;top:42%;--s:24px;--dur:8s;animation-delay:-2s">${SVG.popsicle}</span>
    <span class="sp scoop cherry" style="left:55%;top:34%;--s:22px;--dur:10s;animation-delay:-6s">${SVG.cherry}</span>
    <span class="sp scoop cherry" style="left:30%;top:12%;--s:18px;--dur:7s;animation-delay:-3s">${SVG.cherry}</span>
  `,
  PullB: () => `
    ${mark('PullB')}
    <div class="fx aurora"></div>
    <div class="fx aurora a2"></div>
    ${swarm(6, 'star', () =>
      `left:${r(2, 96)}%;top:${r(2, 20)}%;--s:${r(1.5, 2.6)}px;--dur:${r(3, 7)}s;animation-delay:-${r(0, 7)}s`)}
    <span class="sp iceberg" style="--s:${r(54, 70)}px;--dur:150s;animation-delay:-${r(20, 120)}s">${SVG.iceberg}</span>
    <span class="sp iceberg b" style="--s:${r(34, 46)}px;--dur:190s;animation-delay:-${r(60, 170)}s">${SVG.iceberg}</span>
    <span class="sp penguin" style="--s:26px;--dur:85s;animation-delay:-${r(5, 70)}s">${SVG.penguin}</span>
    ${swarm(18, 'snow', () =>
      `left:${r(0, 100)}%;--s:${r(2, 5.5)}px;--dur:${r(11, 24)}s;animation-delay:-${r(0, 24)}s;--sway:${r(-45, 45)}px;--op:${r(0.25, 0.75)}`)}
  `,
  LegsB: () => `
    ${mark('LegsB')}
    <div class="fx sun"></div>
    <span class="fx skyline">${SVG.skyline}</span>
    <div class="fx grid"></div>
    ${swarm(6, 'window', () =>
      `left:${r(4, 94)}%;bottom:${r(40, 45)}%;--dur:${r(2, 6)}s;animation-delay:-${r(0, 6)}s`)}
    ${swarm(3, 'streak', () =>
      `top:${r(53, 59)}%;--dur:${r(2.6, 4.2)}s;animation-delay:-${r(0, 4)}s`)}
    ${swarm(6, 'neon-spark', () =>
      `left:${r(4, 94)}%;top:${r(8, 50)}%;--dur:${r(2.4, 5)}s;animation-delay:-${r(0, 5)}s;--s:${r(2, 4)}px`)}
  `,
};

// Each session is a world, not a color. Name + emblem here; the full
// palette and scene live in styles.css under [data-accent].
const E = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const THEMES = {
  PushA: {
    world: 'Molten Forge',
    emblem: E('<path d="M12 3c2.2 3.4 5 5.2 5 9a5 5 0 0 1-10 0c0-1.9.7-3.4 1.9-4.9.3 1.2 1 2.1 2.1 2.5C10.5 7.4 11 5.2 12 3z"/><path d="M8.5 21h7"/>'),
  },
  PullA: {
    world: 'The Abyss',
    emblem: E('<path d="M5.5 12a6.5 6.5 0 0 1 13 0z"/><path d="M8.5 12c0 2.2-1.1 2.8-1.1 4.6M12 12c0 2.2 1.1 2.8 1.1 5M15.5 12c0 2.2-1.1 2.8-1.1 4.6"/>'),
  },
  LegsA: {
    world: 'Deep Jungle',
    emblem: E('<path d="M12 21C7.6 19.8 5 16.4 5 12.6 5 8.5 8 5.4 12 3c4 2.4 7 5.5 7 9.6 0 3.8-2.6 7.2-7 8.4z"/><path d="M12 7v14M12 11l-3-2M12 14l3-2.5"/>'),
  },
  PushB: {
    world: 'Ice Cream Parlor',
    emblem: E('<path d="M8.3 9C7.4 6 9.3 3.5 12 3.5S16.6 6 15.7 9"/><path d="M7 9h10"/><path d="M8 9l4 11.5L16 9"/>'),
  },
  PullB: {
    world: 'Arctic Expedition',
    emblem: E('<path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9"/><path d="M12 6.5l-2-1.4M12 6.5l2-1.4M12 17.5l-2 1.4M12 17.5l2 1.4"/>'),
  },
  LegsB: {
    world: 'Neon District',
    emblem: E('<path d="M5 15.5a7 7 0 0 1 14 0"/><path d="M8 12.5h8M6.5 9.8l11 .1" opacity=".55"/><path d="M3 18.5h18M7.5 21h9" opacity=".8"/>'),
  },
};
