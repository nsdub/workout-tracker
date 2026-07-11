// THE UNIVERSES. Each session type is a universe; every visit lands in a
// different WORLD inside it — 8 per universe, drawn from a shuffled pool with
// no repeats until the pool is exhausted (and never the same world twice in a
// row across a reshuffle). Every scene is a layered illustration: far plane,
// midground, hero set-piece, foreground, weather. Painted in styles.css.
const r = (a, b) => +(a + Math.random() * (b - a)).toFixed(2);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function sprinkle(n, cls, fn) {
  let out = '';
  for (let i = 0; i < n; i++) out += `<i class="sp ${cls}" style="${fn(i)}"></i>`;
  return out;
}

// A full-bleed scenery layer: bottom-anchored svg band that slices to fit.
const L = (h, z, inner, vw = 800, vh = 320, extra = '') =>
  `<div class="fx L" style="--h:${h}%;z-index:${z};${extra}"><svg viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="xMidYMax slice">${inner}</svg></div>`;

// A placed hero piece (positioned via inline style, keeps aspect).
const H = (style, vw, vh, inner, cls = '') =>
  `<div class="fx H ${cls}" style="${style}"><svg viewBox="0 0 ${vw} ${vh}">${inner}</svg></div>`;

// ——— art generators ———

// jagged ridge silhouette across a layer
function ridge(vw, vh, ytop, amp, fill, op = 1) {
  const n = 9;
  let pts = `0,${vh} 0,${(ytop + r(-amp / 2, amp / 2)).toFixed(0)}`;
  for (let i = 1; i <= n; i++) {
    pts += ` ${Math.round((vw * i) / n)},${(ytop + (i % 2 ? -1 : 1) * r(amp * 0.35, amp)).toFixed(0)}`;
  }
  pts += ` ${vw},${vh}`;
  return `<polygon points="${pts}" fill="${fill}" opacity="${op}"/>`;
}

// a forest row of three-tier pines
function pines(vw, vh, n, tone, h1, h2, op = 1, snow = null) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = r(10, vw - 10), h = r(h1, h2), w = h * 0.58, y = vh;
    s += `<path d="M${x} ${y - h} L${x - w * 0.30} ${y - h * 0.58} L${x - w * 0.16} ${y - h * 0.58} L${x - w * 0.42} ${y - h * 0.26} L${x - w * 0.24} ${y - h * 0.26} L${x - w * 0.52} ${y} L${x + w * 0.52} ${y} L${x + w * 0.24} ${y - h * 0.26} L${x + w * 0.42} ${y - h * 0.26} L${x + w * 0.16} ${y - h * 0.58} L${x + w * 0.30} ${y - h * 0.58} Z" fill="${tone}" opacity="${op}"/>`;
    if (snow) s += `<path d="M${x} ${y - h} L${x - w * 0.18} ${y - h * 0.72} L${x + w * 0.18} ${y - h * 0.72} Z" fill="${snow}" opacity="${op}"/>`;
  }
  return s;
}

// bamboo stalk with joints and side leaves
function bamboo(x, vh, h, w, tone, leaf) {
  let s = `<rect x="${x - w / 2}" y="${vh - h}" width="${w}" height="${h}" rx="${w / 2}" fill="${tone}"/>`;
  for (let y = vh - h + r(14, 24); y < vh - 8; y += r(26, 40)) {
    s += `<rect x="${x - w / 2 - 1}" y="${y}" width="${w + 2}" height="2.4" rx="1" fill="${leaf}" opacity=".8"/>`;
    if (Math.random() > 0.45) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      s += `<path d="M${x + dir * w / 2} ${y} q ${dir * 14} -4 ${dir * 26} -14 q ${dir * -8} 12 ${dir * -24} 16 z" fill="${leaf}" opacity=".9"/>`;
    }
  }
  return s;
}

// a proper multi-roof pagoda
function pagoda(x, y, s, body, roof, glow = null) {
  const tier = (ty, w, rh) => `
    <path d="M${x - w} ${ty} Q${x - w * 0.5} ${ty - rh * 0.34} ${x} ${ty - rh * 0.4} Q${x + w * 0.5} ${ty - rh * 0.34} ${x + w} ${ty} L${x + w * 0.86} ${ty + rh * 0.24} Q${x} ${ty - rh * 0.08} ${x - w * 0.86} ${ty + rh * 0.24} Z" fill="${roof}"/>`;
  return `
    <rect x="${x - 34 * s}" y="${y - 28 * s}" width="${68 * s}" height="${28 * s}" fill="${body}"/>
    ${glow ? `<rect x="${x - 10 * s}" y="${y - 22 * s}" width="${20 * s}" height="${16 * s}" fill="${glow}"><animate attributeName="opacity" values="1;.55;1" dur="3.4s" repeatCount="indefinite"/></rect>` : ''}
    ${tier(y - 28 * s, 46 * s, 26 * s)}
    <rect x="${x - 26 * s}" y="${y - 62 * s}" width="${52 * s}" height="${20 * s}" fill="${body}"/>
    ${tier(y - 62 * s, 38 * s, 24 * s)}
    <rect x="${x - 19 * s}" y="${y - 92 * s}" width="${38 * s}" height="${18 * s}" fill="${body}"/>
    ${tier(y - 92 * s, 30 * s, 22 * s)}
    <path d="M${x} ${y - 118 * s} l${5 * s} ${12 * s} h${-10 * s} Z" fill="${roof}"/>
    <line x1="${x}" y1="${y - 126 * s}" x2="${x}" y2="${y - 112 * s}" stroke="${roof}" stroke-width="${2.4 * s}"/>`;
}

// a torii gate with curved double lintel
function torii(x, y, s, tone) {
  return `
    <path d="M${x - 46 * s} ${y - 78 * s} Q${x} ${y - 92 * s} ${x + 46 * s} ${y - 78 * s} l${4 * s} ${8 * s} Q${x} ${y - 84 * s} ${x - 50 * s} ${y - 70 * s} Z" fill="${tone}"/>
    <rect x="${x - 38 * s}" y="${y - 64 * s}" width="${76 * s}" height="${6 * s}" fill="${tone}"/>
    <rect x="${x - 3 * s}" y="${y - 64 * s}" width="${6 * s}" height="${-14 * s + 14 * s + 14 * s}" fill="${tone}"/>
    <rect x="${x - 30 * s}" y="${y - 70 * s}" width="${7 * s}" height="${70 * s}" fill="${tone}" transform="rotate(-2 ${x - 26 * s} ${y})"/>
    <rect x="${x + 23 * s}" y="${y - 70 * s}" width="${7 * s}" height="${70 * s}" fill="${tone}" transform="rotate(2 ${x + 26 * s} ${y})"/>`;
}

// a stone lantern
function stoneLantern(x, y, s, tone, glow) {
  return `
    <rect x="${x - 5 * s}" y="${y - 20 * s}" width="${10 * s}" height="${20 * s}" fill="${tone}"/>
    <rect x="${x - 12 * s}" y="${y - 26 * s}" width="${24 * s}" height="${6 * s}" rx="${2 * s}" fill="${tone}"/>
    <rect x="${x - 8 * s}" y="${y - 40 * s}" width="${16 * s}" height="${14 * s}" fill="${tone}"/>
    <rect x="${x - 5 * s}" y="${y - 37 * s}" width="${10 * s}" height="${8 * s}" fill="${glow}"><animate attributeName="opacity" values="1;.5;1" dur="${r(2.2, 3.6)}s" repeatCount="indefinite"/></rect>
    <path d="M${x - 14 * s} ${y - 40 * s} Q${x} ${y - 50 * s} ${x + 14 * s} ${y - 40 * s} Z" fill="${tone}"/>`;
}

// window rows for buildings
function windows(x, y, cols, rows, w, h, gap, lit, dim) {
  let s = '';
  for (let c = 0; c < cols; c++) for (let rw = 0; rw < rows; rw++) {
    const on = Math.random() > 0.4;
    s += `<rect x="${x + c * (w + gap)}" y="${y + rw * (h + gap)}" width="${w}" height="${h}" fill="${on ? lit : dim}"/>`;
  }
  return s;
}

// ——— particle kits (costumes in styles.css) ———

const fish = (n, band = [15, 80], s = [10, 22]) => Array.from({ length: n }, () =>
  `<span class="sp fishy" style="top:${r(band[0], band[1])}%;--s:${r(s[0], s[1])}px;--dur:${r(18, 36)}s;animation-delay:-${r(0, 36)}s">
    <svg viewBox="0 0 16 8" fill="currentColor"><path d="M1 4c3-3 8-3 11 0-3 3-8 3-11 0z"/><path d="M11.5 4l3.5-3v6z"/><circle cx="4" cy="3.4" r=".7" fill="#04121c"/></svg>
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

const stars = (n, top = [0, 60]) => sprinkle(n, 'star', () =>
  `left:${r(0, 100)}%;top:${r(top[0], top[1])}%;--d:${r(1.6, 4.5)}s;animation-delay:-${r(0, 4)}s;--s:${r(1.5, 3.2)}px`);

const fireflies = (n) => sprinkle(n, 'firefly', () =>
  `left:${r(6, 92)}%;top:${r(30, 80)}%;--dur:${r(3, 6)}s;animation-delay:-${r(0, 6)}s`);

const wisps = (n, colors) => sprinkle(n, 'wisp', (i) =>
  `left:${r(6, 92)}%;top:${r(28, 78)}%;--c:${colors[i % colors.length]};--dur:${r(4, 8)}s;animation-delay:-${r(0, 8)}s`);

const rain = (n) => sprinkle(n, 'rain', () =>
  `left:${r(0, 100)}%;--dur:${r(0.7, 1.3)}s;animation-delay:-${r(0, 1.3)}s;--sway:${r(-30, -10)}px;--rot:0deg`);

// Mario rule: the sky is inhabited. Stars with faces, bobbing in the air.
const starfaces = (n, top = [6, 40]) => Array.from({ length: n }, () =>
  `<span class="sp starface" style="left:${r(4, 92)}%;top:${r(top[0], top[1])}%;--d:${r(3, 6)}s;animation-delay:-${r(0, 5)}s;width:${r(18, 34)}px">
    <svg viewBox="0 0 30 30"><path d="M15 1 L18.7 10.4 L28.5 11 L20.9 17.4 L23.4 27 L15 21.6 L6.6 27 L9.1 17.4 L1.5 11 L11.3 10.4 Z" fill="#ffd24a" stroke="#c2822c" stroke-width="1.4"/><circle cx="12" cy="13.4" r="1.5" fill="#2a1a08"/><circle cx="18" cy="13.4" r="1.5" fill="#2a1a08"/><path d="M12.6 17 q2.4 1.8 4.8 0" stroke="#2a1a08" stroke-width="1.2" fill="none"/></svg>
  </span>`).join('');

const lanterns = (n) => Array.from({ length: n }, (_, i) =>
  `<span class="sp lantern" style="left:${6 + i * (88 / Math.max(1, n - 1))}%;top:${r(4, 12)}%;--d:${r(3, 6)}s;--c:${['#ff5d5d', '#ffb84d', '#ff8a5c'][i % 3]}">
    <svg viewBox="0 0 20 30"><rect x="7" y="0" width="6" height="3" fill="#5a3218"/><ellipse cx="10" cy="13" rx="8" ry="10" fill="var(--c,#ff5d5d)"/><path d="M2 10h16M2 13h16M2 16h16" stroke="#7a1f12" stroke-width=".8" opacity=".7"/><rect x="7" y="23" width="6" height="3.4" fill="#5a3218"/><path d="M10 26.4v2.6" stroke="#e8b84d" stroke-width="2"/><ellipse cx="10" cy="13" rx="4" ry="7" fill="#ffe9b3" opacity=".55"><animate attributeName="opacity" values=".55;.25;.55" dur="${r(2, 4)}s" repeatCount="indefinite"/></ellipse></svg>
  </span>`).join('');

// ═══════════════ THE SIX UNIVERSES ═══════════════

export const UNIVERSES = {
  // ————— PUSH A — MOUNT VOLCANO DOJO: brush-painted training mountain —————
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
          ${L(58, 1, `${ridge(800, 320, 150, 46, '#3a2a48', .55)}${ridge(800, 320, 210, 40, '#2c2038', .8)}`)}
          ${L(46, 2, `
            ${ridge(800, 320, 120, 30, '#1c1426')}
            <path d="M330 320 L400 60 L470 320 Z" fill="#241a30"/>
            ${pagoda(400, 78, 0.62, '#160f20', '#c23b22', '#ffb84d')}
            <path d="M398 96 L340 150 L392 150 L322 214 L386 214 L300 320 L520 320 L420 214 L470 214 L412 150 L458 150 Z" fill="none" stroke="#e8c8a0" stroke-width="3" stroke-dasharray="7 6" opacity=".6"/>
            ${stoneLantern(300, 320, 1, '#0e0a16', '#ffb84d')}${stoneLantern(508, 320, 1, '#0e0a16', '#ffb84d')}
          `)}
          ${L(20, 3, pines(800, 320, 15, '#0c0814', 90, 190))}
          <div class="fx bigsun" style="right:9%;top:5%;--c1:#e8543a;--c2:#b32e18;--s:84px"></div>
          ${petals(20, ['#e8a0b4', '#f2c4d0', '#d97a94'])}
          ${sprinkle(3, 'brushbird', () => `left:${r(10, 80)}%;top:${r(8, 22)}%;--d:${r(4, 7)}s`)}
          <div class="fx mist" style="bottom:16%;height:14%"></div>
        `,
      },
      {
        id: 'waterfall', name: 'The Waterfall of Discipline', cls: 'dojo-falls',
        scene: () => `
          ${L(74, 1, `
            <path d="M0 320 L0 30 Q60 44 88 96 Q118 150 96 320 Z" fill="#141e2a"/>
            <path d="M800 320 L800 16 Q710 36 686 100 Q664 160 700 320 Z" fill="#141e2a"/>
            <path d="M0 84 Q40 92 70 120 M800 70 Q740 84 706 118" stroke="#22304a" stroke-width="8" fill="none"/>
            ${pines(160, 320, 3, '#0e1620', 60, 90)}
          `)}
          ${L(70, 2, `
            <rect x="360" y="0" width="90" height="248" fill="#8fc8e8" opacity=".28"/>
            <rect x="374" y="0" width="18" height="248" fill="#dff2ff" opacity=".5"><animate attributeName="x" values="374;404;374" dur="2.8s" repeatCount="indefinite"/></rect>
            <rect x="418" y="0" width="10" height="248" fill="#dff2ff" opacity=".35"><animate attributeName="x" values="418;382;418" dur="3.6s" repeatCount="indefinite"/></rect>
            <ellipse cx="405" cy="252" rx="86" ry="14" fill="#bfe6f8" opacity=".4"><animate attributeName="rx" values="86;100;86" dur="2.2s" repeatCount="indefinite"/></ellipse>
            <ellipse cx="405" cy="252" rx="40" ry="8" fill="#ffffff" opacity=".5"><animate attributeName="rx" values="40;62;40" dur="1.6s" repeatCount="indefinite"/></ellipse>
            <path d="M0 268 Q200 254 400 262 T800 260 L800 320 L0 320 Z" fill="#0f2432"/>
            <path d="M60 284 q30 -6 60 0 M300 292 q40 -8 80 0 M560 286 q36 -7 70 0" stroke="#2a4a5e" stroke-width="3" fill="none"/>
          `)}
          ${H('left:6%;bottom:8%;width:150px', 160, 80, `
            <rect x="0" y="34" width="160" height="10" rx="4" fill="#5a3a22"/>
            <path d="M0 40 Q80 8 160 40" fill="none" stroke="#7a5230" stroke-width="9"/>
            <rect x="16" y="20" width="7" height="28" fill="#5a3a22"/><rect x="76" y="10" width="7" height="34" fill="#5a3a22"/><rect x="136" y="20" width="7" height="28" fill="#5a3a22"/>
          `)}
          ${sprinkle(2, 'koi', (i) => `top:${r(66, 76)}%;--dur:${r(26, 40)}s;animation-delay:-${r(0, 30)}s;--c:${i ? '#e8843c' : '#e05a5a'}`)}
          ${bubbles(8)}
          ${petals(8, ['#e8a0b4', '#f2c4d0'])}
          <div class="fx mist" style="bottom:22%;height:16%"></div>
        `,
      },
      {
        id: 'summit', name: 'The Lava-Forge Summit', cls: 'dojo-summit',
        scene: () => `
          <div class="fx bigsun" style="left:50%;margin-left:-80px;top:4%;--c1:#e8543a;--c2:#8a1c0e;--s:160px"></div>
          ${L(56, 1, `
            <path d="M0 320 Q120 220 240 236 Q300 244 340 224 L400 160 L460 224 Q520 248 620 232 Q720 218 800 320 Z" fill="#2a0f10"/>
            <path d="M388 176 L400 160 L414 178 L406 190 Z" fill="#ff7a2c"><animate attributeName="opacity" values="1;.6;1" dur="1.8s" repeatCount="indefinite"/></path>
            <path d="M400 190 q-6 40 4 70 q8 26 0 60" stroke="#ff6a2c" stroke-width="5" fill="none" opacity=".9"><animate attributeName="opacity" values=".9;.5;.9" dur="2.4s" repeatCount="indefinite"/></path>
            <path d="M368 240 q10 30 2 80 M436 244 q-8 36 2 76" stroke="#ffb84d" stroke-width="3" fill="none" opacity=".6"><animate attributeName="opacity" values=".6;.25;.6" dur="3s" repeatCount="indefinite"/></path>
          `)}
          ${L(30, 2, `
            <rect x="70" y="200" width="150" height="120" fill="#160a0c"/>
            <path d="M50 208 L145 150 L240 208 Z" fill="#0e0608"/>
            <rect x="120" y="250" width="46" height="70" fill="#ff8a3c" opacity=".9"><animate attributeName="opacity" values=".9;.5;.9" dur="2.2s" repeatCount="indefinite"/></rect>
            <path d="M132 250 h22 v-14 a11 11 0 0 0 -22 0 Z" fill="#160a0c"/>
            <rect x="250" y="266" width="90" height="12" rx="5" fill="#241014"/>
            <rect x="262" y="234" width="14" height="34" fill="#241014"/>
            <path d="M300 244 l30 -10 v20 Z" fill="#241014"/>
            ${torii(660, 320, 1, '#3a0f0f')}
          `)}
          ${embers(20)}
          ${sprinkle(5, 'brushsmoke', () => `left:${r(8, 88)}%;--s:${r(30, 60)}px;--dur:${r(13, 20)}s;animation-delay:-${r(0, 18)}s;--sway:${r(-30, 30)}px`)}
        `,
      },
      {
        id: 'bamboo', name: 'The Bamboo Grove', cls: 'dojo-bamboo',
        scene: () => `
          ${L(96, 1, `
            ${[80, 210, 340, 470, 600, 730].map((x) => bamboo(x + r(-30, 30), 320, r(260, 316), r(9, 13), '#2c4a2c', '#476b3c')).join('')}
          `, 800, 320)}
          ${L(88, 2, `
            ${[40, 170, 300, 430, 560, 690, 780].map((x) => bamboo(x + r(-24, 24), 320, r(280, 318), r(13, 19), '#1c3420', '#2f5230')).join('')}
          `, 800, 320)}
          ${L(24, 3, `
            <ellipse cx="400" cy="330" rx="420" ry="40" fill="#101c10"/>
            ${stoneLantern(150, 308, 1.5, '#141c12', '#ffe9b3')}
            <path d="M540 308 q20 -30 60 -28 q-14 24 -60 28 Z" fill="#182a16"/>
          `)}
          <div class="fx godray" style="left:24%;--d:6s"></div>
          <div class="fx godray" style="left:58%;--d:8s;animation-delay:-3s"></div>
          ${petals(16, ['#9fd48a', '#7ab868', '#c8e8a8'])}
          ${fireflies(6)}
        `,
      },
      {
        id: 'torii', name: 'The Ten Thousand Torii', cls: 'dojo-torii',
        scene: () => `
          ${L(78, 1, `
            ${ridge(800, 320, 130, 36, '#241028', .7)}
            ${torii(400, 300, 0.34, '#5a1c14')}
            ${torii(400, 306, 0.52, '#7a2418')}
            ${torii(400, 314, 0.78, '#9a2e1a')}
          `)}
          ${L(66, 2, `
            ${torii(400, 316, 1.2, '#b3361e')}
            <path d="M340 316 h120 M348 300 h104" stroke="#1c0f18" stroke-width="4" opacity=".55"/>
          `)}
          ${L(30, 3, `
            <path d="M0 320 L800 320 L800 280 Q400 260 0 280 Z" fill="#160b14"/>
            <path d="M320 292 Q400 284 480 292 L470 320 L330 320 Z" fill="#241422"/>
            <path d="M120 276 q10 -26 26 -30 q4 16 -6 32 q16 -8 22 2 q-18 14 -42 -4 Z" fill="#101018"/>
            <path d="M646 276 q-10 -26 -26 -30 q-4 16 6 32 q-16 -8 -22 2 q18 14 42 -4 Z" fill="#101018"/>
          `)}
          ${wisps(6, ['#7ab8ff', '#9fd4ff', '#c8e8ff'])}
          ${petals(9, ['#e8a0b4', '#d97a94'])}
          ${stars(12, [0, 28])}
        `,
      },
      {
        id: 'snowtemple', name: 'The Snowbound Temple', cls: 'dojo-snow',
        scene: () => `
          ${L(60, 1, `${ridge(800, 320, 120, 50, '#2a3448', .6)}${ridge(800, 320, 190, 40, '#1f2838', .85)}`)}
          ${L(48, 2, `
            ${pines(800, 320, 10, '#141c2a', 70, 150, 1, '#e8f0f8')}
            ${pagoda(560, 300, 1.05, '#101622', '#8a2418', '#ffd9a3')}
            <path d="M494 236 Q560 220 626 236 M506 172 Q560 158 614 172 M516 112 Q560 100 604 112" stroke="#e8f0f8" stroke-width="7" fill="none" stroke-linecap="round"/>
            ${stoneLantern(430, 300, 1.3, '#141c2a', '#ffd9a3')}
          `)}
          ${L(16, 3, `<path d="M0 320 L800 320 L800 272 Q560 258 400 268 Q200 278 0 264 Z" fill="#dfe8f2"/><path d="M240 290 q40 -8 90 0 M480 296 q50 -10 100 -2" stroke="#b8c8dc" stroke-width="3" fill="none"/>`)}
          ${snowfall(24)}
        `,
      },
      {
        id: 'hall', name: 'The Sparring Hall', cls: 'dojo-hall',
        scene: () => `
          ${L(100, 1, `
            <rect x="0" y="0" width="800" height="26" fill="#241208"/>
            <rect x="0" y="26" width="800" height="8" fill="#160a04"/>
            <rect x="60" y="0" width="16" height="320" fill="#241208"/><rect x="724" y="0" width="16" height="320" fill="#241208"/>
            <rect x="380" y="0" width="16" height="320" fill="#1c0e06"/>
            <path d="M0 230 L800 230 L800 320 L0 320 Z" fill="#2c1810"/>
            ${[0, 1, 2, 3, 4].map((i) => `<path d="M${i * 200 - 100} 320 L${i * 200 + 60} 230" stroke="#1c0e06" stroke-width="3"/>`).join('')}
            <path d="M0 252 h800 M0 282 h800" stroke="#1c0e06" stroke-width="2.4"/>
          `)}
          ${L(84, 2, `
            <g transform="rotate(-1 170 100)"><rect x="140" y="40" width="60" height="150" fill="#e8d5ae"/><rect x="140" y="40" width="60" height="10" fill="#7a1f12"/><path d="M158 70 q12 8 0 22 q14 4 8 20 M182 66 q-10 12 2 24" stroke="#2b1c14" stroke-width="4" fill="none" stroke-linecap="round"/></g>
            <g transform="rotate(1.5 630 100)"><rect x="600" y="52" width="60" height="140" fill="#e8d5ae"/><rect x="600" y="52" width="60" height="10" fill="#7a1f12"/><circle cx="630" cy="110" r="17" fill="none" stroke="#b3361e" stroke-width="5"/><path d="M622 146 q8 8 16 0" stroke="#2b1c14" stroke-width="4" fill="none"/></g>
            <rect x="330" y="150" width="140" height="10" rx="4" fill="#3a2010"/>
            <rect x="345" y="118" width="110" height="7" rx="3" fill="#5a3418"/><rect x="352" y="96" width="96" height="7" rx="3" fill="#5a3418"/>
            <circle cx="400" cy="66" r="20" fill="none" stroke="#c23b22" stroke-width="6"/>
          `)}
          ${sprinkle(5, 'candle', () => `left:${r(10, 88)}%;bottom:${r(10, 16)}%;top:auto;--d:${r(0.6, 1.6)}s`)}
          ${sprinkle(8, 'dust', () => `left:${r(0, 100)}%;--dur:${r(16, 30)}s;animation-delay:-${r(0, 30)}s`)}
        `,
      },
      {
        id: 'dragonspine', name: "The Dragon's Spine", cls: 'dojo-dragon',
        scene: () => `
          ${L(44, 1, `
            <ellipse cx="140" cy="300" rx="180" ry="60" fill="#3a2a48" opacity=".5"/>
            <ellipse cx="460" cy="316" rx="240" ry="70" fill="#3a2a48" opacity=".4"/>
            <ellipse cx="740" cy="300" rx="170" ry="56" fill="#3a2a48" opacity=".5"/>
          `)}
          ${L(34, 2, `
            <path d="M0 320 L60 250 L130 296 L210 218 L290 288 L370 200 L450 282 L530 226 L610 296 L690 240 L800 320 Z" fill="#1a1226"/>
            ${[210, 370, 530].map((x, i) => `<path d="M${x} ${[218, 200, 226][i]} l-9 -22 l9 7 l4 -14 l6 14 l9 -7 l-9 22 Z" fill="#12091c"/>`).join('')}
          `)}
          <span class="sp dragon" style="top:${r(10, 22)}%;--dur:64s;animation-delay:-${r(0, 55)}s">
            <svg viewBox="0 0 220 70">
              <path d="M8 40 Q40 12 78 30 Q116 48 150 30 Q180 16 204 30" fill="none" stroke="#3fae6b" stroke-width="13" stroke-linecap="round"/>
              <path d="M8 40 Q40 12 78 30 Q116 48 150 30 Q180 16 204 30" fill="none" stroke="#2c7a4c" stroke-width="13" stroke-linecap="round" stroke-dasharray="4 9"/>
              ${[30, 62, 96, 130, 164].map((x, i) => `<path d="M${x} ${[26, 20, 38, 36, 20][i]} l4 -10 l5 9" stroke="#e05a5a" stroke-width="3" fill="none"/>`).join('')}
              <circle cx="206" cy="28" r="11" fill="#3fae6b"/>
              <circle cx="209" cy="25" r="2" fill="#0c0814"/>
              <path d="M212 20 q7 -8 3 -14 M204 19 q-2 -9 -8 -11" stroke="#e8b84d" stroke-width="2.6" fill="none"/>
              <path d="M215 30 q9 2 13 8 M214 33 q7 6 8 12" stroke="#3fae6b" stroke-width="2" fill="none"><animate attributeName="opacity" values="1;.5;1" dur="1.4s" repeatCount="indefinite"/></path>
              <circle cx="228" cy="24" r="4" fill="#ffd24a" opacity=".9"><animate attributeName="r" values="4;5.4;4" dur="1.8s" repeatCount="indefinite"/></circle>
            </svg>
          </span>
          ${stars(16, [0, 40])}
          ${starfaces(2, [4, 26])}
          ${sprinkle(4, 'brushsmoke', () => `left:${r(8, 88)}%;--s:${r(34, 60)}px;--dur:${r(14, 22)}s;animation-delay:-${r(0, 20)}s;--sway:${r(-24, 24)}px`)}
          ${petals(7, ['#e8a0b4', '#d97a94'])}
        `,
      },
    ],
  },

  // ————— PULL A — THE DEEP: bioluminescent trench civilization —————
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
          ${L(46, 1, `${ridge(800, 320, 150, 60, '#081c28', .8)}${ridge(800, 320, 230, 40, '#06141e')}`)}
          ${L(40, 2, `
            <path d="M120 320 L134 180 Q150 160 166 180 L186 320 Z" fill="#0a1620"/>
            <path d="M380 320 L392 140 Q410 116 430 140 L448 320 Z" fill="#0c1a26"/>
            <path d="M640 320 L652 200 Q666 182 682 200 L698 320 Z" fill="#0a1620"/>
            ${[150, 410, 668].map((x, i) => `
              <ellipse cx="${x}" cy="${[176, 136, 196][i]}" rx="13" ry="7" fill="#1c2c36"/>
              <path d="M${x - 8} ${[172, 132, 192][i]} q4 -60 -6 -110 M${x} ${[170, 130, 190][i]} q2 -70 10 -120 M${x + 8} ${[172, 132, 192][i]} q8 -50 2 -100" stroke="#6a8a96" stroke-width="7" fill="none" opacity=".35" stroke-linecap="round">
                <animate attributeName="opacity" values=".35;.6;.35" dur="${r(3, 5)}s" repeatCount="indefinite"/>
              </path>`).join('')}
            ${[70, 240, 300, 520, 580, 760].map((x) => {
              const h = r(30, 62);
              return `<g><path d="M${x} 320 q-3 -${h * 0.6} 0 -${h}" stroke="#d9d0c0" stroke-width="7" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="-4 ${x} 320;5 ${x} 320;-4 ${x} 320" dur="${r(4, 8)}s" repeatCount="indefinite"/></path><circle cx="${x}" cy="${320 - h}" r="6" fill="#e05a4a"><animateTransform attributeName="transform" type="rotate" values="-4 ${x} 320;5 ${x} 320;-4 ${x} 320" dur="${r(4, 8)}s" repeatCount="indefinite"/></circle></g>`;
            }).join('')}
          `)}
          <div class="fx glowbed" style="--c:rgba(255,122,60,.3)"></div>
          ${bubbles(16)}
          ${fish(5, [16, 52])}
          ${sprinkle(6, 'spark', () => `left:${r(10, 90)}%;top:${r(48, 72)}%;--c:#ff9a5c;--dur:${r(3, 6)}s;animation-delay:-${r(0, 6)}s`)}
        `,
      },
      {
        id: 'whalefall', name: 'Whale-Fall City', cls: 'deep-whalefall',
        scene: () => `
          ${L(38, 1, ridge(800, 320, 190, 46, '#061622', .9))}
          ${L(34, 2, `
            <path d="M96 268 q-38 -6 -58 -34 q-8 -14 2 -24 q34 -8 62 12 q20 -34 58 -34 q30 0 40 22 q-12 34 -44 42 q-24 8 -60 16 Z" fill="#b8c9c4" opacity=".85"/>
            <circle cx="70" cy="226" r="5" fill="#04121c"/>
            <path d="M150 232 q60 -22 120 -14" stroke="#b8c9c4" stroke-width="8" fill="none" opacity=".8"/>
            ${[170, 205, 240, 275, 310, 345, 380, 415, 450, 485].map((x, i) => `
              <rect x="${x}" y="${222 + i * 1.5}" width="12" height="16" rx="4" fill="#b8c9c4" opacity=".85" transform="rotate(${r(-10, 10)} ${x} 230)"/>
              <path d="M${x + 6} ${238 + i * 1.5} q${18 - i} 44 ${8 - i} ${74 - i * 4}" stroke="#a3b8b2" stroke-width="6" fill="none" opacity="${(0.8 - i * 0.05).toFixed(2)}" stroke-linecap="round"/>`).join('')}
            <path d="M505 240 q30 10 50 34 M505 246 q20 16 30 40" stroke="#a3b8b2" stroke-width="5" fill="none" opacity=".5"/>
            <path d="M120 300 q8 -18 24 -8 q10 8 -2 16 q14 0 12 12 l-40 0 Z" fill="#12242e"/>
            ${windows(560, 250, 4, 3, 9, 12, 7, '#38dcc8', '#0c2430')}
            <rect x="552" y="238" width="80" height="82" fill="none" stroke="#12303c" stroke-width="6"/>
            <path d="M552 238 l40 -26 l40 26" fill="none" stroke="#12303c" stroke-width="6"/>
          `)}
          ${bubbles(10)}
          ${fish(9, [10, 66], [8, 18])}
          ${sprinkle(12, 'marine-snow', () => `left:${r(0, 100)}%;--dur:${r(16, 30)}s;animation-delay:-${r(0, 30)}s;--sway:${r(-16, 16)}px`)}
        `,
      },
      {
        id: 'anglermarket', name: 'The Anglerfish Night Market', cls: 'deep-market',
        scene: () => `
          ${L(44, 1, `
            ${[90, 330, 570].map((x, i) => `
              <rect x="${x}" y="${210 - i * 6}" width="130" height="${110 + i * 6}" fill="#0a1a24"/>
              <path d="M${x - 14} ${214 - i * 6} L${x + 65} ${180 - i * 6} L${x + 144} ${214 - i * 6} Z" fill="#122a36"/>
              <rect x="${x + 16}" y="${242 - i * 6}" width="98" height="42" fill="#0e2430"/>
              <ellipse cx="${x + 65}" cy="${236 - i * 6}" rx="10" ry="13" fill="#8ff2e0" opacity=".9"><animate attributeName="opacity" values=".9;.5;.9" dur="${r(1.8, 3.2)}s" repeatCount="indefinite"/></ellipse>
              <path d="M${x + 65} ${222 - i * 6} v-12" stroke="#2c4a52" stroke-width="3"/>
              ${[0, 1, 2].map((k) => `<circle cx="${x + 34 + k * 32}" cy="${262 - i * 6}" r="5" fill="${['#ff8f5c', '#38dcc8', '#e0b84d'][k]}" opacity=".85"/>`).join('')}
              <path d="M${x + 22} ${292 - i * 6} q10 -8 20 0 M${x + 70} ${292 - i * 6} q10 -8 20 0" stroke="#1c3a46" stroke-width="4" fill="none"/>`).join('')}
            <path d="M0 320 h800" stroke="#08141c" stroke-width="24"/>
          `)}
          <span class="sp angler" style="top:${r(16, 34)}%;--dur:58s;animation-delay:-${r(0, 50)}s">
            <svg viewBox="0 0 110 60">
              <path d="M12 34 Q30 10 62 12 Q92 14 100 32 Q92 50 60 52 Q28 54 12 34 Z" fill="#0e2028"/>
              <path d="M60 12 Q66 2 78 4 L72 14 Z M58 52 Q64 60 76 58 L70 48 Z" fill="#0e2028"/>
              <path d="M100 32 L108 24 L108 42 Z" fill="#0e2028"/>
              <path d="M30 14 Q38 -4 56 2" fill="none" stroke="#0e2028" stroke-width="3.4"/>
              <circle cx="58" cy="0" r="5" fill="#8ff2e0"><animate attributeName="opacity" values="1;.35;1" dur="1.5s" repeatCount="indefinite"/></circle>
              <circle cx="34" cy="26" r="4.5" fill="#8ff2e0"/><circle cx="35.5" cy="25" r="1.6" fill="#04121c"/>
              <path d="M18 38 L28 34 L24 42 L34 39 L31 46 L40 43" stroke="#dff6f0" stroke-width="2.4" fill="none"/>
              <path d="M46 46 q10 5 22 3 M50 20 q-6 -6 -2 -12" stroke="#1c3a42" stroke-width="2" fill="none"/>
            </svg>
          </span>
          ${sprinkle(8, 'lure', () => `left:${r(6, 94)}%;top:${r(6, 46)}%;--d:${r(2, 5)}s;--s:${r(5, 11)}px`)}
          ${bubbles(9)}
          ${fish(6, [46, 78], [8, 15])}
        `,
      },
      {
        id: 'kelp', name: 'The Kelp Cathedral', cls: 'deep-kelp',
        scene: () => `
          ${L(94, 1, `
            ${[60, 190, 330, 470, 610, 750].map((x) => {
              const bend = r(-30, 30), h = r(230, 315);
              return `<g><path d="M${x} 320 Q${x + bend} ${320 - h * 0.5} ${x + bend * 0.4} ${320 - h}" stroke="#0e3626" stroke-width="10" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="-2 ${x} 320;2.5 ${x} 320;-2 ${x} 320" dur="${r(6, 11)}s" repeatCount="indefinite"/></path>${[0.25, 0.45, 0.65, 0.85].map((f) => `<path d="M${x + bend * f * 0.7} ${320 - h * f} q${r(14, 26)} ${r(-4, 6)} ${r(30, 44)} ${r(-14, -2)} q${r(-16, -8)} ${r(10, 16)} ${r(-30, -22)} ${r(8, 14)} Z" fill="#14532f" opacity=".85"><animateTransform attributeName="transform" type="rotate" values="-2 ${x} 320;2.5 ${x} 320;-2 ${x} 320" dur="${r(6, 11)}s" repeatCount="indefinite"/></path>`).join('')}</g>`;
            }).join('')}
          `)}
          ${L(20, 2, `
            <path d="M0 320 L800 320 L800 290 Q400 276 0 292 Z" fill="#08201a"/>
            ${[120, 300, 500, 680].map((x) => `<circle cx="${x}" cy="308" r="${r(8, 14)}" fill="#0e2e22"/><g>${[0, 45, 90, 135].map((a) => `<line x1="${x}" y1="308" x2="${x + 18 * Math.cos(a * Math.PI / 180)}" y2="${308 - 18 * Math.sin(a * Math.PI / 180)}" stroke="#123a2a" stroke-width="2.6"/>`).join('')}</g>`).join('')}
          `)}
          <div class="fx godray" style="left:16%;--d:5s"></div>
          <div class="fx godray" style="left:44%;--d:7s;animation-delay:-2s"></div>
          <div class="fx godray" style="left:72%;--d:6s;animation-delay:-4s"></div>
          ${fish(8, [12, 70], [8, 16])}
          ${bubbles(12)}
        `,
      },
      {
        id: 'ballroom', name: 'The Jellyfish Ballroom', cls: 'deep-jelly',
        scene: () => `
          ${L(24, 1, `
            <path d="M0 320 L800 320 L800 284 Q400 268 0 286 Z" fill="#0c1c33"/>
            ${[100, 240, 380, 520, 660].map((x) => `<ellipse cx="${x}" cy="${r(288, 306)}" rx="${r(16, 30)}" ry="5" fill="#16305c" opacity=".8"/>`).join('')}
          `)}
          ${H('left:50%;top:2%;width:70px;margin-left:-35px', 70, 150, `
            <line x1="35" y1="0" x2="35" y2="24" stroke="#2a4a7c" stroke-width="3"/>
            ${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${35 + (i % 2 ? 13 : -13)}" cy="${34 + i * 18}" r="6" fill="${['#8fb8ff', '#ff9ad4', '#8ff2e0'][i % 3]}"><animate attributeName="opacity" values="1;.4;1" dur="${r(1.6, 3)}s" repeatCount="indefinite"/></circle><line x1="35" y1="${28 + i * 18}" x2="${35 + (i % 2 ? 13 : -13)}" y2="${34 + i * 18}" stroke="#2a4a7c" stroke-width="2"/>`).join('')}
          `)}
          ${Array.from({ length: 6 }, (_, i) => {
            const s = r(28, 52);
            return `<span class="sp jelly" style="left:${r(4, 90)}%;--dur:${r(22, 40)}s;animation-delay:-${r(0, 38)}s;width:${s}px">
              <svg viewBox="0 0 40 54">
                <path d="M4 22 Q4 4 20 4 Q36 4 36 22 Q30 28 20 28 Q10 28 4 22 Z" fill="${['#8fb8ff', '#ff9ad4', '#8ff2e0'][i % 3]}" opacity=".8">
                  <animateTransform attributeName="transform" type="scale" values="1 1;1.07 .93;1 1" dur="${r(1.8, 3)}s" repeatCount="indefinite" additive="sum"/>
                </path>
                <circle cx="14" cy="16" r="2.4" fill="#fff" opacity=".7"/><circle cx="24" cy="13" r="1.8" fill="#fff" opacity=".6"/>
                ${[8, 14, 20, 26, 32].map((x) => `<path d="M${x} 28 q${r(-4, 4)} 12 ${r(-3, 3)} 24" stroke="${['#8fb8ff', '#ff9ad4', '#8ff2e0'][i % 3]}" stroke-width="1.6" fill="none" opacity=".65"><animate attributeName="d" values="M${x} 28 q-3 12 -2 24;M${x} 28 q4 12 2 24;M${x} 28 q-3 12 -2 24" dur="${r(2.4, 4)}s" repeatCount="indefinite"/></path>`).join('')}
              </svg>
            </span>`;
          }).join('')}
          ${sprinkle(14, 'spark', () => `left:${r(0, 100)}%;top:${r(6, 84)}%;--c:${pick(['#8fb8ff', '#ff9ad4', '#8ff2e0'])};--dur:${r(3, 7)}s;animation-delay:-${r(0, 7)}s`)}
          ${sprinkle(8, 'marine-snow', () => `left:${r(0, 100)}%;--dur:${r(18, 32)}s;animation-delay:-${r(0, 32)}s;--sway:${r(-14, 14)}px`)}
        `,
      },
      {
        id: 'subs', name: 'The Submarine Graveyard', cls: 'deep-subs',
        scene: () => `
          ${L(40, 1, ridge(800, 320, 180, 55, '#071824', .9))}
          ${L(36, 2, `
            <g transform="rotate(-8 240 250)">
              <ellipse cx="240" cy="250" rx="150" ry="38" fill="#122a36"/>
              <rect x="196" y="184" width="52" height="34" rx="8" fill="#122a36"/>
              <rect x="214" y="168" width="7" height="20" fill="#122a36"/>
              ${[150, 200, 250, 300].map((x) => `<circle cx="${x}" cy="246" r="6" fill="#38dcc8" opacity=".35"><animate attributeName="opacity" values=".35;.7;.35" dur="${r(2.5, 4.5)}s" repeatCount="indefinite"/></circle>`).join('')}
              <path d="M362 238 l26 -14 v34 Z" fill="#0c1e28"/>
              <path d="M120 262 q-18 12 -8 30 q14 -2 20 -18" fill="#0a1a24"/>
            </g>
            <g transform="rotate(14 600 280)">
              <ellipse cx="600" cy="280" rx="100" ry="26" fill="#0e2430"/>
              <rect x="570" y="236" width="36" height="24" rx="6" fill="#0e2430"/>
              <path d="M560 268 q20 -10 44 -4" stroke="#071520" stroke-width="5" fill="none"/>
            </g>
            <path d="M420 320 q0 -40 22 -58 q6 18 -4 34 q16 -10 26 2 q-20 10 -26 22 Z" fill="#0a1e28"/>
            <circle cx="700" cy="150" r="17" fill="#0c2028"/>
            ${[0, 60, 120, 180, 240, 300].map((a) => `<line x1="700" y1="150" x2="${700 + 26 * Math.cos(a * Math.PI / 180)}" y2="${150 + 26 * Math.sin(a * Math.PI / 180)}" stroke="#0c2028" stroke-width="4"/>`).join('')}
            <line x1="700" y1="167" x2="700" y2="320" stroke="#0c2028" stroke-width="3" stroke-dasharray="6 8"/>
          `)}
          ${sprinkle(5, 'sonar', () => `left:${r(14, 80)}%;top:${r(10, 50)}%;--d:${r(3, 5)}s;--s:${r(20, 40)}px;animation-delay:-${r(0, 5)}s`)}
          ${bubbles(12)}
          ${fish(5, [10, 55], [8, 14])}
          ${sprinkle(8, 'marine-snow', () => `left:${r(0, 100)}%;--dur:${r(18, 30)}s;animation-delay:-${r(0, 30)}s;--sway:${r(-14, 14)}px`)}
        `,
      },
      {
        id: 'reef', name: 'The Bioluminous Reef', cls: 'deep-reef',
        scene: () => `
          ${L(42, 1, `
            ${ridge(800, 320, 220, 30, '#0a2028')}
            ${[90, 260, 430, 600, 740].map((x) => `<path d="M${x} 320 q-8 -${r(40, 70)} ${r(-4, 6)} -${r(70, 96)} M${x} 320 q${r(10, 20)} -${r(30, 60)} ${r(22, 36)} -${r(56, 80)} M${x} 320 q-${r(14, 24)} -${r(26, 44)} -${r(30, 44)} -${r(40, 64)}" stroke="#123240" stroke-width="9" fill="none" stroke-linecap="round"/>`).join('')}
            ${[170, 350, 520, 690].map((x) => `<ellipse cx="${x}" cy="300" rx="${r(26, 40)}" ry="${r(16, 24)}" fill="#0e2a34"/><path d="M${x - 20} 296 q6 -8 12 0 q6 -8 12 0 q6 -8 12 0" stroke="#1c4452" stroke-width="3" fill="none"/>`).join('')}
            <path d="M480 300 a22 14 0 0 1 44 0 Z" fill="#122e3a"/>
            <circle cx="502" cy="296" r="6" fill="#dff6f0"><animate attributeName="opacity" values="1;.5;1" dur="3.5s" repeatCount="indefinite"/></circle>
          `)}
          ${sprinkle(18, 'polyp', (i) => `left:${r(2, 98)}%;top:${r(62, 92)}%;--c:${['#38dcc8', '#ff8f5c', '#ff9ad4', '#e0b84d', '#8fb8ff'][i % 5]};--d:${r(1.6, 4)}s;--s:${r(4, 8)}px;animation-delay:-${r(0, 4)}s`)}
          ${fish(10, [14, 60], [7, 14])}
          ${bubbles(8)}
        `,
      },
      {
        id: 'void', name: 'The Midnight Zone', cls: 'deep-void',
        scene: () => `
          <div class="fx bigeye"><i></i></div>
          ${L(26, 1, `
            <path d="M40 250 Q220 180 480 210 Q660 232 780 210 L780 240 Q560 262 340 246 Q160 236 40 268 Z" fill="#071018" opacity=".8"/>
            <path d="M760 214 l30 -12 l-6 16 l8 10 l-32 -6 Z" fill="#071018" opacity=".8"/>
          `)}
          ${sprinkle(1, 'lure', () => `left:${r(20, 76)}%;top:${r(20, 40)}%;--d:3.4s;--s:9px`)}
          ${sprinkle(10, 'marine-snow', () => `left:${r(0, 100)}%;--dur:${r(22, 40)}s;animation-delay:-${r(0, 40)}s;--sway:${r(-10, 10)}px`)}
          ${stars(6, [60, 92])}
        `,
      },
    ],
  },

  // ————— LEGS A — CRYPTID NATIONAL PARK: every trail has a classified resident —————
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
          ${L(64, 1, `${ridge(800, 320, 130, 40, '#1c2c1e', .7)}${pines(800, 320, 16, '#14231a', 90, 170, .85)}`)}
          <span class="sp squatch" style="top:auto;bottom:15%;--dur:85s;animation-delay:-${r(6, 70)}s;z-index:2">
            <svg viewBox="0 0 44 64" fill="#10180f">
              <ellipse cx="22" cy="36" rx="14" ry="21"/>
              <circle cx="22" cy="13" r="9.5"/>
              <path d="M14 10 q8 -7 16 0" fill="none" stroke="#10180f" stroke-width="4"/>
              <path d="M9 30 q-7 7 -5 17 M35 30 q7 7 5 17" stroke="#10180f" stroke-width="6.5" stroke-linecap="round" fill="none"/>
              <path d="M16 55 l-3 9 M28 55 l3 9" stroke="#10180f" stroke-width="7.5" stroke-linecap="round"/>
              <circle cx="19" cy="12" r="1.2" fill="#e8dcc0"/><circle cx="26" cy="12" r="1.2" fill="#e8dcc0"/>
            </svg>
          </span>
          ${L(30, 3, `
            <path d="M0 320 L800 320 L800 292 Q560 280 380 288 Q180 296 0 284 Z" fill="#0e1811"/>
            ${pines(800, 320, 7, '#0a120', 110, 200)}
            <g transform="rotate(-2 130 250)">
              <rect x="124" y="196" width="11" height="112" fill="#3a2a14"/>
              <rect x="88" y="200" width="84" height="26" rx="3" fill="#4a3820"/>
              <text x="130" y="218" text-anchor="middle" font-family="monospace" font-size="13" fill="#e8dcc0">TRAIL ➜</text>
              <rect x="94" y="232" width="72" height="20" rx="3" fill="#7a2418"/>
              <text x="130" y="247" text-anchor="middle" font-family="monospace" font-size="11" fill="#f2e8d0">BEWARE</text>
            </g>
            <path d="M240 300 h60 M320 300 h60" stroke="#241c10" stroke-width="5"/>
            <g>
              <path d="M560 306 L610 258 L660 306 Z" fill="#c9a86a"/>
              <path d="M568 306 L610 266 L652 306 Z" fill="#8a6a3a"/>
              <rect x="600" y="284" width="20" height="22" fill="#3a2814"/>
              <circle cx="610" cy="276" r="7" fill="#ffe9b3" opacity=".9"><animate attributeName="opacity" values=".9;.5;.9" dur="3s" repeatCount="indefinite"/></circle>
            </g>
          `)}
          ${sprinkle(6, 'footprint', (i) => `left:${8 + i * 15}%;bottom:${5 + (i % 2) * 4}%;--d:${(i * 1.1).toFixed(1)}s;transform:rotate(${i % 2 ? 14 : -10}deg)`)}
          ${fireflies(8)}
          <div class="fx mist" style="bottom:24%;height:12%"></div>
        `,
      },
      {
        id: 'mothman', name: 'Mothman Overlook', cls: 'park-mothman',
        scene: () => `
          ${H('right:8%;top:5%;width:120px', 120, 120, `
            <circle cx="60" cy="60" r="54" fill="#f4f0dc"/>
            <circle cx="42" cy="44" r="9" fill="#d8d2b4" opacity=".8"/><circle cx="76" cy="72" r="13" fill="#d8d2b4" opacity=".7"/><circle cx="68" cy="34" r="5" fill="#d8d2b4" opacity=".8"/><circle cx="38" cy="78" r="6" fill="#d8d2b4" opacity=".7"/>
          `, 'moonglow')}
          ${L(58, 1, `${ridge(800, 320, 160, 44, '#0e1420', .8)}${pines(800, 320, 12, '#0a0e18', 70, 140, .9)}`)}
          ${L(46, 2, `
            <path d="M600 320 L600 120 q-4 -18 10 -18 q14 0 10 18 L620 320 Z" fill="#070b12"/>
            <path d="M610 130 q-40 -24 -74 -18 M610 150 q-50 -10 -90 8 M610 118 q30 -28 64 -26 M610 142 q44 -16 84 -4" stroke="#070b12" stroke-width="7" fill="none" stroke-linecap="round"/>
            <g>
              <ellipse cx="548" cy="118" rx="13" ry="19" fill="#05070e"/>
              <circle cx="548" cy="94" r="9" fill="#05070e"/>
              <path d="M535 112 Q505 84 500 58 Q528 76 542 100 Z M561 112 Q591 84 596 58 Q568 76 554 100 Z" fill="#05070e">
                <animateTransform attributeName="transform" type="scale" values="1 1;1.06 1.02;1 1" dur="4s" repeatCount="indefinite" additive="sum"/>
              </path>
              <circle cx="544" cy="92" r="2.6" fill="#ff2f2f"><animate attributeName="opacity" values="1;.35;1" dur="2.2s" repeatCount="indefinite"/></circle>
              <circle cx="552" cy="92" r="2.6" fill="#ff2f2f"><animate attributeName="opacity" values="1;.35;1" dur="2.2s" repeatCount="indefinite"/></circle>
            </g>
            <path d="M0 320 L800 320 L800 296 Q400 282 0 298 Z" fill="#05070e"/>
            <g transform="rotate(2 150 270)">
              <rect x="120" y="240" width="9" height="66" fill="#241c10"/>
              <rect x="96" y="244" width="60" height="18" rx="3" fill="#3a2c16"/>
              <text x="126" y="257" text-anchor="middle" font-family="monospace" font-size="9.5" fill="#e8dcc0">OVERLOOK</text>
            </g>
          `)}
          ${sprinkle(4, 'redeyes', () => `left:${r(8, 86)}%;top:${r(46, 74)}%;--d:${r(3, 8)}s`)}
          ${sprinkle(8, 'moth', () => `left:${r(4, 92)}%;top:${r(8, 60)}%;--d:${r(2, 4)}s;--s:${r(8, 14)}px`)}
          ${stars(14, [0, 34])}
        `,
      },
      {
        id: 'marina', name: 'Lake-Monster Marina', cls: 'park-marina',
        scene: () => `
          ${L(58, 1, `${ridge(800, 320, 120, 40, '#16202c', .7)}${pines(800, 320, 9, '#101826', 60, 110, .8)}`)}
          ${L(44, 2, `
            <rect x="0" y="180" width="800" height="140" fill="#12303a"/>
            <path d="M0 180 h800" stroke="#2a5a66" stroke-width="2.5"/>
            <path d="M420 186 q60 4 120 0 l-6 60 q-54 8 -108 0 Z" fill="#dfe8ec" opacity=".12"/>
            <g>
              <path d="M170 208 a26 20 0 0 1 52 0 Z" fill="#1c3a30"/>
              <path d="M258 214 a20 15 0 0 1 40 0 Z" fill="#1c3a30"/>
              <path d="M116 214 q2 -34 26 -42 q20 -7 30 8 q6 12 -6 20" fill="none" stroke="#1c3a30" stroke-width="12" stroke-linecap="round"/>
              <circle cx="146" cy="170" r="10" fill="#1c3a30"/>
              <circle cx="143" cy="167" r="2" fill="#dff2ec"/>
              <path d="M152 176 q6 3 10 1" stroke="#dff2ec" stroke-width="1.6" fill="none"/>
              <path d="M120 226 q40 8 190 2" stroke="#dfe8ec" stroke-width="2" fill="none" opacity=".4"><animate attributeName="opacity" values=".4;.15;.4" dur="3s" repeatCount="indefinite"/></path>
            </g>
            <rect x="470" y="196" width="200" height="10" fill="#3a2c18"/>
            ${[480, 530, 580, 630, 660].map((x) => `<rect x="${x}" y="206" width="7" height="${r(20, 30)}" fill="#2c2010"/>`).join('')}
            <g><path d="M500 190 q24 -12 48 0 l-6 8 q-18 -8 -36 0 Z" fill="#5a3c1c"/><rect x="519" y="168" width="4" height="18" fill="#2c2010"/></g>
            <rect x="690" y="130" width="80" height="70" fill="#2a2014"/>
            <path d="M682 132 L730 104 L778 132 Z" fill="#1c160c"/>
            ${windows(700, 144, 2, 2, 14, 14, 10, '#ffd98a', '#141008')}
            <text x="730" y="192" text-anchor="middle" font-family="monospace" font-size="10" fill="#7ae0d0" opacity=".9">BAIT</text>
          `)}
          ${sprinkle(4, 'buoy', (i) => `left:${[8, 30, 52, 88][i]}%;top:${r(64, 72)}%;--d:${r(2.5, 4.5)}s;--c:${i % 2 ? '#d94f3c' : '#e8b84d'}`)}
          ${sprinkle(6, 'ripple', () => `left:${r(6, 90)}%;top:${r(60, 86)}%;--d:${r(3, 6)}s`)}
          ${stars(10, [0, 30])}
          ${fireflies(4)}
        `,
      },
      {
        id: 'saucer', name: 'The Saucer Crash Site', cls: 'park-ufo',
        scene: () => `
          ${L(56, 1, `${pines(800, 320, 14, '#0c1410', 90, 170, .9)}`)}
          ${L(38, 2, `
            <path d="M0 320 L800 320 L800 294 Q400 280 0 296 Z" fill="#101a12"/>
            <path d="M240 302 Q420 282 560 296 L556 306 Q420 294 244 310 Z" fill="#060a06"/>
            <g transform="rotate(-14 420 250)">
              <ellipse cx="420" cy="250" rx="110" ry="30" fill="#2a3440"/>
              <ellipse cx="420" cy="240" rx="110" ry="26" fill="#3c4a5a"/>
              <path d="M356 218 A64 34 0 0 1 484 218 L474 236 A54 26 0 0 0 366 236 Z" fill="#7ae0d0" opacity=".8"/>
              <path d="M392 214 q28 -14 56 0" stroke="#dff6f0" stroke-width="3" fill="none" opacity=".7"/>
              ${[330, 375, 420, 465, 510].map((x, i) => `<circle cx="${x}" cy="246" r="6" fill="#ffd24a"><animate attributeName="opacity" values="${i % 2 ? '1;.2;1' : '.2;1;.2'}" dur="1.1s" repeatCount="indefinite"/></circle>`).join('')}
              <path d="M348 268 l-20 30 M492 268 l20 30" stroke="#2a3440" stroke-width="9" stroke-linecap="round"/>
            </g>
            <path d="M420 216 L390 150 L450 150 Z" fill="#7ae0d0" opacity=".22"><animate attributeName="opacity" values=".22;.4;.22" dur="2.6s" repeatCount="indefinite"/></path>
            <path d="M300 292 q-14 -20 -30 -22 M540 296 q16 -18 30 -18" stroke="#3c4a5a" stroke-width="5" fill="none"/>
          `)}
          ${sprinkle(7, 'spark', () => `left:${r(34, 66)}%;top:${r(48, 70)}%;--c:#7ae0d0;--dur:${r(2, 5)}s;animation-delay:-${r(0, 5)}s`)}
          ${sprinkle(4, 'brushsmoke', () => `left:${r(38, 62)}%;--s:${r(24, 44)}px;--dur:${r(10, 16)}s;animation-delay:-${r(0, 14)}s;--sway:${r(-20, 20)}px`)}
          ${stars(20, [0, 42])}
        `,
      },
      {
        id: 'meadow', name: 'Jackalope Meadow', cls: 'park-meadow',
        scene: () => `
          ${L(52, 1, `
            <path d="M0 320 Q200 210 420 246 Q640 280 800 232 L800 320 Z" fill="#2c421e"/>
            <path d="M560 250 q-2 -60 26 -84 q10 26 -4 52 q22 -18 40 -8 q-24 20 -38 46 Z" fill="#1c2e14"/>
          `)}
          ${L(34, 2, `
            <path d="M0 320 Q240 268 520 292 Q680 304 800 288 L800 320 Z" fill="#1f3014"/>
            ${Array.from({ length: 26 }, () => `<path d="M${r(10, 790)} ${r(276, 314)} q2 -8 4 -12" stroke="#3c5a24" stroke-width="2.4" fill="none"/>`).join('')}
            ${Array.from({ length: 12 }, () => `<circle cx="${r(20, 780)}" cy="${r(280, 312)}" r="2.6" fill="${pick(['#e8b84d', '#d97a94', '#c8e8a8', '#e8dcc0'])}"/>`).join('')}
          `)}
          ${Array.from({ length: 2 }, (_, i) => `
            <span class="sp jackalope" style="top:auto;bottom:${r(10, 20)}%;--dur:${r(20, 30)}s;animation-delay:-${r(0, 24)}s;--flip:${i ? -1 : 1}">
              <svg viewBox="0 0 44 40">
                <path d="M12 12 l-3 -11 M15 12 l1 -12 M12 12 q-6 -7 -10 -6 M15 11 q5 -9 10 -8" stroke="#4a3820" stroke-width="2.4" fill="none" stroke-linecap="round"/>
                <ellipse cx="24" cy="28" rx="13" ry="9" fill="#6a5230"/>
                <circle cx="13" cy="19" r="7" fill="#6a5230"/>
                <path d="M8 14 q-2 -8 3 -10 q3 4 1 10 Z" fill="#6a5230"/>
                <circle cx="11" cy="18" r="1.3" fill="#1c1208"/>
                <circle cx="36" cy="24" r="4" fill="#e8dcc0"/>
                <path d="M18 36 q-4 3 -8 2 M30 36 q4 3 8 2" stroke="#4a3820" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </span>`).join('')}
          ${sprinkle(6, 'moth', () => `left:${r(6, 90)}%;top:${r(26, 66)}%;--d:${r(2, 4)}s;--s:${r(7, 11)}px`)}
          ${fireflies(10)}
          ${petals(8, ['#e8b84d', '#c8e8a8', '#e8dcc0'])}
        `,
      },
      {
        id: 'watchtower', name: 'The Fire Watchtower', cls: 'park-tower',
        scene: () => `
          ${L(60, 1, `${ridge(800, 320, 150, 46, '#141c2a', .75)}${pines(800, 320, 16, '#0e141f', 80, 160, .9)}`)}
          ${L(76, 2, `
            <g>
              <path d="M330 320 L390 96 M470 320 L410 96 M340 280 L462 280 M348 240 L452 240 M356 200 L444 200 M364 160 L436 160 M330 320 L460 240 M470 320 L340 240 M348 240 L452 160 M452 240 L348 160" stroke="#1c1408" stroke-width="6" fill="none"/>
              <rect x="356" y="52" width="88" height="48" fill="#2c2010"/>
              <path d="M346 54 L400 24 L454 54 Z" fill="#1c1408"/>
              <rect x="368" y="62" width="64" height="26" fill="#ffd98a"><animate attributeName="opacity" values="1;.75;1" dur="4s" repeatCount="indefinite"/></rect>
              <path d="M368 75 h64 M384 62 v26 M416 62 v26" stroke="#2c2010" stroke-width="3"/>
              <rect x="350" y="100" width="100" height="7" fill="#1c1408"/>
              <line x1="400" y1="24" x2="400" y2="4" stroke="#1c1408" stroke-width="3"/>
              <circle cx="400" cy="4" r="3.4" fill="#ff3b3b"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" repeatCount="indefinite"/></circle>
            </g>
            <path d="M0 320 L800 320 L800 300 Q400 288 0 302 Z" fill="#0a0e16"/>
          `)}
          ${sprinkle(6, 'moth', () => `left:${r(40, 60)}%;top:${r(16, 34)}%;--d:${r(1.6, 3)}s;--s:${r(6, 10)}px`)}
          ${sprinkle(2, 'redeyes', () => `left:${r(10, 30)}%;top:${r(56, 70)}%;--d:${r(4, 8)}s`)}
          ${stars(18, [0, 30])}
          ${sprinkle(4, 'sonar', () => `left:${r(44, 56)}%;top:${r(2, 10)}%;--d:${r(2.5, 4)}s;--s:${r(16, 28)}px;animation-delay:-${r(0, 4)}s`)}
        `,
      },
      {
        id: 'canyon', name: 'Chupacabra Canyon', cls: 'park-canyon',
        scene: () => `
          ${L(66, 1, `
            <path d="M0 320 L0 100 L60 92 L90 130 L86 320 Z M800 320 L800 80 L720 74 L680 120 L690 320 Z" fill="#3a1812"/>
            <path d="M0 140 h86 M690 130 h110 M0 200 h80 M696 196 h104 M0 260 h84 M692 258 h108" stroke="#2a100c" stroke-width="7"/>
            <path d="M300 320 L310 170 Q330 130 380 126 Q430 130 448 170 L460 320 Z" fill="#331410"/>
            <path d="M310 200 h140 M306 250 h150" stroke="#241008" stroke-width="6"/>
            <path d="M330 126 Q380 60 448 96 Q470 116 448 170" fill="none" stroke="#331410" stroke-width="18"/>
          `)}
          ${L(24, 2, `
            <path d="M0 320 L800 320 L800 292 Q400 280 0 294 Z" fill="#241008"/>
            <g transform="rotate(-6 160 296)">
              <ellipse cx="160" cy="296" rx="24" ry="12" fill="#e8dcc0"/>
              <circle cx="140" cy="290" r="9" fill="#e8dcc0"/>
              <path d="M132 284 q-6 -8 -2 -14 M146 283 q4 -9 10 -10" stroke="#e8dcc0" stroke-width="4" fill="none"/>
              <circle cx="138" cy="289" r="2.4" fill="#241008"/>
            </g>
            <path d="M560 302 q-3 -30 10 -44 q6 12 0 28 q10 -8 16 0 q-12 8 -14 18 Z" fill="#1c3a2a"/>
            <path d="M600 306 h10 M620 306 h8" stroke="#e8dcc0" stroke-width="3"/>
          `)}
          ${sprinkle(3, 'redeyes', () => `left:${r(6, 30)}%;top:${r(38, 62)}%;--d:${r(3, 7)}s`)}
          ${sprinkle(8, 'dust', () => `left:${r(0, 100)}%;--dur:${r(14, 26)}s;animation-delay:-${r(0, 26)}s`)}
          ${stars(22, [0, 36])}
        `,
      },
      {
        id: 'bog', name: "The Will-o'-Wisp Bog", cls: 'park-bog',
        scene: () => `
          ${L(70, 1, `
            ${[110, 320, 560, 730].map((x) => `
              <path d="M${x} 320 L${x - 7} 150 Q${x} 134 ${x + 7} 150 L${x + 5} 320 Z" fill="#0c140e"/>
              <path d="M${x} 170 q-30 -18 -54 -12 M${x} 196 q28 -16 52 -8 M${x - 2} 150 q-18 -22 -38 -24 M${x + 2} 152 q20 -18 40 -16" stroke="#0c140e" stroke-width="6" fill="none" stroke-linecap="round"/>
              <path d="M${x - 26} 176 q-3 26 4 44 M${x + 24} 186 q4 22 -2 40" stroke="#1c2c1a" stroke-width="4" fill="none" opacity=".8"/>`).join('')}
          `)}
          ${L(26, 2, `
            <rect x="0" y="266" width="800" height="54" fill="#0e1a14"/>
            <path d="M0 266 h800" stroke="#24402e" stroke-width="2"/>
            ${[140, 380, 620].map((x) => `<ellipse cx="${x}" cy="${r(280, 300)}" rx="${r(30, 50)}" ry="4" fill="#1a3020" opacity=".9"/>`).join('')}
            <g><ellipse cx="470" cy="278" rx="34" ry="8" fill="#241c10"/><circle cx="452" cy="270" r="4" fill="#7ad48a"/><circle cx="464" cy="268" r="4" fill="#7ad48a"/><circle cx="452" cy="269" r="1.4" fill="#04120a"/><circle cx="464" cy="267" r="1.4" fill="#04120a"/></g>
            ${[80, 230, 540, 700].map((x) => `<rect x="${x}" y="${r(258, 268)}" width="9" height="${r(30, 50)}" fill="#1c1810" transform="rotate(${r(-8, 8)} ${x} 280)"/>`).join('')}
          `)}
          ${wisps(9, ['#7ad48a', '#7ae0d0', '#c8e8a8'])}
          <div class="fx mist" style="bottom:18%;height:18%"></div>
          <div class="fx mist" style="bottom:4%;height:12%;animation-delay:-3s"></div>
          ${fireflies(5)}
        `,
      },
    ],
  },

  // ————— PUSH B — THE NOODLE COSMOS: a night-market galaxy in a dragon's wok —————
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
          ${L(52, 1, `
            <path d="M0 220 Q400 150 800 220 L800 320 L0 320 Z" fill="#180606"/>
            <path d="M40 236 Q400 172 760 236" fill="none" stroke="#33110d" stroke-width="16"/>
            <path d="M-20 250 q30 -90 60 -6 q20 -70 48 -4 q26 -84 58 -2 q22 -66 50 0 q28 -80 60 -4 q24 -64 52 2 q26 -78 58 0 q22 -62 52 2 q28 -76 58 0 q24 -60 54 4 q26 -72 58 2 q20 -56 50 2 L800 320 L0 320 Z" fill="#e8531c" opacity=".85">
              <animateTransform attributeName="transform" type="scale" values="1 1;1 1.12;1 .96;1 1" dur="1.3s" repeatCount="indefinite" additive="sum" style="transform-origin:50% 100%"/>
            </path>
            <path d="M0 276 q26 -56 52 -2 q22 -48 46 0 q24 -56 50 -2 q20 -44 44 0 q24 -52 50 -2 q22 -46 46 0 q24 -52 50 0 q20 -42 44 0 q24 -50 50 0 q22 -44 46 0 q24 -50 50 0 q20 -40 44 0 q22 -46 48 0 L800 320 L0 320 Z" fill="#ffb84d" opacity=".9">
              <animateTransform attributeName="transform" type="scale" values="1 1;1 .9;1 1.08;1 1" dur="0.9s" repeatCount="indefinite" additive="sum" style="transform-origin:50% 100%"/>
            </path>
          `)}
          ${L(18, 2, `
            <path d="M0 320 L800 320 L800 296 Q400 286 0 298 Z" fill="#0e0404"/>
            <g><circle cx="120" cy="300" r="4" fill="#ffd24a"/><circle cx="136" cy="304" r="3" fill="#ff6a2c"/><path d="M660 300 q14 -8 26 0 q-12 9 -26 0 Z" fill="#7ad48a"/></g>
          `)}
          ${sprinkle(8, 'noodle', () => `left:${r(2, 96)}%;--dur:${r(6, 11)}s;animation-delay:-${r(0, 10)}s;--sway:${r(-50, 50)}px;--rot:${r(180, 560)}deg`)}
          ${sprinkle(6, 'veg', (i) => `left:${r(4, 94)}%;--dur:${r(7, 12)}s;animation-delay:-${r(0, 11)}s;--sway:${r(-40, 40)}px;--rot:${r(140, 460)}deg;--c:${['#7ad48a', '#ff6a2c', '#ffd24a'][i % 3]}`)}
          ${embers(16)}
          ${steam(4)}
        `,
      },
      {
        id: 'steamgardens', name: 'The Dumpling Steam Gardens', cls: 'wok-steam',
        scene: () => `
          ${L(62, 1, `
            ${[[120, 210, 150], [400, 170, 190], [660, 230, 130]].map(([cx, cy, w]) => `
              <g>
                <ellipse cx="${cx}" cy="${cy + 44}" rx="${w / 2 + 14}" ry="16" fill="#5a3a20"/>
                <rect x="${cx - w / 2}" y="${cy}" width="${w}" height="44" rx="8" fill="#8a6034"/>
                ${Array.from({ length: Math.floor(w / 17) }, (_, k) => `<path d="M${cx - w / 2 + 8 + k * 17} ${cy + 6} q6 16 0 32" stroke="#6d4826" stroke-width="3.4" fill="none"/>`).join('')}
                <ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="10" fill="#a87c46"/>
              </g>`).join('')}
            <path d="M170 260 L360 218 M440 224 L620 264" stroke="#c9884a" stroke-width="7" stroke-linecap="round"/>
            <path d="M0 320 L800 320 L800 292 Q400 282 0 294 Z" fill="#241410"/>
          `)}
          ${Array.from({ length: 5 }, (_, i) => `
            <span class="sp dumpling" style="left:${[10, 30, 47, 64, 82][i]}%;top:${r(16, 48)}%;--d:${r(5, 9)}s;animation-delay:-${r(0, 8)}s;width:${r(34, 50)}px">
              <svg viewBox="0 0 34 28">
                <path d="M4 21 q0 -15 13 -15 t13 15 q-13 6 -26 0 Z" fill="#f2e2c8"/>
                <path d="M9 8 q2 -4 4 -1 M15 6 q2 -4 4 -1 M21 7 q2 -4 4 0" stroke="#d9b88a" stroke-width="2" fill="none"/>
                <circle cx="13" cy="16" r="1.4" fill="#4a3218"/><circle cx="21" cy="16" r="1.4" fill="#4a3218"/>
                <path d="M15 19.5 q2 1.8 4 0" stroke="#4a3218" stroke-width="1.3" fill="none"/>
                <ellipse cx="10" cy="18" rx="1.8" ry="1.2" fill="#e8a0b4" opacity=".7"/><ellipse cx="24" cy="18" rx="1.8" ry="1.2" fill="#e8a0b4" opacity=".7"/>
              </svg>
            </span>`).join('')}
          ${steam(9)}
          <div class="fx mist" style="bottom:0;height:22%"></div>
        `,
      },
      {
        id: 'ramenalley', name: 'Midnight Ramen Alley', cls: 'wok-alley',
        scene: () => `
          ${L(84, 1, `
            <rect x="0" y="60" width="150" height="260" fill="#1c0d18"/>
            <rect x="650" y="40" width="150" height="280" fill="#1c0d18"/>
            ${windows(20, 90, 3, 5, 16, 20, 12, '#ffd98a', '#241020')}
            ${windows(672, 70, 3, 6, 16, 20, 12, '#ff9a5c', '#241020')}
            <rect x="150" y="140" width="90" height="180" fill="#241020"/>
            <rect x="560" y="120" width="90" height="200" fill="#241020"/>
            <rect x="166" y="160" width="24" height="90" rx="4" fill="#2a0f1f" stroke="#ff5d7a" stroke-width="2"/>
            ${[0, 1, 2].map((k) => `<rect x="171" y="${168 + k * 26}" width="14" height="16" fill="#ff5d7a" opacity=".85"><animate attributeName="opacity" values=".85;.3;.85" dur="${r(2, 4)}s" repeatCount="indefinite"/></rect>`).join('')}
            <rect x="600" y="150" width="24" height="70" rx="4" fill="#0f1f24" stroke="#3adcc8" stroke-width="2"/>
            ${[0, 1].map((k) => `<rect x="605" y="${158 + k * 28}" width="14" height="18" fill="#3adcc8" opacity=".85"><animate attributeName="opacity" values=".85;.35;.85" dur="${r(2.4, 4)}s" repeatCount="indefinite"/></rect>`).join('')}
            <path d="M240 320 L240 200 Q400 176 560 200 L560 320" fill="#160a12"/>
            <rect x="330" y="216" width="140" height="60" rx="6" fill="#2a0f1f" stroke="#ffb84d" stroke-width="3"/>
            <path d="M352 252 a24 16 0 0 0 96 0 Z" fill="#ffb84d"/>
            <path d="M366 246 q8 -18 12 -2 M386 244 q8 -20 12 -2 M406 246 q8 -18 12 -2" stroke="#ffb84d" stroke-width="4" fill="none"><animate attributeName="opacity" values="1;.4;1" dur="2.2s" repeatCount="indefinite"/></path>
            <g transform="translate(475 196)"><path d="M0 10 q6 -12 14 -6 q8 -8 12 2 q8 0 6 8 l-32 0 Z" fill="#160a12"/><path d="M28 6 q6 -6 4 -12" stroke="#160a12" stroke-width="3" fill="none"><animateTransform attributeName="transform" type="rotate" values="-8 28 6;10 28 6;-8 28 6" dur="3s" repeatCount="indefinite"/></path><circle cx="9" cy="8" r="1.2" fill="#ffd98a"/></g>
            <path d="M0 320 L800 320 L800 300 Q400 290 0 302 Z" fill="#0c0510"/>
            <ellipse cx="400" cy="308" rx="150" ry="6" fill="#ffb84d" opacity=".12"/>
          `)}
          ${lanterns(5)}
          ${steam(6)}
          ${rain(10)}
          ${sprinkle(4, 'noodle', () => `left:${r(2, 96)}%;--dur:${r(9, 14)}s;animation-delay:-${r(0, 12)}s;--sway:${r(-30, 30)}px;--rot:${r(120, 400)}deg;--op:.4`)}
        `,
      },
      {
        id: 'asteroids', name: 'The Dumpling Asteroid Belt', cls: 'wok-asteroids',
        scene: () => `
          ${stars(30, [0, 95])}
          ${H('left:6%;top:8%;width:110px', 110, 70, `
            <ellipse cx="55" cy="35" rx="34" ry="30" fill="#e8a13c"/>
            <ellipse cx="55" cy="35" rx="52" ry="12" fill="none" stroke="#ffd24a" stroke-width="4" transform="rotate(-16 55 35)"/>
            <ellipse cx="44" cy="26" rx="8" ry="6" fill="#c9822c"/><ellipse cx="66" cy="44" rx="6" ry="5" fill="#c9822c"/>
          `)}
          ${Array.from({ length: 5 }, (_, i) => `
            <span class="sp dumpling" style="left:${r(8, 88)}%;top:${r(14, 74)}%;--d:${r(6, 11)}s;animation-delay:-${r(0, 10)}s;width:${r(26, 54)}px">
              <svg viewBox="0 0 34 28">
                <path d="M4 21 q0 -15 13 -15 t13 15 q-13 6 -26 0 Z" fill="#e8d2b0"/>
                <ellipse cx="12" cy="14" rx="2.6" ry="2" fill="#c9ac82"/><ellipse cx="22" cy="17" rx="2" ry="1.6" fill="#c9ac82"/>
                <path d="M9 8 q2 -4 4 -1 M15 6 q2 -4 4 -1 M21 7 q2 -4 4 0" stroke="#c9ac82" stroke-width="2" fill="none"/>
                ${i === 2 ? '<path d="M17 6 v-7 M17 -1 h7 v5 h-7" stroke="#d93a20" stroke-width="1.6" fill="#d93a20"/>' : ''}
              </svg>
            </span>`).join('')}
          <span class="sp comet" style="top:${r(12, 40)}%;--dur:${r(14, 22)}s;animation-delay:-${r(0, 18)}s">
            <svg viewBox="0 0 90 20"><path d="M0 10 Q40 2 74 8" stroke="#ff6a2c" stroke-width="3" fill="none" opacity=".7"/><path d="M8 13 Q44 8 74 11" stroke="#ffd24a" stroke-width="2" fill="none" opacity=".6"/><circle cx="78" cy="10" r="8" fill="#d93a20"/><circle cx="76" cy="8" r="2.4" fill="#ffb84d"/></svg>
          </span>
          <span class="sp chopsat" style="left:${r(50, 80)}%;top:${r(50, 70)}%;--d:${r(10, 16)}s">
            <svg viewBox="0 0 60 60"><g><rect x="27" y="6" width="5" height="48" rx="2.5" fill="#d9a86a"/><rect x="34" y="8" width="4" height="44" rx="2" fill="#c9985a"/><rect x="20" y="26" width="20" height="10" rx="2" fill="#7a4a20"/></g></svg>
          </span>
          ${sprinkle(6, 'noodle', () => `left:${r(2, 96)}%;--dur:${r(10, 16)}s;animation-delay:-${r(0, 15)}s;--sway:${r(-60, 60)}px;--rot:${r(180, 560)}deg;--op:.6`)}
        `,
      },
      {
        id: 'nebula', name: 'The Broth Nebula', cls: 'wok-nebula',
        scene: () => `
          ${stars(26, [0, 95])}
          ${H('left:50%;top:6%;width:170px;margin-left:-85px', 170, 170, `
            <g>
              <animateTransform attributeName="transform" type="rotate" from="0 85 85" to="360 85 85" dur="70s" repeatCount="indefinite"/>
              <circle cx="85" cy="85" r="80" fill="#f2e2c8" opacity=".14"/>
              <circle cx="85" cy="85" r="56" fill="#f2e2c8" opacity=".5"/>
              <path d="M85 85 m0 -44 a44 44 0 0 1 0 88 a34 34 0 0 0 0 -68 a24 24 0 0 1 0 48 a15 15 0 0 0 0 -30" fill="none" stroke="#e0447a" stroke-width="12" stroke-linecap="round"/>
            </g>
          `, 'spinslow')}
          ${H('right:8%;top:40%;width:70px', 70, 44, `
            <ellipse cx="35" cy="22" rx="32" ry="19" fill="#f2e2c8"/>
            <ellipse cx="35" cy="22" rx="18" ry="11" fill="#ffd24a"/>
          `)}
          ${H('left:8%;top:52%;width:60px', 60, 40, `
            <ellipse cx="30" cy="20" rx="27" ry="16" fill="#f2e2c8"/>
            <ellipse cx="30" cy="20" rx="15" ry="9" fill="#ffd24a"/>
          `)}
          ${L(30, 1, `
            <path d="M0 260 Q200 236 400 256 T800 250 L800 320 L0 320 Z" fill="#3a1410" opacity=".9"/>
            <path d="M0 286 Q240 264 480 282 T800 278" stroke="#e8531c" stroke-width="4" fill="none" opacity=".5"/>
            <path d="M60 300 q30 -8 60 0 M300 306 q36 -10 72 0 M580 300 q30 -8 62 0" stroke="#ffb84d" stroke-width="3" fill="none" opacity=".4"/>
          `)}
          ${sprinkle(8, 'scallion', () => `left:${r(2, 96)}%;top:${r(10, 80)}%;--d:${r(3, 6)}s;animation-delay:-${r(0, 6)}s`)}
          ${sprinkle(5, 'noodle', () => `left:${r(2, 96)}%;--dur:${r(12, 18)}s;animation-delay:-${r(0, 16)}s;--sway:${r(-40, 40)}px;--rot:${r(120, 400)}deg;--op:.5`)}
        `,
      },
      {
        id: 'dragon', name: 'The Great Noodle Dragon', cls: 'wok-dragon',
        scene: () => `
          ${stars(18, [0, 60])}
          ${H('right:10%;top:6%;width:80px', 80, 80, `
            <circle cx="40" cy="40" r="34" fill="#ffd9a3"/>
            <circle cx="30" cy="32" r="6" fill="#e8b884" opacity=".8"/><circle cx="50" cy="48" r="8" fill="#e8b884" opacity=".7"/>
          `)}
          <span class="sp noodledragon" style="top:${r(14, 30)}%;--dur:48s;animation-delay:-${r(0, 40)}s">
            <svg viewBox="0 0 300 90">
              <path d="M10 50 Q50 18 95 40 Q140 62 185 40 Q230 18 268 40" fill="none" stroke="#f2dfb8" stroke-width="16" stroke-linecap="round"/>
              <path d="M10 50 Q50 18 95 40 Q140 62 185 40 Q230 18 268 40" fill="none" stroke="#e0c898" stroke-width="16" stroke-linecap="round" stroke-dasharray="3 14"/>
              ${[55, 100, 145, 190, 235].map((x, i) => `<path d="M${x} ${[30, 44, 52, 44, 28][i]} l3 -12 l6 10" stroke="#d93a20" stroke-width="3.4" fill="none"/>`).join('')}
              <g>
                <path d="M262 38 q14 -14 30 -8 q8 4 6 14 q-2 12 -16 14 q-14 2 -22 -8 Z" fill="#d93a20"/>
                <circle cx="284" cy="42" r="2.6" fill="#1c0806"/>
                <path d="M292 34 q8 -10 4 -18 M278 32 q0 -10 -8 -14" stroke="#e8a13c" stroke-width="3" fill="none"/>
                <path d="M296 46 q10 0 16 6 M294 50 q8 4 10 12" stroke="#d93a20" stroke-width="2.4" fill="none">
                  <animateTransform attributeName="transform" type="rotate" values="-6 294 48;8 294 48;-6 294 48" dur="2s" repeatCount="indefinite"/>
                </path>
                <ellipse cx="300" cy="30" rx="6" ry="6" fill="#ffd24a"><animate attributeName="opacity" values="1;.5;1" dur="1.6s" repeatCount="indefinite"/></ellipse>
              </g>
              <path d="M120 58 q6 14 -2 26 M200 52 q6 14 -2 24" stroke="#f2dfb8" stroke-width="5" fill="none" stroke-linecap="round"/>
            </svg>
          </span>
          ${L(26, 1, `
            ${[70, 250, 420, 600, 740].map((x) => `<ellipse cx="${x}" cy="${r(280, 310)}" rx="${r(40, 66)}" ry="${r(12, 20)}" fill="#3a1826" opacity=".85"/>`).join('')}
          `)}
          ${lanterns(4)}
          ${sprinkle(6, 'noodle', () => `left:${r(2, 96)}%;--dur:${r(9, 14)}s;animation-delay:-${r(0, 13)}s;--sway:${r(-40, 40)}px;--rot:${r(140, 420)}deg;--op:.6`)}
        `,
      },
      {
        id: 'shrine', name: 'The Fortune Cookie Shrine', cls: 'wok-shrine',
        scene: () => `
          ${L(58, 1, `
            ${torii(400, 214, 1.0, '#7a1408')}
            <rect x="250" y="250" width="300" height="16" rx="4" fill="#4a2410"/>
            <rect x="290" y="220" width="220" height="34" rx="4" fill="#5a2c14"/>
            <g transform="translate(400 168)">
              <path d="M-64 30 Q-64 -26 0 -26 Q64 -26 64 30 Q30 16 0 34 Q-30 16 -64 30 Z" fill="#e8b060"/>
              <path d="M-64 30 Q-30 12 0 34 Q30 12 64 30 Q30 44 0 34 Q-30 44 -64 30 Z" fill="#c98a3c"/>
              <path d="M-44 6 q44 -22 88 0" stroke="#f2d29a" stroke-width="5" fill="none" opacity=".7"/>
              <path d="M-8 32 L-4 52 L8 50 L4 30 Z" fill="#fff8ec"/>
              <path d="M-6 40 h10" stroke="#d93a20" stroke-width="2.4"/>
            </g>
            <path d="M0 320 L800 320 L800 296 Q400 284 0 298 Z" fill="#1c0a08"/>
            ${[300, 340, 460, 500].map((x) => `<circle cx="${x}" cy="290" r="5" fill="#e8a13c"><animate attributeName="opacity" values="1;.6;1" dur="${r(2, 4)}s" repeatCount="indefinite"/></circle>`).join('')}
            ${stoneLantern(180, 306, 1.4, '#2a1210', '#ffb84d')}${stoneLantern(620, 306, 1.4, '#2a1210', '#ffb84d')}
            <path d="M226 306 q4 -40 -4 -70 M574 306 q-4 -44 4 -74" stroke="#e8e0d0" stroke-width="3" fill="none" opacity=".5">
              <animate attributeName="opacity" values=".5;.2;.5" dur="4s" repeatCount="indefinite"/>
            </path>
          `)}
          ${sprinkle(9, 'fortune', () => `left:${r(4, 94)}%;--dur:${r(8, 14)}s;animation-delay:-${r(0, 13)}s;--sway:${r(-50, 50)}px;--rot:${r(100, 340)}deg`)}
          ${embers(8)}
          ${stars(12, [0, 30])}
        `,
      },
      {
        id: 'boba', name: 'The Boba Lagoon', cls: 'wok-boba',
        scene: () => `
          ${L(48, 1, `
            <path d="M0 220 Q200 204 400 216 T800 212 L800 320 L0 320 Z" fill="#c9985a"/>
            <path d="M0 236 Q240 222 480 232 T800 228" stroke="#e0b884" stroke-width="6" fill="none" opacity=".7"/>
            <path d="M60 260 q40 -10 80 0 M300 268 q50 -12 100 0 M580 258 q40 -10 84 0" stroke="#e0b884" stroke-width="4" fill="none" opacity=".5"/>
            ${[120, 300, 490, 670].map((x) => `<circle cx="${x}" cy="${r(250, 296)}" r="${r(12, 22)}" fill="#2c1408"/><ellipse cx="${x - 5}" cy="${r(244, 288)}" rx="4" ry="3" fill="#5a3418" opacity=".9"/>`).join('')}
          `)}
          ${H('right:-6%;top:-4%;width:200px', 200, 260, `
            <path d="M30 40 L170 40 L156 250 L44 250 Z" fill="#f2e2c8" opacity=".25"/>
            <path d="M30 40 L170 40 L166 70 L34 70 Z" fill="#f2e2c8" opacity=".35"/>
            <rect x="24" y="30" width="152" height="14" rx="7" fill="#e0447a"/>
            <rect x="88" y="-30" width="24" height="110" rx="10" fill="#e0447a" transform="rotate(18 100 20)"/>
            <path d="M92 -26 l16 6 M88 -12 l16 6 M84 2 l16 6" stroke="#fff" stroke-width="5" transform="rotate(18 100 20)"/>
          `)}
          ${sprinkle(12, 'pearl', () => `left:${r(2, 96)}%;--s:${r(8, 16)}px;--dur:${r(8, 15)}s;animation-delay:-${r(0, 14)}s;--sway:${r(-24, 24)}px`)}
          ${steam(5)}
          ${stars(10, [0, 26])}
        `,
      },
    ],
  },

  // ————— PULL B — PIRATE RADIO ATOLL: an illegal station run from a volcano —————
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
          <div class="fx bigsun" style="left:50%;margin-left:-70px;top:8%;--c1:#ffe9b3;--c2:#ff9a4c;--s:140px"></div>
          ${L(48, 1, `
            <rect x="0" y="120" width="800" height="200" fill="#1c6b8a"/>
            <path d="M0 120 h800" stroke="#7ae0d0" stroke-width="3" opacity=".7"/>
            <path d="M40 150 q40 -8 90 0 M420 170 q50 -10 110 0 M600 145 q40 -8 90 0" stroke="#4aa8c0" stroke-width="5" fill="none" opacity=".8"/>
            <path d="M0 240 Q200 224 420 238 T800 234 L800 320 L0 320 Z" fill="#e8c88a"/>
            <path d="M120 268 q20 -6 44 0 M360 280 q26 -8 52 0 M600 270 q22 -6 46 0" stroke="#d9a860" stroke-width="4" fill="none"/>
            <circle cx="200" cy="290" r="6" fill="#ff8a5c"/><path d="M196 285 q4 -6 8 0" stroke="#c25a2c" stroke-width="2" fill="none"/>
            <path d="M540 288 a10 7 0 0 1 20 0 Z" fill="#f2e2c8"/><circle cx="546" cy="284" r="1.6" fill="#2a1a10"/>
          `)}
          ${L(58, 2, `
            <g transform="rotate(-4 400 220)">
              <path d="M240 240 Q400 300 570 236 L548 168 Q400 216 262 172 Z" fill="#6a3a1c"/>
              <path d="M262 190 Q400 232 548 186 M256 208 Q400 252 556 204" stroke="#4a2410" stroke-width="5" fill="none"/>
              ${[300, 360, 420, 480].map((x) => `<circle cx="${x}" cy="216" r="6" fill="#2a160a"/>`).join('')}
              <rect x="392" y="30" width="10" height="150" fill="#4a2410"/>
              <rect x="300" y="66" width="9" height="118" fill="#4a2410" transform="rotate(-14 300 66)"/>
              <path d="M402 40 Q470 66 402 106 Z" fill="#f2e2c8">
                <animateTransform attributeName="transform" type="skewX" values="0;7;0;-4;0" dur="3.4s" repeatCount="indefinite"/>
              </path>
              <path d="M402 44 l56 24 M402 58 l48 18" stroke="#d9b88a" stroke-width="2.4" opacity=".8"/>
              <rect x="384" y="18" width="46" height="26" fill="#1c1208"/>
              <circle cx="399" cy="28" r="6" fill="#f2e2c8"/><circle cx="399" cy="28" r="2.6" fill="#1c1208"/>
              <path d="M392 38 l-8 8 M406 38 l8 8" stroke="#f2e2c8" stroke-width="3"/>
              <path d="M240 240 q-30 -4 -44 -24 q22 -6 44 4 Z" fill="#6a3a1c"/>
            </g>
            <path d="M96 320 q-6 -110 24 -180 q10 34 2 78 q22 -50 52 -62 q-8 40 -38 78 q30 -18 48 -8 q-30 26 -64 40 q-6 28 -8 54 Z" fill="#2c8a54"/>
            <ellipse cx="120" cy="316" rx="46" ry="10" fill="#1c6b3c"/>
          `)}
          ${sprinkle(6, 'radiowave', () => `left:${r(42, 60)}%;top:${r(4, 22)}%;--d:${r(2, 4)}s;--s:${r(14, 28)}px;animation-delay:-${r(0, 4)}s`)}
          ${sprinkle(3, 'gull', (i) => `left:${r(8, 80)}%;top:${r(8, 26)}%;--d:${r(3, 5)}s;animation-delay:-${r(0, 4)}s`)}
          ${sprinkle(3, 'crab', () => `left:${r(8, 80)}%;bottom:${r(3, 8)}%;--dur:${r(16, 26)}s;animation-delay:-${r(0, 20)}s`)}
          ${sprinkle(5, 'ripple', () => `left:${r(8, 88)}%;top:${r(48, 60)}%;--d:${r(3, 6)}s`)}
        `,
      },
      {
        id: 'lighthouse', name: 'The Volcano Lighthouse', cls: 'atoll-light',
        scene: () => `
          ${stars(14, [0, 30])}
          ${L(46, 1, `
            <rect x="0" y="140" width="800" height="180" fill="#16394a"/>
            <path d="M0 140 h800" stroke="#ff9a5c" stroke-width="3" opacity=".8"/>
            <path d="M60 170 q50 -10 100 0 M320 186 q60 -12 120 0 M580 168 q50 -10 100 0" stroke="#2c5a6c" stroke-width="6" fill="none"/>
            <path d="M480 140 L560 140 L620 320 L420 320 Z" fill="#2a1024"/>
            <path d="M492 140 l16 60 M548 140 l-10 66" stroke="#1a0a16" stroke-width="5"/>
          `)}
          ${L(72, 2, `
            <path d="M560 320 L590 120 L680 120 L710 320 Z" fill="#3a1430"/>
            <path d="M574 240 h124 M582 180 h108" stroke="#57204a" stroke-width="10"/>
            <path d="M588 120 h94 l-8 -22 h-78 Z" fill="#241020"/>
            <rect x="606" y="72" width="58" height="30" fill="#ffe9b3">
              <animate attributeName="opacity" values="1;.65;1" dur="2s" repeatCount="indefinite"/>
            </rect>
            <path d="M600 72 h70 M600 102 h70 M618 72 v30 M652 72 v30" stroke="#241020" stroke-width="4"/>
            <path d="M598 68 L635 44 L672 68 Z" fill="#c23b52"/>
            <circle cx="635" cy="40" r="5" fill="#ff3b3b"><animate attributeName="opacity" values="1;.2;1" dur="1.4s" repeatCount="indefinite"/></circle>
            <path d="M622 130 q-60 90 -30 190 M650 130 q40 100 16 190" stroke="#ff6a2c" stroke-width="7" fill="none" opacity=".9">
              <animate attributeName="opacity" values=".9;.5;.9" dur="2.6s" repeatCount="indefinite"/>
            </path>
            <path d="M560 260 q-40 10 -60 34 q30 6 60 -6 Z" fill="#3a1430"/>
          `)}
          <div class="fx beam" style="right:118px;top:-46px"></div>
          ${embers(10)}
          ${sprinkle(5, 'radiowave', () => `left:${r(66, 88)}%;top:${r(2, 16)}%;--d:${r(2, 4)}s;--s:${r(14, 30)}px;animation-delay:-${r(0, 4)}s`)}
          ${sprinkle(4, 'ripple', () => `left:${r(6, 60)}%;top:${r(50, 62)}%;--d:${r(3, 6)}s`)}
        `,
      },
      {
        id: 'parrots', name: 'The Parrot Congress', cls: 'atoll-parrots',
        scene: () => `
          <div class="fx bigsun" style="right:10%;top:5%;--c1:#fff6d0;--c2:#ffd24a;--s:90px"></div>
          ${L(70, 1, `
            <path d="M110 320 q-10 -140 30 -210 q12 40 0 96 q30 -60 70 -76 q-10 48 -50 94 q40 -22 64 -10 q-38 30 -84 46 q-8 32 -10 60 Z" fill="#2c9a5c"/>
            <path d="M690 320 q10 -130 -26 -196 q-12 38 0 90 q-28 -56 -66 -70 q10 44 48 88 q-38 -20 -60 -8 q36 28 78 42 q8 28 10 54 Z" fill="#249150"/>
            <path d="M0 320 L800 320 L800 292 Q400 278 0 294 Z" fill="#e8c88a"/>
          `)}
          ${L(56, 2, `
            <rect x="250" y="150" width="300" height="14" rx="6" fill="#8a5a2a"/>
            <rect x="290" y="210" width="220" height="14" rx="6" fill="#8a5a2a"/>
            <rect x="330" y="270" width="140" height="14" rx="6" fill="#8a5a2a"/>
            <path d="M264 150 v170 M536 150 v170" stroke="#6a4420" stroke-width="8"/>
            <g transform="translate(400 96)">
              <circle r="34" fill="none" stroke="#6a4420" stroke-width="9"/>
              ${[0, 45, 90, 135].map((a) => `<line x1="${-42 * Math.cos(a * Math.PI / 180)}" y1="${-42 * Math.sin(a * Math.PI / 180)}" x2="${42 * Math.cos(a * Math.PI / 180)}" y2="${42 * Math.sin(a * Math.PI / 180)}" stroke="#6a4420" stroke-width="7"/>`).join('')}
              <circle r="8" fill="#4a2c12"/>
            </g>
            ${[[280, 138], [350, 138], [470, 138], [310, 198], [430, 198], [490, 198], [360, 258], [420, 258]].map(([x, y], i) => `
              <g transform="translate(${x} ${y})">
                <ellipse cx="0" cy="0" rx="10" ry="13" fill="${['#e83a4e', '#2fb56b', '#3a8fd9', '#ffb84d', '#8f6fdc'][i % 5]}"/>
                <circle cx="0" cy="-14" r="7" fill="${['#e83a4e', '#2fb56b', '#3a8fd9', '#ffb84d', '#8f6fdc'][i % 5]}"/>
                <circle cx="2.4" cy="-15" r="1.6" fill="#1c1208"/>
                <path d="M6 -13 q6 1 4 6 q-4 -1 -4 -3 Z" fill="#ffd24a"/>
                <path d="M-8 -2 q-6 6 -2 14" stroke="${['#c22a3c', '#1f8a4e', '#2a6ba8', '#d9932c', '#6f4fc0'][i % 5]}" stroke-width="3.4" fill="none"/>
                ${i === 4 ? '<rect x="-16" y="-30" width="32" height="9" rx="4" fill="#2a1608"/><path d="M0 -30 v-8" stroke="#2a1608" stroke-width="3"/>' : ''}
              </g>`).join('')}
          `)}
          ${sprinkle(9, 'feather', (i) => `left:${r(0, 100)}%;--c:${['#e83a4e', '#2fb56b', '#3a8fd9', '#ffb84d'][i % 4]};--dur:${r(9, 16)}s;animation-delay:-${r(0, 15)}s;--sway:${r(-55, 55)}px;--rot:${r(120, 420)}deg`)}
          ${sprinkle(4, 'radiowave', () => `left:${r(40, 62)}%;top:${r(6, 20)}%;--d:${r(2, 4)}s;--s:${r(12, 22)}px;animation-delay:-${r(0, 4)}s`)}
          ${sprinkle(3, 'gull', () => `left:${r(8, 84)}%;top:${r(4, 18)}%;--d:${r(3, 5)}s;animation-delay:-${r(0, 4)}s`)}
        `,
      },
      {
        id: 'kraken', name: "The Kraken's Turntables", cls: 'atoll-kraken',
        scene: () => `
          ${stars(10, [0, 24])}
          ${L(52, 1, `
            <rect x="0" y="110" width="800" height="210" fill="#123a52"/>
            <path d="M0 110 h800" stroke="#7ae0d0" stroke-width="3" opacity=".6"/>
            <g transform="translate(400 240)">
              ${[0, 1, 2].map((i) => `<ellipse rx="${130 - i * 38}" ry="${34 - i * 10}" fill="none" stroke="#0c2a3c" stroke-width="${14 - i * 4}" transform="rotate(${i * 8})"/>`).join('')}
            </g>
          `)}
          ${L(64, 2, `
            ${[[150, 1.1, -6], [400, 1.5, 4], [640, 1.0, -3]].map(([x, s, tilt]) => `
              <g transform="rotate(${tilt} ${x} 320)">
                <path d="M${x} 320 Q${x - 26 * s} ${320 - 90 * s} ${x - 10 * s} ${320 - 150 * s} Q${x + 2 * s} ${320 - 190 * s} ${x + 30 * s} ${320 - 176 * s}" fill="none" stroke="#6a2c5a" stroke-width="${26 * s}" stroke-linecap="round">
                  <animateTransform attributeName="transform" type="rotate" values="-3 ${x} 320;4 ${x} 320;-3 ${x} 320" dur="${r(5, 8)}s" repeatCount="indefinite" additive="sum"/>
                </path>
                ${[0.3, 0.5, 0.7].map((f) => `<circle cx="${x - 18 * s + f * 20 * s}" cy="${320 - 150 * s * f}" r="${5 * s}" fill="#8f4a7c"><animateTransform attributeName="transform" type="rotate" values="-3 ${x} 320;4 ${x} 320;-3 ${x} 320" dur="${r(5, 8)}s" repeatCount="indefinite" additive="sum"/></circle>`).join('')}
              </g>`).join('')}
          `)}
          ${Array.from({ length: 3 }, (_, i) => `
            <span class="sp vinyl" style="left:${[16, 46, 76][i]}%;top:${r(22, 40)}%;--d:${r(3, 5)}s;--spin:${r(2, 4)}s;--c:${['#e0447a', '#3adcc8', '#ffd24a'][i]}"><i></i></span>`).join('')}
          ${bubbles(10)}
          ${sprinkle(6, 'radiowave', () => `left:${r(10, 90)}%;top:${r(4, 24)}%;--d:${r(2, 4)}s;--s:${r(14, 26)}px;animation-delay:-${r(0, 4)}s`)}
        `,
      },
      {
        id: 'bottles', name: 'Message-in-a-Bottle Bay', cls: 'atoll-bottles',
        scene: () => `
          <div class="fx bigsun" style="left:12%;top:6%;--c1:#fff6d0;--c2:#ffb84d;--s:110px"></div>
          ${L(52, 1, `
            <rect x="0" y="120" width="800" height="200" fill="#2c8aa8"/>
            <path d="M0 120 h800" stroke="#ffe9b3" stroke-width="3" opacity=".8"/>
            <path d="M60 160 q50 -10 100 0 M300 186 q60 -12 120 0 M560 156 q56 -10 112 0" stroke="#4ab8d0" stroke-width="6" fill="none" opacity=".9"/>
          `)}
          ${L(60, 2, `
            <g transform="rotate(6 600 220)">
              <path d="M520 240 q0 -70 44 -96 l0 -18 q-8 -4 -8 -14 l60 0 q0 10 -8 14 l0 18 q44 26 44 96 q0 46 -66 46 q-66 0 -66 -46 Z" fill="#7ac8b8" opacity=".85"/>
              <rect x="576" y="98" width="24" height="18" rx="4" fill="#8a5a2a"/>
              <rect x="544" y="180" width="88" height="58" rx="6" fill="#e8d5ae"/>
              <rect x="560" y="196" width="26" height="42" rx="3" fill="#6a3a1c"/>
              <circle cx="580" cy="218" r="2.6" fill="#ffd24a"/>
              <rect x="596" y="196" width="26" height="20" rx="3" fill="#ffe9b3"><animate attributeName="opacity" values="1;.6;1" dur="3s" repeatCount="indefinite"/></rect>
              <path d="M596 206 h26 M609 196 v20" stroke="#8a5a2a" stroke-width="2.4"/>
              <path d="M528 168 q54 -18 120 0" stroke="#5aa896" stroke-width="4" fill="none" opacity=".8"/>
            </g>
          `)}
          ${Array.from({ length: 4 }, (_, i) => `
            <span class="sp bottle" style="left:${[8, 26, 48, 68][i]}%;top:${r(48, 64)}%;--d:${r(3, 5)}s;animation-delay:-${r(0, 4)}s">
              <svg viewBox="0 0 26 40">
                <path d="M9 12 L9 4 Q9 1 13 1 Q17 1 17 4 L17 12 Q23 16 23 26 Q23 38 13 38 Q3 38 3 26 Q3 16 9 12 Z" fill="#8fd8c8" opacity=".85"/>
                <rect x="10" y="0" width="6" height="6" rx="2" fill="#8a5a2a"/>
                <rect x="8" y="20" width="10" height="13" rx="2" fill="#f2e2c8" transform="rotate(-8 13 26)"/>
                <path d="M10 24 h6 M10 27 h6" stroke="#b3862a" stroke-width="1.3" transform="rotate(-8 13 26)"/>
                <path d="M6 16 q3 -4 5 -5" stroke="#dff6f0" stroke-width="2" fill="none" opacity=".8"/>
              </svg>
            </span>`).join('')}
          ${sprinkle(5, 'radiowave', () => `left:${r(10, 84)}%;top:${r(30, 52)}%;--d:${r(2.4, 4.4)}s;--s:${r(12, 22)}px;animation-delay:-${r(0, 4)}s`)}
          ${sprinkle(4, 'gull', () => `left:${r(10, 86)}%;top:${r(6, 22)}%;--d:${r(3, 5)}s;animation-delay:-${r(0, 4)}s`)}
          ${sprinkle(5, 'ripple', () => `left:${r(6, 90)}%;top:${r(46, 66)}%;--d:${r(3, 6)}s`)}
        `,
      },
      {
        id: 'skull', name: 'The Skull Cave Studio', cls: 'atoll-skull',
        scene: () => `
          ${stars(20, [0, 34])}
          ${H('right:6%;top:4%;width:90px', 90, 90, `<circle cx="45" cy="45" r="38" fill="#f4f0dc"/><circle cx="32" cy="36" r="7" fill="#d8d2b4" opacity=".8"/><circle cx="58" cy="56" r="9" fill="#d8d2b4" opacity=".7"/>`, 'moonglow')}
          ${L(50, 1, `
            <rect x="0" y="150" width="800" height="170" fill="#14294a"/>
            <path d="M0 150 h800" stroke="#8fb8d8" stroke-width="2.4" opacity=".6"/>
            <path d="M340 190 q60 8 120 0 l-8 30 q-52 8 -104 0 Z" fill="#e8f0f8" opacity=".14"/>
          `)}
          ${L(72, 2, `
            <path d="M230 320 L230 160 Q230 60 400 60 Q570 60 570 160 L570 320 Z" fill="#d9d0b8"/>
            <ellipse cx="330" cy="160" rx="42" ry="48" fill="#141c30"/>
            <ellipse cx="470" cy="160" rx="42" ry="48" fill="#141c30"/>
            <circle cx="330" cy="164" r="15" fill="#ffb84d"><animate attributeName="opacity" values="1;.5;1" dur="2.2s" repeatCount="indefinite"/></circle>
            <circle cx="470" cy="164" r="15" fill="#ff5d7a"><animate attributeName="opacity" values=".5;1;.5" dur="2.2s" repeatCount="indefinite"/></circle>
            <path d="M400 200 L380 246 L420 246 Z" fill="#141c30"/>
            <path d="M300 268 h200 v52 h-200 Z" fill="#141c30"/>
            ${[316, 352, 388, 424, 460].map((x) => `<rect x="${x}" y="268" width="22" height="52" fill="#d9d0b8"/>`).join('')}
            <rect x="342" y="230" width="116" height="26" rx="6" fill="#7a1830"/>
            <text x="400" y="248" text-anchor="middle" font-family="monospace" font-size="15" fill="#ffe9b3">ON AIR</text>
            <path d="M254 128 q-14 -44 12 -70 M546 128 q14 -44 -12 -70" stroke="#d9d0b8" stroke-width="9" fill="none" stroke-linecap="round"/>
            <circle cx="266" cy="52" r="7" fill="#ffb84d"><animate attributeName="opacity" values="1;.4;1" dur="1.8s" repeatCount="indefinite"/></circle>
            <circle cx="534" cy="52" r="7" fill="#ffb84d"><animate attributeName="opacity" values=".4;1;.4" dur="1.8s" repeatCount="indefinite"/></circle>
          `)}
          ${sprinkle(7, 'radiowave', () => `left:${r(30, 70)}%;top:${r(6, 30)}%;--d:${r(2, 4)}s;--s:${r(14, 30)}px;animation-delay:-${r(0, 4)}s`)}
          ${sprinkle(4, 'ripple', () => `left:${r(6, 90)}%;top:${r(46, 58)}%;--d:${r(3, 6)}s`)}
          ${bubbles(5)}
        `,
      },
      {
        id: 'storm', name: 'The Hurricane Dancefloor', cls: 'atoll-storm',
        scene: () => `
          <div class="fx lightning"></div>
          ${L(40, 1, `
            ${[[120, 40, 90], [340, 26, 120], [600, 50, 100]].map(([x, y, w]) => `
              <ellipse cx="${x}" cy="${y}" rx="${w}" ry="30" fill="#2c3450"/>
              <ellipse cx="${x + 40}" cy="${y + 14}" rx="${w * 0.8}" ry="26" fill="#222a44"/>`).join('')}
            <path d="M300 66 l-20 44 h16 l-24 52 l40 -36 h-16 l28 -46 Z" fill="#ffe06a">
              <animate attributeName="opacity" values="0;0;1;0;0;0" keyTimes="0;.9;.93;.96;.98;1" dur="6s" repeatCount="indefinite"/>
            </path>
          `)}
          ${L(52, 2, `
            <rect x="0" y="120" width="800" height="200" fill="#1c3a54"/>
            <path d="M0 150 Q100 96 200 150 T400 148 T600 152 T800 146 L800 320 L0 320 Z" fill="#254a68"/>
            <path d="M0 150 Q100 96 200 150 T400 148 T600 152 T800 146" stroke="#8fd8e8" stroke-width="7" fill="none">
              <animate attributeName="d" values="M0 150 Q100 96 200 150 T400 148 T600 152 T800 146;M0 146 Q100 190 200 146 T400 152 T600 146 T800 152;M0 150 Q100 96 200 150 T400 148 T600 152 T800 146" dur="4.5s" repeatCount="indefinite"/>
            </path>
            <g transform="rotate(-10 400 190)">
              <path d="M330 210 Q400 236 476 208 L462 176 Q400 196 344 178 Z" fill="#4a2410"/>
              <rect x="396" y="110" width="8" height="80" fill="#2a160a"/>
              <path d="M404 116 Q446 134 404 158 Z" fill="#ffd24a"><animateTransform attributeName="transform" type="skewX" values="0;10;0;-6;0" dur="1.2s" repeatCount="indefinite"/></path>
              <circle cx="400" cy="104" r="6" fill="#ff3b3b"><animate attributeName="opacity" values="1;.3;1" dur="1s" repeatCount="indefinite"/></circle>
            </g>
          `)}
          ${rain(16)}
          ${sprinkle(5, 'radiowave', () => `left:${r(38, 62)}%;top:${r(18, 38)}%;--d:${r(1.6, 3)}s;--s:${r(12, 24)}px;animation-delay:-${r(0, 3)}s`)}
        `,
      },
      {
        id: 'antenna', name: 'The Treasure Antenna', cls: 'atoll-antenna',
        scene: () => `
          <div class="fx bigsun" style="left:50%;margin-left:-60px;top:10%;--c1:#fff0b3;--c2:#ffb84d;--s:120px"></div>
          ${L(56, 1, `
            <path d="M0 320 L800 320 L800 260 Q400 240 0 264 Z" fill="#8a5a9c"/>
            <path d="M120 320 Q400 130 690 320 Z" fill="#e8b03c"/>
            ${Array.from({ length: 22 }, () => { const x = r(230, 580), y = r(200, 300); return `<circle cx="${x}" cy="${y}" r="${r(6, 11)}" fill="#ffd24a" stroke="#c2822c" stroke-width="2"/>`; }).join('')}
            <path d="M320 250 h16 v-26 h-16 Z M336 232 a8 8 0 0 1 -16 0" fill="#ffe9b3" stroke="#c2822c" stroke-width="2"/>
            <path d="M470 240 l10 -18 l10 18 M466 240 h28 l-4 16 h-20 Z" fill="#ff5d7a" stroke="#c22a4c" stroke-width="2"/>
            <path d="M394 208 l8 -14 l8 8 l8 -8 l8 14 Z" fill="#ffd24a" stroke="#c2822c" stroke-width="2.4"/>
          `)}
          ${L(78, 2, `
            <path d="M380 96 L420 96 L448 320 L352 320 Z" fill="none" stroke="#6a3a1c" stroke-width="8"/>
            <path d="M368 180 h64 M360 250 h80 M382 96 L438 320 M418 96 L362 320" stroke="#6a3a1c" stroke-width="6"/>
            <rect x="384" y="60" width="32" height="40" rx="6" fill="#8a4a2c"/>
            <circle cx="400" cy="44" r="8" fill="#ff3b3b"><animate attributeName="opacity" values="1;.25;1" dur="1.5s" repeatCount="indefinite"/></circle>
            <line x1="400" y1="60" x2="400" y2="30" stroke="#6a3a1c" stroke-width="4"/>
            <g transform="translate(430 88)"><path d="M0 0 q8 -12 20 -8 q6 -8 14 -4 q8 -2 8 6 l-42 6 Z" fill="#f2e8d0"/><circle cx="8" cy="-4" r="1.4" fill="#2a1a10"/><path d="M14 4 l-2 6 M20 4 l2 6" stroke="#d9903c" stroke-width="2"/></g>
          `)}
          ${sprinkle(9, 'coin', () => `left:${r(22, 76)}%;--dur:${r(6, 12)}s;animation-delay:-${r(0, 11)}s;--sway:${r(-30, 30)}px;--rot:${r(120, 400)}deg`)}
          ${sprinkle(8, 'radiowave', () => `left:${r(40, 60)}%;top:${r(2, 20)}%;--d:${r(2, 4)}s;--s:${r(14, 32)}px;animation-delay:-${r(0, 4)}s`)}
        `,
      },
    ],
  },

  // ————— LEGS B — YETI SKI RESORT: a 1980s alpine resort staffed by yetis —————
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
          ${L(64, 1, `
            <path d="M0 320 L0 190 L120 90 L240 210 L370 60 L500 200 L620 110 L800 240 L800 320 Z" fill="#f4fafd"/>
            <path d="M120 90 L86 130 L120 126 L152 132 Z M370 60 L336 104 L370 98 L404 106 Z M620 110 L592 144 L620 140 L650 146 Z" fill="#8ec8ec"/>
            ${pines(800, 320, 14, '#2c6b8a', 50, 100, 1, '#f4fafd')}
          `)}
          ${L(80, 2, `
            <path d="M120 320 L140 120 M660 320 L640 110" stroke="#4a3a2a" stroke-width="10"/>
            <path d="M96 150 L184 150 M616 140 L704 140" stroke="#4a3a2a" stroke-width="8"/>
            <path d="M0 170 Q400 230 800 155" stroke="#2a2018" stroke-width="5" fill="none"/>
            ${[[190, 208, true], [400, 230, false], [610, 196, true]].map(([x, y, hasYeti]) => `
              <g>
                <line x1="${x}" y1="${y - 42}" x2="${x}" y2="${y}" stroke="#2a2018" stroke-width="5"/>
                <rect x="${x - 26}" y="${y}" width="52" height="8" rx="3" fill="#c23b52"/>
                <rect x="${x - 24}" y="${y + 8}" width="48" height="26" rx="5" fill="#e0447a"/>
                ${hasYeti ? `
                  <circle cx="${x}" cy="${y + 2}" r="13" fill="#f4fafd"/>
                  <circle cx="${x - 4}" cy="${y}" r="1.8" fill="#1c3348"/><circle cx="${x + 4}" cy="${y}" r="1.8" fill="#1c3348"/>
                  <path d="M${x - 4} ${y + 6} q4 3 8 0" stroke="#1c3348" stroke-width="1.6" fill="none"/>
                  <rect x="${x - 12}" y="${y - 16}" width="24" height="8" rx="4" fill="#3a8fd9"/>
                  <circle cx="${x}" cy="${y - 18}" r="4" fill="#ffd24a"/>
                  <path d="M${x - 7} ${y + 34} l-3 12 M${x + 7} ${y + 34} l3 12" stroke="#c23b52" stroke-width="3.4"/>
                  <path d="M${x - 14} ${y + 48} h10 M${x + 4} ${y + 48} h10" stroke="#3a8fd9" stroke-width="3.4"/>` : ''}
                <animateTransform attributeName="transform" type="rotate" values="-2 ${x} ${y - 42};2.4 ${x} ${y - 42};-2 ${x} ${y - 42}" dur="${r(3, 5)}s" repeatCount="indefinite"/>
              </g>`).join('')}
            <path d="M0 320 L800 320 L800 290 Q400 274 0 292 Z" fill="#eef7fc"/>
            <g><rect x="60" y="238" width="90" height="54" rx="6" fill="#8a5a3a"/><path d="M48 244 L105 206 L162 244 Z" fill="#5a3a22"/><rect x="82" y="258" width="20" height="34" rx="3" fill="#4a2c16"/><rect x="112" y="258" width="22" height="18" rx="3" fill="#ffd98a"><animate attributeName="opacity" values="1;.6;1" dur="3.4s" repeatCount="indefinite"/></rect><path d="M140 214 q4 -18 -4 -30" stroke="#dfe8f2" stroke-width="6" fill="none" opacity=".8"/></g>
          `)}
          ${snowfall(20)}
        `,
      },
      {
        id: 'blackdiamond', name: 'The Black Diamond Run', cls: 'yeti-diamond',
        scene: () => `
          ${L(100, 1, `
            <path d="M0 0 L800 190 L800 320 L0 320 Z" fill="#f4fafd"/>
            <path d="M0 40 L800 230 M0 90 L800 270" stroke="#dceef8" stroke-width="16"/>
            ${[[90, 80], [230, 122], [380, 166], [540, 210], [690, 250]].map(([x, y], i) => `
              <g transform="rotate(12 ${x} ${y})">
                <line x1="${x}" y1="${y - 30}" x2="${x}" y2="${y}" stroke="#e8f0f6" stroke-width="4"/>
                <path d="M${x} ${y - 30} h18 l-5 7 l5 7 h-18 Z" fill="${i % 2 ? '#e0447a' : '#3a8fd9'}">
                  <animateTransform attributeName="transform" type="skewX" values="0;8;0;-5;0" dur="${r(1.2, 2.2)}s" repeatCount="indefinite"/>
                </path>
              </g>`).join('')}
            <path d="M60 240 L110 240 L85 205 Z M620 60 L668 60 L644 26 Z" fill="#dceef8"/>
            <g transform="rotate(9 200 60)"><rect x="170" y="34" width="60" height="42" rx="6" fill="#1c3348"/><path d="M200 42 l12 20 h-24 Z" fill="#f4fafd"/><text x="200" y="72" text-anchor="middle" font-family="monospace" font-size="9" fill="#f4fafd">DBL DIAMOND</text></g>
          `)}
          <span class="sp skiyeti" style="--dur:8s;animation-delay:-${r(0, 7)}s">
            <svg viewBox="0 0 60 56">
              <circle cx="26" cy="14" r="11" fill="#eef4f8"/>
              <circle cx="23" cy="13" r="1.8" fill="#1c3348"/><circle cx="30" cy="13" r="1.8" fill="#1c3348"/>
              <path d="M22 18 q4 3 8 0" stroke="#1c3348" stroke-width="1.8" fill="none"/>
              <rect x="14" y="0" width="24" height="8" rx="4" fill="#e0447a"/><circle cx="26" cy="-2" r="4" fill="#ffd24a"/>
              <ellipse cx="28" cy="34" rx="14" ry="15" fill="#eef4f8"/>
              <path d="M40 28 q12 4 16 -4" stroke="#e0447a" stroke-width="5" stroke-linecap="round" fill="none">
                <animate attributeName="d" values="M40 28 q12 4 16 -4;M40 28 q14 -2 18 -10;M40 28 q12 4 16 -4" dur="0.9s" repeatCount="indefinite"/>
              </path>
              <path d="M18 46 l-6 8 M36 44 l4 9" stroke="#c23b52" stroke-width="4.4"/>
              <path d="M2 56 q28 8 56 -2" stroke="#3a8fd9" stroke-width="4" stroke-linecap="round" fill="none"/>
            </svg>
          </span>
          ${sprinkle(6, 'spray', () => `left:${r(10, 80)}%;top:${r(30, 76)}%;--d:${r(1, 2.2)}s;--s:${r(10, 22)}px;animation-delay:-${r(0, 2)}s`)}
          ${snowfall(18)}
        `,
      },
      {
        id: 'apresski', name: 'Après-Ski Disco', cls: 'yeti-disco',
        scene: () => `
          <div class="fx discoball"><i></i></div>
          ${L(58, 1, `
            <path d="M0 320 L0 180 L400 120 L800 180 L800 320 Z" fill="#3a2456"/>
            <path d="M0 180 L400 120 L800 180" stroke="#241640" stroke-width="10" fill="none"/>
            ${windows(80, 210, 3, 2, 30, 24, 18, '#ffb84d', '#2a1a44')}
            ${windows(560, 210, 3, 2, 30, 24, 18, '#ff5d7a', '#2a1a44')}
            <rect x="330" y="196" width="140" height="124" rx="8" fill="#241640"/>
            <path d="M330 196 h140" stroke="#ffd24a" stroke-width="5"/>
            ${[[366, 258, '#f4fafd'], [400, 262, '#f4fafd'], [436, 256, '#c8b8e8']].map(([x, y, c], i) => `
              <g>
                <ellipse cx="${x}" cy="${y + 22}" rx="11" ry="14" fill="${c}"/>
                <circle cx="${x}" cy="${y}" r="8" fill="${c}"/>
                <circle cx="${Number(x) - 2.6}" cy="${y}" r="1.4" fill="#241640"/><circle cx="${Number(x) + 2.6}" cy="${y}" r="1.4" fill="#241640"/>
                <path d="M${Number(x) - 3} ${Number(y) + 4} q3 2.4 6 0" stroke="#241640" stroke-width="1.4" fill="none"/>
                <path d="M${Number(x) - 9} ${Number(y) + 18} q-6 ${i % 2 ? -8 : 6} -10 ${i % 2 ? -12 : 2} M${Number(x) + 9} ${Number(y) + 18} q6 ${i % 2 ? 6 : -8} 10 ${i % 2 ? 2 : -12}" stroke="${c}" stroke-width="4" stroke-linecap="round" fill="none">
                  <animateTransform attributeName="transform" type="rotate" values="-6 ${x} ${y + 18};7 ${x} ${y + 18};-6 ${x} ${y + 18}" dur="${r(0.7, 1.2)}s" repeatCount="indefinite"/>
                </path>
              </g>`).join('')}
            <path d="M60 320 L120 320 M680 320 L740 320" stroke="#18102e" stroke-width="8"/>
          `)}
          ${sprinkle(12, 'discodot', (i) => `left:${r(4, 94)}%;top:${r(10, 74)}%;--d:${r(1.2, 3)}s;--c:${['#ff4f9e', '#3adcc8', '#ffd24a', '#8f6fdc'][i % 4]}`)}
          ${steam(3)}
          ${snowfall(6)}
        `,
      },
      {
        id: 'springs', name: 'The Steaming Springs', cls: 'yeti-springs',
        scene: () => `
          ${L(56, 1, `
            <path d="M0 320 L0 170 L150 90 L300 190 L460 80 L620 180 L800 120 L800 320 Z" fill="#e8d0e0"/>
            <path d="M150 90 L122 122 L150 118 L180 124 Z M460 80 L430 116 L460 110 L492 118 Z" fill="#c890b8"/>
            ${pines(800, 320, 8, '#6a4a7c', 40, 80, .9, '#e8d0e0')}
          `)}
          ${L(40, 2, `
            <path d="M0 320 L800 320 L800 270 Q400 254 0 272 Z" fill="#eef4f8"/>
            ${[[210, 285, 130], [520, 292, 150]].map(([cx, cy, w]) => `
              <ellipse cx="${cx}" cy="${cy}" rx="${w / 2 + 14}" ry="20" fill="#dceef8"/>
              <ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="15" fill="#3adcc8"/>
              <ellipse cx="${cx - w / 6}" cy="${cy - 4}" rx="${w / 5}" ry="5" fill="#8ff2e0" opacity=".8"/>`).join('')}
            <g>
              <ellipse cx="190" cy="278" rx="13" ry="10" fill="#f4fafd"/>
              <circle cx="190" cy="262" r="9" fill="#f4fafd"/>
              <circle cx="187" cy="261" r="1.6" fill="#1c3348"/><circle cx="193" cy="261" r="1.6" fill="#1c3348"/>
              <path d="M186 266 q4 3 8 0" stroke="#1c3348" stroke-width="1.6" fill="none"/>
              <rect x="180" y="248" width="20" height="7" rx="3.4" fill="#e0447a"/>
            </g>
            <g>
              <ellipse cx="252" cy="282" rx="12" ry="9" fill="#e8e0d4"/>
              <circle cx="252" cy="268" r="8" fill="#e8e0d4"/>
              <path d="M247 266 q2 -3 4 0 M253 266 q2 -3 4 0" stroke="#1c3348" stroke-width="1.4" fill="none"/>
              <path d="M249 272 q3 2 6 0" stroke="#1c3348" stroke-width="1.4" fill="none"/>
            </g>
            <g>
              <ellipse cx="540" cy="284" rx="14" ry="11" fill="#f4fafd"/>
              <circle cx="540" cy="266" r="10" fill="#f4fafd"/>
              <circle cx="536" cy="265" r="1.7" fill="#1c3348"/><circle cx="544" cy="265" r="1.7" fill="#1c3348"/>
              <ellipse cx="540" cy="271" rx="3" ry="2" fill="#ff9ab8"/>
              <rect x="528" y="252" width="24" height="8" rx="4" fill="#3a8fd9"/>
            </g>
            ${stoneLantern(680, 300, 1.6, '#8a7a94', '#ffd98a')}
          `)}
          ${steam(10)}
          ${snowfall(12)}
        `,
      },
      {
        id: 'icebar', name: 'The Ice Bar', cls: 'yeti-icebar',
        scene: () => `
          ${L(100, 1, `
            ${Array.from({ length: 5 }, (_, row) => Array.from({ length: 9 }, (_, col) => `<rect x="${col * 92 + (row % 2 ? 46 : 0) - 46}" y="${row * 66}" width="88" height="62" rx="6" fill="#4ab8dc" opacity="${(0.16 + (row % 3) * 0.07).toFixed(2)}" stroke="#8fe0f4" stroke-width="2"/>`).join('')).join('')}
          `)}
          ${L(52, 2, `
            <rect x="120" y="200" width="560" height="34" rx="10" fill="#8fe0f4" opacity=".9"/>
            <rect x="140" y="234" width="520" height="86" rx="8" fill="#5cc8e8" opacity=".75"/>
            ${[[200, 172, '#e0447a'], [280, 166, '#ffd24a'], [360, 174, '#2fb56b'], [520, 168, '#8f6fdc'], [600, 174, '#ff8a5c']].map(([x, y, c]) => `
              <path d="M${x} ${y} l0 -26 q0 -6 6 -6 q6 0 6 6 l0 26 Z" fill="${c}" opacity=".9"/>
              <rect x="${Number(x) - 2}" y="${Number(y) - 44}" width="16" height="14" rx="3" fill="${c}" opacity=".9"/>`).join('')}
            <g>
              <ellipse cx="430" cy="196" rx="17" ry="13" fill="#f4fafd"/>
              <circle cx="430" cy="172" r="11" fill="#f4fafd"/>
              <circle cx="426" cy="171" r="1.8" fill="#1c3348"/><circle cx="434" cy="171" r="1.8" fill="#1c3348"/>
              <path d="M426 177 q4 3 8 0" stroke="#1c3348" stroke-width="1.6" fill="none"/>
              <path d="M414 190 q-10 -4 -12 -14" stroke="#f4fafd" stroke-width="5" stroke-linecap="round" fill="none">
                <animateTransform attributeName="transform" type="rotate" values="-8 414 190;10 414 190;-8 414 190" dur="0.8s" repeatCount="indefinite"/>
              </path>
              <rect x="396" y="158" width="12" height="16" rx="3" fill="#c8ecf8" transform="rotate(-16 402 166)"/>
            </g>
            <g transform="translate(560 190)">
              <path d="M0 0 L18 0 L9 14 Z" fill="#ff9ab8"/><line x1="9" y1="14" x2="9" y2="22" stroke="#e8f0f6" stroke-width="2"/>
              <path d="M2 -4 a8 8 0 0 1 14 0 Z" fill="#ffd24a"/><line x1="9" y1="-4" x2="14" y2="-12" stroke="#c2822c" stroke-width="1.6"/>
            </g>
            <rect x="330" y="120" width="140" height="40" rx="10" fill="none" stroke="#ff4f9e" stroke-width="4"/>
            <text x="400" y="147" text-anchor="middle" font-family="monospace" font-size="22" fill="#ff4f9e">ICE BAR<animate attributeName="opacity" values="1;1;.3;1;1" keyTimes="0;.9;.93;.96;1" dur="5s" repeatCount="indefinite"/></text>
          `)}
          ${sprinkle(8, 'discodot', (i) => `left:${r(6, 92)}%;top:${r(8, 40)}%;--d:${r(1.6, 3.4)}s;--c:${['#ff4f9e', '#3adcc8', '#ffd24a'][i % 3]}`)}
          ${snowfall(8)}
        `,
      },
      {
        id: 'groomer', name: 'The Midnight Groomer', cls: 'yeti-groomer',
        scene: () => `
          ${stars(24, [0, 46])}
          ${H('right:12%;top:6%;width:70px', 70, 70, `<circle cx="35" cy="35" r="30" fill="#f4f0dc"/><circle cx="26" cy="28" r="6" fill="#d8d2b4" opacity=".8"/><circle cx="46" cy="44" r="7" fill="#d8d2b4" opacity=".7"/>`, 'moonglow')}
          ${L(60, 1, `
            <path d="M0 320 L0 140 L800 260 L800 320 Z" fill="#c8d8ec"/>
            ${Array.from({ length: 7 }, (_, i) => `<path d="M0 ${170 + i * 22} L800 ${282 + i * 8}" stroke="#a8bcd8" stroke-width="7"/>`).join('')}
            ${pines(260, 320, 5, '#1c2a4c', 60, 120, 1, '#c8d8ec')}
          `)}
          <span class="sp snowcat" style="--dur:34s;animation-delay:-${r(0, 30)}s">
            <svg viewBox="0 0 110 60">
              <path d="M84 34 L110 22 L110 46 L84 46 Z" fill="#ffe9b3" opacity=".55"/>
              <rect x="12" y="26" width="56" height="20" rx="5" fill="#e0447a"/>
              <rect x="40" y="8" width="26" height="22" rx="4" fill="#c23b52"/>
              <rect x="46" y="12" width="16" height="12" rx="2" fill="#ffe9b3"><animate attributeName="opacity" values="1;.7;1" dur="2.4s" repeatCount="indefinite"/></rect>
              <circle cx="78" cy="30" r="5" fill="#ffd24a"><animate attributeName="opacity" values="1;.5;1" dur="1.2s" repeatCount="indefinite"/></circle>
              <path d="M6 46 Q6 56 18 56 L66 56 Q78 56 78 46 Q78 38 66 40 L18 40 Q6 38 6 46 Z" fill="#241640"/>
              ${[16, 30, 44, 58].map((x) => `<circle cx="${x}" cy="48" r="4.4" fill="#4a3a6c"/>`).join('')}
              <path d="M2 34 l10 -10 M2 34 l10 10" stroke="#c23b52" stroke-width="4" stroke-linecap="round"/>
            </svg>
          </span>
          ${snowfall(14)}
        `,
      },
      {
        id: 'aurora', name: 'The Aurora Bowl', cls: 'yeti-aurora',
        scene: () => `
          <div class="fx aurora"></div>
          <div class="fx aurora a2"></div>
          ${stars(26, [0, 55])}
          ${L(44, 1, `
            <path d="M0 320 L0 210 L170 120 L340 230 L520 110 L690 220 L800 160 L800 320 Z" fill="#dceef8"/>
            <path d="M170 120 L143 152 L170 148 L199 154 Z M520 110 L490 146 L520 140 L552 148 Z" fill="#8aa8cc"/>
          `)}
          ${L(26, 2, `
            <path d="M0 320 L800 320 L800 292 Q400 278 0 294 Z" fill="#b8d0e8"/>
            ${[[180, 288], [400, 296], [620, 290]].map(([x, y], i) => `
              <g>
                <path d="M${x - 24} ${y} L${x} ${y - 34} L${x + 24} ${y} Z" fill="${['#e0447a', '#ffd24a', '#3adcc8'][i]}"/>
                <path d="M${x - 8} ${y} L${x} ${y - 14} L${x + 8} ${y} Z" fill="#ffe9b3"><animate attributeName="opacity" values="1;.55;1" dur="${r(2.4, 4)}s" repeatCount="indefinite"/></path>
              </g>`).join('')}
            <g transform="translate(300 268)">
              <ellipse cx="0" cy="14" rx="10" ry="8" fill="#f4fafd"/>
              <circle cx="0" cy="0" r="7" fill="#f4fafd"/>
              <circle cx="-2.4" cy="-1" r="1.3" fill="#1c3348"/><circle cx="2.4" cy="-1" r="1.3" fill="#1c3348"/>
              <path d="M8 8 l16 -12" stroke="#8a6a3a" stroke-width="3"/>
              <path d="M22 -6 l8 -4" stroke="#8a6a3a" stroke-width="3"/>
            </g>
          `)}
          <span class="sp shootstar" style="left:${r(10, 60)}%;top:${r(4, 18)}%"></span>
          ${snowfall(8)}
        `,
      },
      {
        id: 'village', name: 'The Yeti Village', cls: 'yeti-village',
        scene: () => `
          ${stars(16, [0, 30])}
          ${L(56, 1, `
            ${ridge(800, 320, 120, 40, '#5c4a8c', .6)}
            ${pines(800, 320, 12, '#3a2c64', 60, 130, .9, '#c8b8e8')}
          `)}
          ${L(46, 2, `
            <path d="M0 320 L800 320 L800 286 Q400 270 0 288 Z" fill="#e8eef8"/>
            ${[[140, 0.9], [320, 1.2], [540, 1.0], [700, 0.8]].map(([x, s]) => `
              <g>
                <path d="M${x - 60 * s} 296 L${x} ${296 - 100 * s} L${x + 60 * s} 296 Z" fill="#6a3a2c"/>
                <path d="M${x - 66 * s} ${296 - 6 * s} L${x} ${296 - 108 * s} L${x + 66 * s} ${296 - 6 * s} l-8 ${-10 * s} L${x} ${296 - 124 * s} L${x - 58 * s} ${296 - 16 * s} Z" fill="#f4fafd"/>
                <rect x="${x - 12 * s}" y="${296 - 44 * s}" width="${24 * s}" height="${44 * s}" rx="3" fill="#4a2416"/>
                <rect x="${x - 30 * s}" y="${296 - 64 * s}" width="${18 * s}" height="${16 * s}" rx="2" fill="#ffd98a"><animate attributeName="opacity" values="1;.6;1" dur="${r(2.6, 4.6)}s" repeatCount="indefinite"/></rect>
                <rect x="${x + 12 * s}" y="${296 - 64 * s}" width="${18 * s}" height="${16 * s}" rx="2" fill="#ffb84d"><animate attributeName="opacity" values=".7;1;.7" dur="${r(2.6, 4.6)}s" repeatCount="indefinite"/></rect>
              </g>`).join('')}
            <path d="M170 160 Q400 210 620 158" stroke="#3a2c64" stroke-width="3" fill="none"/>
            ${[210, 280, 350, 420, 490, 560].map((x, i) => `<circle cx="${x}" cy="${182 + Math.sin(i * 1.2) * 10}" r="5" fill="${['#ffd24a', '#ff5d7a', '#3adcc8', '#8f6fdc'][i % 4]}"><animate attributeName="opacity" values="1;.4;1" dur="${r(1.6, 3)}s" repeatCount="indefinite"/></circle>`).join('')}
            <g transform="translate(430 300)">
              <ellipse cx="0" cy="0" rx="9" ry="7" fill="#f4fafd"/><circle cx="0" cy="-11" r="6" fill="#f4fafd"/>
              <circle cx="-2" cy="-12" r="1.2" fill="#1c3348"/><circle cx="2" cy="-12" r="1.2" fill="#1c3348"/>
              <rect x="-22" y="-4" width="16" height="8" rx="3" fill="#c23b52"/><path d="M-6 0 l-8 0" stroke="#8a6a3a" stroke-width="2"/>
            </g>
            ${sprinkle(0, 'x', () => '')}
          `)}
          ${steam(4)}
          ${snowfall(16)}
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

// ——— world pool: no repeats until a universe is exhausted, and a fresh
// shuffle never opens with the world you just left ———

const POOL_KEY = 'p3.worldPools';

function readPools() {
  try {
    const p = JSON.parse(localStorage.getItem(POOL_KEY));
    return p && typeof p === 'object' && !Array.isArray(p) ? p : {};
  } catch { return {}; }
}

export function pickWorld(sessionType) {
  const U = UNIVERSES[sessionType];
  if (!U) return null;
  const ids = U.worlds.map((w) => w.id);
  const pools = readPools();
  let entry = pools[sessionType];
  if (Array.isArray(entry)) entry = { pool: entry, last: null }; // pre-v16 shape
  if (!entry || typeof entry !== 'object' || !Array.isArray(entry.pool)) entry = { pool: [], last: null };
  entry.pool = entry.pool.filter((id) => ids.includes(id));
  if (!entry.pool.length) {
    entry.pool = [...ids].sort(() => Math.random() - 0.5);
    if (entry.pool.length > 1 && entry.pool[0] === entry.last) entry.pool.push(entry.pool.shift());
  }
  const id = entry.pool.shift();
  entry.last = id;
  pools[sessionType] = entry;
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
