// THE UNIVERSES. Each session type is a universe; every visit lands in a
// different WORLD inside it — 8 per universe, drawn from a shuffled pool with
// no repeats until the pool is exhausted (and never the same world twice in a
// row across a reshuffle). Every scene is a layered illustration composed for
// the phone's visible band (x 240–560 of the 800-unit canvas). Painted in
// styles.css.
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

// soft overlapping ridge silhouette (twin rounded peaks, no harsh chevrons)
function ridge(vw, vh, ytop, amp, fill, op = 1) {
  const y1 = ytop + r(-amp * 0.2, amp * 0.2);
  return `<path d="M0 ${vh} L0 ${y1 + amp} Q${vw * 0.14} ${y1 + amp * 0.2} ${vw * 0.26} ${y1 + amp * 0.55} Q${vw * 0.36} ${y1 - amp * 0.4} ${vw * 0.5} ${y1} Q${vw * 0.62} ${y1 + amp * 0.5} ${vw * 0.72} ${y1 + amp * 0.15} Q${vw * 0.86} ${y1 - amp * 0.3} ${vw} ${y1 + amp * 0.5} L${vw} ${vh} Z" fill="${fill}" opacity="${op}"/>`;
}

// a forest row of three-tier pines, biased toward the visible center band
function pines(vw, vh, n, tone, h1, h2, op = 1, snow = null) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = i % 2 ? r(200, 600) : r(10, vw - 10), h = r(h1, h2), w = h * 0.58, y = vh;
    s += `<path d="M${x} ${y - h} L${x - w * 0.30} ${y - h * 0.58} L${x - w * 0.16} ${y - h * 0.58} L${x - w * 0.42} ${y - h * 0.26} L${x - w * 0.24} ${y - h * 0.26} L${x - w * 0.52} ${y} L${x + w * 0.52} ${y} L${x + w * 0.24} ${y - h * 0.26} L${x + w * 0.42} ${y - h * 0.26} L${x + w * 0.16} ${y - h * 0.58} L${x + w * 0.30} ${y - h * 0.58} Z" fill="${tone}" opacity="${op}"/>`;
    if (snow) s += `<path d="M${x} ${y - h} L${x - w * 0.18} ${y - h * 0.72} L${x + w * 0.18} ${y - h * 0.72} Z" fill="${snow}" opacity="${op}"/>`;
  }
  return s;
}

function bamboo(x, vh, h, w, tone, leaf) {
  let s = `<rect x="${x - w / 2}" y="${vh - h}" width="${w}" height="${h}" rx="${w / 2}" fill="${tone}"/>`;
  for (let y = vh - h + r(14, 24); y < vh - 8; y += r(26, 40)) {
    s += `<rect x="${x - w / 2 - 1}" y="${y}" width="${w + 2}" height="2.4" rx="1" fill="${leaf}" opacity=".8"/>`;
    if (Math.random() > 0.4) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      s += `<path d="M${x + dir * w / 2} ${y} q ${dir * 14} -4 ${dir * 28} -15 q ${dir * -8} 13 ${dir * -26} 17 z" fill="${leaf}" opacity=".9"/>`;
    }
  }
  return s;
}

// a proper multi-roof pagoda with upturned eaves and a lit doorway
function pagoda(x, y, s, body, roof, glow = null) {
  const tier = (ty, w, rh) => `
    <path d="M${x - w} ${ty} Q${x - w * 0.5} ${ty - rh * 0.34} ${x} ${ty - rh * 0.4} Q${x + w * 0.5} ${ty - rh * 0.34} ${x + w} ${ty} L${x + w * 0.9} ${ty + rh * 0.26} Q${x} ${ty - rh * 0.06} ${x - w * 0.9} ${ty + rh * 0.26} Z" fill="${roof}"/>
    <path d="M${x - w} ${ty} q-${6 * s} -${3 * s} -${8 * s} -${9 * s} M${x + w} ${ty} q${6 * s} -${3 * s} ${8 * s} -${9 * s}" stroke="${roof}" stroke-width="${3 * s}" fill="none" stroke-linecap="round"/>`;
  return `
    <rect x="${x - 36 * s}" y="${y - 30 * s}" width="${72 * s}" height="${30 * s}" fill="${body}"/>
    ${glow ? `<rect x="${x - 11 * s}" y="${y - 24 * s}" width="${22 * s}" height="${18 * s}" rx="${3 * s}" fill="${glow}"><animate attributeName="opacity" values="1;.55;1" dur="3.4s" repeatCount="indefinite"/></rect>` : ''}
    ${tier(y - 30 * s, 50 * s, 28 * s)}
    <rect x="${x - 28 * s}" y="${y - 66 * s}" width="${56 * s}" height="${22 * s}" fill="${body}"/>
    ${glow ? `<rect x="${x - 8 * s}" y="${y - 62 * s}" width="${16 * s}" height="${12 * s}" rx="${2 * s}" fill="${glow}" opacity=".8"/>` : ''}
    ${tier(y - 66 * s, 41 * s, 26 * s)}
    <rect x="${x - 20 * s}" y="${y - 98 * s}" width="${40 * s}" height="${20 * s}" fill="${body}"/>
    ${tier(y - 98 * s, 32 * s, 24 * s)}
    <path d="M${x} ${y - 126 * s} l${5.5 * s} ${13 * s} h${-11 * s} Z" fill="${roof}"/>
    <line x1="${x}" y1="${y - 136 * s}" x2="${x}" y2="${y - 118 * s}" stroke="${roof}" stroke-width="${2.6 * s}"/>
    <circle cx="${x}" cy="${y - 136 * s}" r="${3 * s}" fill="${roof}"/>`;
}

// a torii gate with curved lintel; s scales, centered on x
function torii(x, y, s, tone) {
  return `
    <path d="M${x - 50 * s} ${y - 84 * s} Q${x} ${y - 98 * s} ${x + 50 * s} ${y - 84 * s} l${5 * s} ${9 * s} Q${x} ${y - 89 * s} ${x - 55 * s} ${y - 75 * s} Z" fill="${tone}"/>
    <rect x="${x - 40 * s}" y="${y - 66 * s}" width="${80 * s}" height="${7 * s}" fill="${tone}"/>
    <rect x="${x - 3.5 * s}" y="${y - 84 * s}" width="${7 * s}" height="${18 * s}" fill="${tone}"/>
    <rect x="${x - 32 * s}" y="${y - 75 * s}" width="${8 * s}" height="${75 * s}" fill="${tone}" transform="rotate(-2 ${x - 28 * s} ${y})"/>
    <rect x="${x + 24 * s}" y="${y - 75 * s}" width="${8 * s}" height="${75 * s}" fill="${tone}" transform="rotate(2 ${x + 28 * s} ${y})"/>`;
}

function stoneLantern(x, y, s, tone, glow) {
  return `
    <rect x="${x - 5 * s}" y="${y - 20 * s}" width="${10 * s}" height="${20 * s}" fill="${tone}"/>
    <rect x="${x - 12 * s}" y="${y - 26 * s}" width="${24 * s}" height="${6 * s}" rx="${2 * s}" fill="${tone}"/>
    <rect x="${x - 8 * s}" y="${y - 40 * s}" width="${16 * s}" height="${14 * s}" fill="${tone}"/>
    <rect x="${x - 5 * s}" y="${y - 37 * s}" width="${10 * s}" height="${8 * s}" fill="${glow}"><animate attributeName="opacity" values="1;.5;1" dur="${r(2.2, 3.6)}s" repeatCount="indefinite"/></rect>
    <path d="M${x - 14 * s} ${y - 40 * s} Q${x} ${y - 50 * s} ${x + 14 * s} ${y - 40 * s} Z" fill="${tone}"/>`;
}

function windows(x, y, cols, rows, w, h, gap, lit, dim) {
  let s = '';
  for (let c = 0; c < cols; c++) for (let rw = 0; rw < rows; rw++) {
    const on = Math.random() > 0.35;
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

// puffy drifting clouds (day worlds)
const clouds = (n, tint = 'rgba(255,255,255,.85)', top = [4, 30]) => Array.from({ length: n }, () => {
  const w = r(70, 130);
  return `<span class="sp cloud" style="top:${r(top[0], top[1])}%;--dur:${r(50, 90)}s;animation-delay:-${r(0, 80)}s;width:${w}px">
    <svg viewBox="0 0 100 40" fill="${tint}"><ellipse cx="30" cy="28" rx="26" ry="12"/><ellipse cx="55" cy="20" rx="22" ry="14"/><ellipse cx="76" cy="29" rx="20" ry="10"/></svg>
  </span>`;
}).join('');

const butterflies = (n, colors) => Array.from({ length: n }, (_, i) =>
  `<span class="sp butterfly" style="left:${r(8, 88)}%;top:${r(24, 66)}%;--d:${r(2.4, 4.5)}s;animation-delay:-${r(0, 4)}s">
    <svg viewBox="0 0 20 16"><g><path d="M10 8 Q2 0 1 6 Q1 12 10 8" fill="${colors[i % colors.length]}"><animateTransform attributeName="transform" type="scale" values="1 1;.6 1;1 1" dur=".5s" repeatCount="indefinite"/></path><path d="M10 8 Q18 0 19 6 Q19 12 10 8" fill="${colors[i % colors.length]}"><animateTransform attributeName="transform" type="scale" values="1 1;.6 1;1 1" dur=".5s" repeatCount="indefinite"/></path><line x1="10" y1="5" x2="10" y2="12" stroke="#2a1a10" stroke-width="1.6"/></g></svg>
  </span>`).join('');

// Mario rule: the sky is inhabited. Stars with faces, bobbing in the air.
const starfaces = (n, top = [6, 40]) => Array.from({ length: n }, () =>
  `<span class="sp starface" style="left:${r(8, 84)}%;top:${r(top[0], top[1])}%;--d:${r(3, 6)}s;animation-delay:-${r(0, 5)}s;width:${r(20, 36)}px">
    <svg viewBox="0 0 30 30"><path d="M15 1 L18.7 10.4 L28.5 11 L20.9 17.4 L23.4 27 L15 21.6 L6.6 27 L9.1 17.4 L1.5 11 L11.3 10.4 Z" fill="#ffd24a" stroke="#c2822c" stroke-width="1.4"/><circle cx="12" cy="13.4" r="1.5" fill="#2a1a08"/><circle cx="18" cy="13.4" r="1.5" fill="#2a1a08"/><path d="M12.6 17 q2.4 1.8 4.8 0" stroke="#2a1a08" stroke-width="1.2" fill="none"/></svg>
  </span>`).join('');

const lanterns = (n) => Array.from({ length: n }, (_, i) =>
  `<span class="sp lantern" style="left:${6 + i * (88 / Math.max(1, n - 1))}%;top:${r(4, 12)}%;--d:${r(3, 6)}s;--c:${['#ff5d5d', '#ffb84d', '#ff8a5c'][i % 3]}">
    <svg viewBox="0 0 20 30"><rect x="7" y="0" width="6" height="3" fill="#5a3218"/><ellipse cx="10" cy="13" rx="8" ry="10" fill="var(--c,#ff5d5d)"/><path d="M2 10h16M2 13h16M2 16h16" stroke="#7a1f12" stroke-width=".8" opacity=".7"/><rect x="7" y="23" width="6" height="3.4" fill="#5a3218"/><path d="M10 26.4v2.6" stroke="#e8b84d" stroke-width="2"/><ellipse cx="10" cy="13" rx="4" ry="7" fill="#ffe9b3" opacity=".55"><animate attributeName="opacity" values=".55;.25;.55" dur="${r(2, 4)}s" repeatCount="indefinite"/></ellipse></svg>
  </span>`).join('');

// ═══════════════ THE SIX UNIVERSES ═══════════════

export const UNIVERSES = {
  // ————— PUSH A — MOUNT VOLCANO DOJO —————
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
          ${clouds(3, 'rgba(255,200,180,.5)', [6, 22])}
          ${L(60, 1, `${ridge(800, 320, 140, 50, '#3a2a48', .55)}${ridge(800, 320, 200, 44, '#2c2038', .8)}`)}
          ${L(52, 2, `
            <path d="M180 320 L400 40 L620 320 Z" fill="#221830"/>
            <path d="M400 40 L354 108 L400 96 L448 110 Z" fill="#170f22"/>
            ${pagoda(400, 96, 0.85, '#120c1c', '#c23b22', '#ffb84d')}
            ${[[400, 130, 10], [372, 168, 12], [416, 206, 13], [378, 244, 14], [408, 282, 15], [386, 316, 16]].map(([sx, sy, sw]) => `
              <rect x="${sx - sw * 2.4}" y="${sy}" width="${sw * 4.8}" height="5.5" rx="2.5" fill="#d9b88a" opacity=".8"/>`).join('')}
            <path d="M400 130 Q368 150 372 168 Q400 190 416 206 Q382 226 378 244 Q404 264 408 282 Q390 300 386 316" stroke="#d9b88a" stroke-width="3" fill="none" opacity=".35"/>
            ${[[352, 176], [438, 214], [356, 252], [432, 290]].map(([lx, ly]) => `
              <circle cx="${lx}" cy="${ly}" r="5" fill="#ffb84d"><animate attributeName="opacity" values="1;.4;1" dur="${r(2, 3.6)}s" repeatCount="indefinite"/></circle>
              <rect x="${lx - 1.5}" y="${ly + 4}" width="3" height="9" fill="#2a1a28"/>`).join('')}
            ${torii(400, 320, 0.9, '#b3361e')}
          `)}
          ${L(20, 3, pines(800, 320, 16, '#0c0814', 60, 130))}
          <div class="fx bigsun" style="right:7%;top:4%;--c1:#e8543a;--c2:#b32e18;--s:92px"></div>
          ${petals(22, ['#e8a0b4', '#f2c4d0', '#d97a94'])}
          ${sprinkle(4, 'brushbird', () => `left:${r(10, 80)}%;top:${r(6, 20)}%;--d:${r(4, 7)}s`)}
          <div class="fx mist" style="bottom:14%;height:12%"></div>
        `,
      },
      {
        id: 'waterfall', name: 'The Waterfall of Discipline', cls: 'dojo-falls',
        scene: () => `
          ${L(78, 1, `
            <path d="M0 320 L0 20 Q90 40 130 110 Q166 180 150 320 Z" fill="#10202e"/>
            <path d="M800 320 L800 10 Q700 34 664 110 Q634 186 660 320 Z" fill="#10202e"/>
            <path d="M40 70 Q90 86 120 130 M760 60 Q700 80 668 128" stroke="#1c3448" stroke-width="9" fill="none"/>
            ${pines(180, 320, 4, '#0a1620', 60, 100)}${pines(160, 320, 3, '#0a1620', 60, 100).replaceAll('M', 'M')}
          `)}
          ${L(74, 2, `
            <rect x="356" y="0" width="88" height="240" fill="#8fc8e8" opacity=".35"/>
            <rect x="368" y="0" width="16" height="240" fill="#eef8ff" opacity=".85"><animate attributeName="x" values="368;398;368" dur="2.2s" repeatCount="indefinite"/></rect>
            <rect x="404" y="0" width="10" height="240" fill="#dff2ff" opacity=".65"><animate attributeName="x" values="404;376;404" dur="3s" repeatCount="indefinite"/></rect>
            <rect x="386" y="0" width="7" height="240" fill="#ffffff" opacity=".8"><animate attributeName="x" values="386;420;386" dur="1.7s" repeatCount="indefinite"/></rect>
            <path d="M320 100 A 130 130 0 0 1 500 90" fill="none" stroke="url(#rb)" stroke-width="9" opacity=".55"/>
            <defs><linearGradient id="rb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff6a6a"/><stop offset=".3" stop-color="#ffd24a"/><stop offset=".6" stop-color="#59c9a5"/><stop offset="1" stop-color="#8f6fdc"/></linearGradient></defs>
            <ellipse cx="400" cy="244" rx="96" ry="16" fill="#bfe6f8" opacity=".55"><animate attributeName="rx" values="96;112;96" dur="2s" repeatCount="indefinite"/></ellipse>
            <ellipse cx="400" cy="244" rx="46" ry="9" fill="#ffffff" opacity=".7"><animate attributeName="rx" values="46;70;46" dur="1.4s" repeatCount="indefinite"/></ellipse>
            <path d="M0 262 Q200 248 400 256 T800 252 L800 320 L0 320 Z" fill="#0c2434"/>
            <path d="M120 282 q34 -8 70 0 M330 292 q40 -9 84 0 M560 284 q38 -8 76 0" stroke="#24506a" stroke-width="4" fill="none"/>
            <ellipse cx="290" cy="300" rx="30" ry="7" fill="#e8843c"/><path d="M262 300 l-12 -6 v12 Z" fill="#e8843c"/><circle cx="306" cy="298" r="2" fill="#0c2434"/>
            <ellipse cx="500" cy="308" rx="24" ry="6" fill="#e05a5a"/><path d="M478 308 l-11 -5 v10 Z" fill="#e05a5a"/>
          `)}
          ${H('left:8%;bottom:9%;width:130px', 160, 80, `
            <rect x="0" y="34" width="160" height="10" rx="4" fill="#5a3a22"/>
            <path d="M0 40 Q80 8 160 40" fill="none" stroke="#7a5230" stroke-width="9"/>
            <rect x="16" y="20" width="7" height="28" fill="#5a3a22"/><rect x="76" y="10" width="7" height="34" fill="#5a3a22"/><rect x="136" y="20" width="7" height="28" fill="#5a3a22"/>
          `)}
          ${bubbles(10)}
          ${petals(10, ['#e8a0b4', '#f2c4d0'])}
          ${sprinkle(6, 'spray', () => `left:${r(38, 60)}%;top:${r(52, 62)}%;--d:${r(1, 2)}s;--s:${r(8, 18)}px;animation-delay:-${r(0, 2)}s`)}
          <div class="fx mist" style="bottom:20%;height:16%"></div>
        `,
      },
      {
        id: 'summit', name: 'The Lava-Forge Summit', cls: 'dojo-summit',
        scene: () => `
          <div class="fx bigsun" style="left:50%;margin-left:-85px;top:3%;--c1:#ff7a4c;--c2:#8a1c0e;--s:170px"></div>
          ${L(58, 1, `
            ${[90, 260, 470, 660].map((x) => `<ellipse cx="${x}" cy="${r(160, 190)}" rx="${r(70, 110)}" ry="${r(20, 30)}" fill="#4a1830" opacity=".8"/>`).join('')}
            <path d="M120 320 Q240 210 330 196 L400 130 L470 198 Q580 216 690 320 Z" fill="#240a0e"/>
            <path d="M386 148 L400 130 L416 150 L406 166 Z" fill="#ff7a2c"><animate attributeName="opacity" values="1;.55;1" dur="1.6s" repeatCount="indefinite"/></path>
            <path d="M400 166 q-8 44 4 78 q10 30 0 76" stroke="#ff6a2c" stroke-width="7" fill="none"><animate attributeName="opacity" values="1;.6;1" dur="2.2s" repeatCount="indefinite"/></path>
            <path d="M362 220 q12 34 2 100 M444 226 q-10 40 4 94" stroke="#ffb84d" stroke-width="4" fill="none" opacity=".8"><animate attributeName="opacity" values=".8;.35;.8" dur="2.8s" repeatCount="indefinite"/></path>
            ${torii(316, 232, 0.62, '#120508')}
            ${stoneLantern(486, 238, 1.1, '#120508', '#ffb84d')}
          `)}
          ${L(30, 2, `
            <rect x="260" y="210" width="120" height="110" fill="#140608"/>
            <path d="M244 216 L320 164 L396 216 Z" fill="#0c0305"/>
            <rect x="296" y="252" width="48" height="68" fill="#ff8a3c"><animate attributeName="opacity" values="1;.55;1" dur="2s" repeatCount="indefinite"/></rect>
            <path d="M308 252 h24 v-14 a12 12 0 0 0 -24 0 Z" fill="#140608"/>
            <rect x="420" y="266" width="100" height="13" rx="6" fill="#1c0a10"/>
            <rect x="434" y="230" width="15" height="38" fill="#1c0a10"/>
            <path d="M476 240 l34 -11 v22 Z" fill="#1c0a10"/>
          `)}
          ${embers(24)}
          ${sprinkle(5, 'brushsmoke', () => `left:${r(20, 76)}%;--s:${r(30, 60)}px;--dur:${r(12, 18)}s;animation-delay:-${r(0, 16)}s;--sway:${r(-30, 30)}px`)}
        `,
      },
      {
        id: 'bamboo', name: 'The Bamboo Grove', cls: 'dojo-bamboo',
        scene: () => `
          ${L(96, 1, `
            ${[60, 150, 250, 340, 440, 540, 640, 740].map((x) => bamboo(x + r(-20, 20), 320, r(250, 316), r(8, 12), '#2c4a2c', '#476b3c')).join('')}
          `)}
          ${L(90, 2, `
            ${[100, 210, 320, 410, 500, 610, 720].map((x) => bamboo(x + r(-18, 18), 320, r(275, 318), r(13, 19), '#1c3420', '#2f5230')).join('')}
          `)}
          ${L(24, 3, `
            <ellipse cx="400" cy="330" rx="430" ry="42" fill="#101c10"/>
            ${stoneLantern(310, 306, 1.7, '#141c12', '#ffe9b3')}
            <path d="M472 306 q18 -34 58 -32 q-12 26 -58 32 Z" fill="#182a16"/>
            <ellipse cx="452" cy="308" rx="26" ry="6" fill="#0c140c"/>
          `)}
          <div class="fx godray" style="left:26%;--d:6s"></div>
          <div class="fx godray" style="left:48%;--d:8s;animation-delay:-3s"></div>
          <div class="fx godray" style="left:66%;--d:7s;animation-delay:-5s"></div>
          ${petals(20, ['#9fd48a', '#7ab868', '#c8e8a8'])}
          ${fireflies(9)}
          ${butterflies(3, ['#ffd24a', '#e8a0b4'])}
        `,
      },
      {
        id: 'torii', name: 'The Ten Thousand Torii', cls: 'dojo-torii',
        scene: () => `
          ${stars(14, [0, 24])}
          ${L(84, 1, `
            ${ridge(800, 320, 210, 30, '#241028', .7)}
            ${torii(400, 268, 0.42, '#6a2016')}
            ${torii(400, 280, 0.62, '#8a2818')}
            ${torii(400, 296, 0.9, '#a3301c')}
            ${torii(400, 316, 1.3, '#c23b22')}
          `)}
          ${L(94, 2, `
            ${torii(400, 396, 2.3, '#e0492a')}
            <path d="M340 320 Q400 314 460 320 L470 396 L330 396 Z" fill="#2a1626"/>
            <path d="M352 340 h96 M348 362 h104" stroke="#1a0d18" stroke-width="4" opacity=".6"/>
          `)}
          ${L(26, 3, `
            <path d="M150 292 q12 -30 30 -34 q4 18 -8 36 q18 -10 26 2 q-20 16 -48 -4 Z" fill="#140a14"/>
            <ellipse cx="168" cy="298" rx="26" ry="5" fill="#0e060e"/>
            <path d="M650 292 q-12 -30 -30 -34 q-4 18 8 36 q-18 -10 -26 2 q20 16 48 -4 Z" fill="#140a14"/>
            <ellipse cx="632" cy="298" rx="26" ry="5" fill="#0e060e"/>
            <circle cx="160" cy="268" r="3.4" fill="#7ab8ff"><animate attributeName="opacity" values="1;.3;1" dur="2.4s" repeatCount="indefinite"/></circle>
            <circle cx="642" cy="268" r="3.4" fill="#7ab8ff"><animate attributeName="opacity" values=".3;1;.3" dur="2.4s" repeatCount="indefinite"/></circle>
          `)}
          ${wisps(9, ['#7ab8ff', '#9fd4ff', '#c8e8ff'])}
          ${petals(10, ['#e8a0b4', '#d97a94'])}
        `,
      },
      {
        id: 'snowtemple', name: 'The Snowbound Temple', cls: 'dojo-snow',
        scene: () => `
          ${H('right:9%;top:4%;width:100px', 100, 100, `<circle cx="50" cy="50" r="42" fill="#f4f0dc"/><circle cx="36" cy="40" r="8" fill="#d8d2b4" opacity=".8"/><circle cx="62" cy="60" r="10" fill="#d8d2b4" opacity=".7"/>`, 'moonglow')}
          ${L(62, 1, `${ridge(800, 320, 130, 46, '#26304a', .6)}${pines(800, 320, 12, '#141c2e', 70, 140, 1, '#e8f0f8')}`)}
          ${L(54, 2, `
            ${pagoda(400, 296, 1.35, '#0e1420', '#8a2418', '#ffd9a3')}
            <path d="M316 258 Q400 240 484 258 M330 172 Q400 156 470 172 M342 96 Q400 84 458 96" stroke="#eef4fa" stroke-width="9" fill="none" stroke-linecap="round"/>
            ${stoneLantern(272, 296, 1.5, '#141c2e', '#ffd9a3')}
            ${stoneLantern(528, 296, 1.5, '#141c2e', '#ffd9a3')}
            ${torii(400, 320, 0.5, '#7a2418')}
          `)}
          ${L(14, 3, `<path d="M0 320 L800 320 L800 276 Q560 262 400 272 Q200 282 0 268 Z" fill="#dfe8f2"/><path d="M240 294 q44 -9 96 0 M470 300 q52 -10 104 -2" stroke="#b8c8dc" stroke-width="3.4" fill="none"/>`)}
          ${snowfall(30)}
        `,
      },
      {
        id: 'hall', name: 'The Sparring Hall', cls: 'dojo-hall',
        scene: () => `
          ${L(100, 1, `
            <rect x="0" y="0" width="800" height="30" fill="#241208"/>
            <rect x="0" y="30" width="800" height="9" fill="#160a04"/>
            <rect x="236" y="0" width="14" height="320" fill="#1c0e06"/><rect x="550" y="0" width="14" height="320" fill="#1c0e06"/>
            <path d="M0 226 L800 226 L800 320 L0 320 Z" fill="#2c1810"/>
            <path d="M0 250 h800 M0 280 h800 M0 306 h800" stroke="#1c0e06" stroke-width="2.6"/>
            ${[120, 280, 440, 600].map((x) => `<path d="M${x} 320 L${x + 40} 226" stroke="#1c0e06" stroke-width="2.4"/>`).join('')}
          `)}
          ${L(88, 2, `
            <g transform="rotate(-1.5 300 110)"><rect x="268" y="46" width="64" height="150" fill="#e8d5ae"/><rect x="268" y="46" width="64" height="11" fill="#7a1f12"/><path d="M288 78 q13 9 0 24 q15 4 9 22 M314 74 q-11 13 2 26" stroke="#2b1c14" stroke-width="4.4" fill="none" stroke-linecap="round"/><rect x="292" y="196" width="16" height="8" fill="#8a5a2a"/></g>
            <g transform="rotate(1.5 500 110)"><rect x="468" y="52" width="64" height="140" fill="#e8d5ae"/><rect x="468" y="52" width="64" height="11" fill="#7a1f12"/><circle cx="500" cy="112" r="19" fill="none" stroke="#b3361e" stroke-width="5.5"/><path d="M490 150 q10 9 20 0" stroke="#2b1c14" stroke-width="4.4" fill="none"/><rect x="492" y="192" width="16" height="8" fill="#8a5a2a"/></g>
            <g>
              <ellipse cx="400" cy="252" rx="58" ry="12" fill="#40200c"/>
              <rect x="342" y="180" width="116" height="72" rx="10" fill="#a3301c"/>
              <path d="M342 196 h116 M342 236 h116" stroke="#7a1f12" stroke-width="5"/>
              <circle cx="400" cy="216" r="24" fill="#e8d5ae"/>
              <path d="M390 210 q10 -8 20 0 M390 224 q10 8 20 0" stroke="#7a1f12" stroke-width="3" fill="none"/>
              <circle cx="360" cy="188" r="6" fill="#e8b84d"/><circle cx="440" cy="188" r="6" fill="#e8b84d"/>
            </g>
            <rect x="330" y="88" width="140" height="11" rx="5" fill="#3a2010"/>
            <rect x="345" y="60" width="110" height="8" rx="4" fill="#5a3418"/>
            <circle cx="400" cy="34" r="19" fill="none" stroke="#c23b22" stroke-width="6"/>
          `)}
          ${sprinkle(7, 'candle', () => `left:${r(14, 84)}%;bottom:${r(8, 14)}%;top:auto;--d:${r(0.6, 1.6)}s`)}
          ${sprinkle(10, 'dust', () => `left:${r(0, 100)}%;--dur:${r(16, 30)}s;animation-delay:-${r(0, 30)}s`)}
        `,
      },
      {
        id: 'dragonspine', name: "The Dragon's Spine", cls: 'dojo-dragon',
        scene: () => `
          ${stars(18, [0, 40])}
          ${starfaces(2, [4, 24])}
          ${L(46, 1, `
            ${[120, 400, 690].map((x) => `<ellipse cx="${x}" cy="${r(270, 310)}" rx="${r(130, 190)}" ry="${r(40, 60)}" fill="#3a2a48" opacity=".55"/>`).join('')}
          `)}
          ${L(38, 2, `
            <path d="M0 320 L100 262 L180 300 L270 216 L360 288 L400 196 L448 288 L540 224 L620 300 L700 250 L800 320 Z" fill="#191126"/>
            ${[[270, 216], [400, 196], [540, 224]].map(([x, y]) => `<path d="M${x} ${y} l-11 -26 l11 8 l5 -17 l7 17 l11 -8 l-11 26 Z" fill="#10081c"/>`).join('')}
            <circle cx="400" cy="240" r="4" fill="#ffb84d"><animate attributeName="opacity" values="1;.4;1" dur="3s" repeatCount="indefinite"/></circle>
          `)}
          <span class="sp dragon" style="top:${r(8, 18)}%;--dur:52s;animation-delay:-${r(0, 45)}s">
            <svg viewBox="0 0 300 100">
              <path d="M10 55 Q45 18 90 40 Q135 64 180 40 Q225 18 262 42" fill="none" stroke="#3fae6b" stroke-width="22" stroke-linecap="round"/>
              <path d="M10 55 Q45 18 90 40 Q135 64 180 40 Q225 18 262 42" fill="none" stroke="#2c7a4c" stroke-width="22" stroke-linecap="round" stroke-dasharray="5 12"/>
              <path d="M10 55 Q45 18 90 40 Q135 64 180 40 Q225 18 262 42" fill="none" stroke="#ffd24a" stroke-width="7" stroke-linecap="round" stroke-dasharray="3 20" opacity=".8"/>
              ${[42, 82, 124, 166, 208].map((x, i) => `<path d="M${x} ${[32, 26, 48, 44, 24][i]} l6 -16 l8 14" stroke="#e05a5a" stroke-width="4.4" fill="none"/>`).join('')}
              <g>
                <path d="M252 38 q18 -18 40 -10 q11 6 8 19 q-3 16 -22 18 q-19 3 -30 -10 Z" fill="#3fae6b"/>
                <circle cx="282" cy="46" r="3.4" fill="#0c0814"/>
                <circle cx="283" cy="45" r="1.2" fill="#fff"/>
                <path d="M292 32 q10 -13 5 -23 M274 30 q0 -13 -10 -18" stroke="#e8b84d" stroke-width="3.4" fill="none"/>
                <path d="M298 52 q13 0 20 8 M296 58 q10 5 13 15" stroke="#3fae6b" stroke-width="3" fill="none">
                  <animateTransform attributeName="transform" type="rotate" values="-7 296 55;9 296 55;-7 296 55" dur="1.8s" repeatCount="indefinite"/>
                </path>
                <circle cx="299" cy="30" r="6" fill="#ffd24a"><animate attributeName="r" values="6;8;6" dur="1.6s" repeatCount="indefinite"/></circle>
              </g>
              <path d="M92 52 q8 18 -3 34 M184 52 q8 18 -3 32" stroke="#3fae6b" stroke-width="7" fill="none" stroke-linecap="round"/>
            </svg>
          </span>
          ${sprinkle(5, 'brushsmoke', () => `left:${r(8, 88)}%;--s:${r(34, 60)}px;--dur:${r(14, 22)}s;animation-delay:-${r(0, 20)}s;--sway:${r(-24, 24)}px`)}
          ${petals(8, ['#e8a0b4', '#d97a94'])}
        `,
      },
    ],
  },

  // ————— PULL A — THE DEEP —————
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
          ${L(48, 1, `${ridge(800, 320, 170, 55, '#081c28', .85)}`)}
          ${L(44, 2, `
            ${[[290, 130, 1.2], [400, 96, 1.5], [512, 140, 1.1]].map(([x, y, s]) => `
              <path d="M${x - 26 * s} 320 L${x - 12 * s} ${y + 24} Q${x} ${y} ${x + 12 * s} ${y + 24} L${x + 26 * s} 320 Z" fill="#0c1e2a"/>
              <ellipse cx="${x}" cy="${y + 18}" rx="${14 * s}" ry="8" fill="#1c303c"/>
              <path d="M${x - 8} ${y + 12} q3 -60 -7 -104 M${x} ${y + 10} q3 -72 12 -116 M${x + 8} ${y + 12} q9 -52 3 -96" stroke="#7a98a4" stroke-width="8" fill="none" opacity=".4" stroke-linecap="round">
                <animate attributeName="opacity" values=".4;.7;.4" dur="${r(3, 5)}s" repeatCount="indefinite"/>
              </path>
              <circle cx="${x}" cy="${y + 16}" r="5" fill="#ff8f5c"><animate attributeName="opacity" values="1;.5;1" dur="${r(1.6, 3)}s" repeatCount="indefinite"/></circle>`).join('')}
            ${[240, 340, 460, 560].map((x) => {
              const h = r(36, 70);
              return `<g><path d="M${x} 320 q-4 -${h * 0.6} 0 -${h}" stroke="#e0d8c8" stroke-width="9" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="-5 ${x} 320;6 ${x} 320;-5 ${x} 320" dur="${r(4, 8)}s" repeatCount="indefinite"/></path><circle cx="${x}" cy="${320 - h}" r="8" fill="#e0564a"><animateTransform attributeName="transform" type="rotate" values="-5 ${x} 320;6 ${x} 320;-5 ${x} 320" dur="${r(4, 8)}s" repeatCount="indefinite"/></circle></g>`;
            }).join('')}
            ${[180, 300, 420, 540, 640].map((x) => `<circle cx="${x}" cy="${r(300, 316)}" r="${r(6, 12)}" fill="#122a34"/>`).join('')}
          `)}
          <div class="fx glowbed" style="--c:rgba(255,122,60,.45)"></div>
          ${bubbles(20)}
          ${fish(7, [12, 50])}
          ${sprinkle(9, 'spark', () => `left:${r(20, 80)}%;top:${r(44, 74)}%;--c:#ff9a5c;--dur:${r(3, 6)}s;animation-delay:-${r(0, 6)}s`)}
        `,
      },
      {
        id: 'whalefall', name: 'Whale-Fall City', cls: 'deep-whalefall',
        scene: () => `
          <div class="fx godray" style="left:30%;--d:6s"></div>
          <div class="fx godray" style="left:55%;--d:8s;animation-delay:-3s"></div>
          ${L(40, 1, `
            ${ridge(800, 320, 210, 40, '#061622', .9)}
            ${windows(120, 210, 3, 3, 8, 11, 6, '#38dcc8', '#0c2430')}
            <rect x="112" y="198" width="66" height="76" fill="none" stroke="#123240" stroke-width="5"/>
            <path d="M112 198 l33 -22 l33 22" fill="none" stroke="#123240" stroke-width="5"/>
            ${windows(636, 216, 3, 3, 8, 11, 6, '#ff9ad4', '#0c2430')}
            <rect x="628" y="204" width="66" height="72" fill="none" stroke="#123240" stroke-width="5"/>
          `)}
          ${L(36, 2, `
            <g>
              <path d="M262 232 q-44 -8 -66 -40 q-9 -16 3 -27 q39 -9 71 14 q23 -39 66 -39 q34 0 46 25 q-14 39 -50 48 q-28 9 -70 19 Z" fill="#c8d8d4"/>
              <circle cx="232" cy="184" r="6" fill="#04121c"/>
              <path d="M236 206 q14 10 30 6" stroke="#a3b8b2" stroke-width="4" fill="none"/>
              <path d="M330 190 q70 -26 140 -16" stroke="#c8d8d4" stroke-width="10" fill="none"/>
              ${[352, 390, 428, 466, 504, 540].map((x, i) => `
                <rect x="${x}" y="${178 + i * 2}" width="14" height="19" rx="5" fill="#c8d8d4" transform="rotate(${r(-10, 10)} ${x} 188)"/>
                <path d="M${x + 7} ${198 + i * 2} q${20 - i * 2} 50 ${9 - i} ${86 - i * 6}" stroke="#adc2bc" stroke-width="7" fill="none" opacity="${(0.9 - i * 0.06).toFixed(2)}" stroke-linecap="round"/>`).join('')}
              <path d="M560 196 q32 12 52 38 M558 204 q22 18 32 44" stroke="#adc2bc" stroke-width="6" fill="none" opacity=".6"/>
            </g>
            <path d="M300 296 q10 -22 30 -10 q12 10 -3 20 q17 0 15 15 l-48 0 Z" fill="#10222c"/>
            <circle cx="316" cy="296" r="2.4" fill="#38dcc8"/>
          `)}
          ${bubbles(12)}
          ${fish(11, [8, 64], [8, 18])}
          ${sprinkle(14, 'marine-snow', () => `left:${r(0, 100)}%;--dur:${r(16, 30)}s;animation-delay:-${r(0, 30)}s;--sway:${r(-16, 16)}px`)}
        `,
      },
      {
        id: 'anglermarket', name: 'The Anglerfish Night Market', cls: 'deep-market',
        scene: () => `
          ${L(48, 1, `
            ${[[250, 0], [420, -8], [560, 4]].map(([x, dy], i) => `
              <rect x="${x}" y="${196 + dy}" width="120" height="${124 - dy}" fill="#0c1e2a"/>
              <path d="M${x - 14} ${200 + dy} L${x + 60} ${166 + dy} L${x + 134} ${200 + dy} Z" fill="#142e3c"/>
              <rect x="${x + 14}" y="${226 + dy}" width="92" height="44" fill="#0e2836"/>
              <ellipse cx="${x + 60}" cy="${222 + dy}" rx="11" ry="14" fill="${['#8ff2e0', '#ff9ad4', '#ffd24a'][i]}"><animate attributeName="opacity" values="1;.5;1" dur="${r(1.8, 3.2)}s" repeatCount="indefinite"/></ellipse>
              <path d="M${x + 60} ${206 + dy} v-12" stroke="#2c4a52" stroke-width="3"/>
              ${[0, 1, 2].map((k) => `<circle cx="${x + 30 + k * 30}" cy="${248 + dy}" r="6" fill="${['#ff8f5c', '#38dcc8', '#e0b84d'][k]}"><animate attributeName="opacity" values="1;.6;1" dur="${r(2, 4)}s" repeatCount="indefinite"/></circle>`).join('')}
              <path d="M${x + 20} ${282 + dy} q11 -9 22 0 M${x + 66} ${282 + dy} q11 -9 22 0" stroke="#1c3a46" stroke-width="4.4" fill="none"/>`).join('')}
            <path d="M240 176 Q400 156 630 172" stroke="#1c3a46" stroke-width="3" fill="none"/>
            ${[280, 340, 400, 460, 520, 580].map((x, i) => `<circle cx="${x}" cy="${170 - Math.sin(i) * 6}" r="5.5" fill="${['#8ff2e0', '#ff9ad4', '#ffd24a', '#ff8f5c'][i % 4]}"><animate attributeName="opacity" values="1;.4;1" dur="${r(1.6, 3)}s" repeatCount="indefinite"/></circle>`).join('')}
            <path d="M0 320 h800" stroke="#08141c" stroke-width="26"/>
          `)}
          <span class="sp angler" style="top:${r(12, 26)}%;--dur:44s;animation-delay:-${r(0, 40)}s">
            <svg viewBox="0 0 110 60">
              <path d="M12 34 Q30 10 62 12 Q92 14 100 32 Q92 50 60 52 Q28 54 12 34 Z" fill="#0e2028"/>
              <path d="M60 12 Q66 2 78 4 L72 14 Z M58 52 Q64 60 76 58 L70 48 Z" fill="#0e2028"/>
              <path d="M100 32 L108 24 L108 42 Z" fill="#0e2028"/>
              <path d="M30 14 Q38 -4 56 2" fill="none" stroke="#0e2028" stroke-width="3.4"/>
              <circle cx="58" cy="0" r="5" fill="#8ff2e0"><animate attributeName="opacity" values="1;.35;1" dur="1.5s" repeatCount="indefinite"/></circle>
              <circle cx="34" cy="26" r="4.5" fill="#8ff2e0"/><circle cx="35.5" cy="25" r="1.6" fill="#04121c"/>
              <path d="M18 38 L28 34 L24 42 L34 39 L31 46 L40 43" stroke="#dff6f0" stroke-width="2.4" fill="none"/>
            </svg>
          </span>
          ${sprinkle(9, 'lure', () => `left:${r(10, 90)}%;top:${r(6, 42)}%;--d:${r(2, 5)}s;--s:${r(5, 11)}px`)}
          ${bubbles(10)}
          ${fish(7, [42, 74], [8, 15])}
        `,
      },
      {
        id: 'kelp', name: 'The Kelp Cathedral', cls: 'deep-kelp',
        scene: () => `
          ${L(96, 1, `
            ${[140, 260, 380, 500, 620].map((x) => {
              const bend = r(-26, 26), h = r(250, 315);
              return `<g><path d="M${x} 320 Q${x + bend} ${320 - h * 0.5} ${x + bend * 0.4} ${320 - h}" stroke="#12503a" stroke-width="11" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="-2.5 ${x} 320;3 ${x} 320;-2.5 ${x} 320" dur="${r(6, 11)}s" repeatCount="indefinite"/></path>${[0.22, 0.4, 0.58, 0.76, 0.9].map((f) => `<path d="M${x + bend * f * 0.7} ${320 - h * f} q${r(16, 28)} ${r(-4, 6)} ${r(34, 48)} ${r(-16, -4)} q${r(-18, -8)} ${r(12, 18)} ${r(-34, -24)} ${r(10, 16)} Z" fill="#1c7048" opacity=".9"><animateTransform attributeName="transform" type="rotate" values="-2.5 ${x} 320;3 ${x} 320;-2.5 ${x} 320" dur="${r(6, 11)}s" repeatCount="indefinite"/></path>`).join('')}</g>`;
            }).join('')}
          `)}
          ${L(18, 2, `
            <path d="M0 320 L800 320 L800 288 Q400 274 0 290 Z" fill="#0a2a1e"/>
            ${[260, 400, 540].map((x) => `<circle cx="${x}" cy="306" r="${r(9, 15)}" fill="#123a28"/><g>${[0, 30, 60, 90, 120, 150].map((a) => `<line x1="${x}" y1="306" x2="${x + 21 * Math.cos(a * Math.PI / 180)}" y2="${306 - 21 * Math.sin(a * Math.PI / 180)}" stroke="#16452e" stroke-width="3"/>`).join('')}</g>`).join('')}
            <path d="M330 300 a24 15 0 0 1 48 0 Z" fill="#14403c"/>
            <circle cx="354" cy="295" r="7" fill="#dff6f0"><animate attributeName="opacity" values="1;.5;1" dur="3.2s" repeatCount="indefinite"/></circle>
          `)}
          <div class="fx godray" style="left:22%;--d:5s;width:120px"></div>
          <div class="fx godray" style="left:46%;--d:7s;animation-delay:-2s;width:150px"></div>
          <div class="fx godray" style="left:70%;--d:6s;animation-delay:-4s;width:110px"></div>
          ${fish(12, [10, 72], [8, 17])}
          ${bubbles(16)}
        `,
      },
      {
        id: 'ballroom', name: 'The Jellyfish Ballroom', cls: 'deep-jelly',
        scene: () => `
          ${L(22, 1, `
            <path d="M0 320 L800 320 L800 282 Q400 266 0 284 Z" fill="#0c1c38"/>
            ${[200, 320, 440, 560].map((x) => `<ellipse cx="${x}" cy="${r(288, 306)}" rx="${r(20, 36)}" ry="6" fill="#1c3468" opacity=".9"><animate attributeName="opacity" values=".9;.4;.9" dur="${r(2, 4)}s" repeatCount="indefinite"/></ellipse>`).join('')}
          `)}
          ${H('left:50%;top:1%;width:80px;margin-left:-40px', 80, 170, `
            <line x1="40" y1="0" x2="40" y2="26" stroke="#2a4a7c" stroke-width="3"/>
            ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<circle cx="${40 + (i % 2 ? 15 : -15)}" cy="${36 + i * 19}" r="7" fill="${['#8fb8ff', '#ff9ad4', '#8ff2e0'][i % 3]}"><animate attributeName="opacity" values="1;.4;1" dur="${r(1.6, 3)}s" repeatCount="indefinite"/></circle><line x1="40" y1="${30 + i * 19}" x2="${40 + (i % 2 ? 15 : -15)}" y2="${36 + i * 19}" stroke="#2a4a7c" stroke-width="2"/>`).join('')}
          `)}
          ${Array.from({ length: 8 }, (_, i) => {
            const s = r(30, 56);
            return `<span class="sp jelly" style="left:${r(6, 88)}%;--dur:${r(20, 38)}s;animation-delay:-${r(0, 36)}s;width:${s}px">
              <svg viewBox="0 0 40 54">
                <path d="M4 22 Q4 4 20 4 Q36 4 36 22 Q30 28 20 28 Q10 28 4 22 Z" fill="${['#8fb8ff', '#ff9ad4', '#8ff2e0'][i % 3]}" opacity=".85">
                  <animateTransform attributeName="transform" type="scale" values="1 1;1.08 .92;1 1" dur="${r(1.8, 3)}s" repeatCount="indefinite" additive="sum"/>
                </path>
                <circle cx="14" cy="16" r="2.4" fill="#fff" opacity=".8"/><circle cx="24" cy="13" r="1.8" fill="#fff" opacity=".7"/>
                <circle cx="15" cy="19" r="1.3" fill="#1c1048"/><circle cx="25" cy="19" r="1.3" fill="#1c1048"/>
                <path d="M17 23 q3 2 6 0" stroke="#1c1048" stroke-width="1.1" fill="none"/>
                ${[8, 14, 20, 26, 32].map((x) => `<path d="M${x} 28 q${r(-4, 4)} 12 ${r(-3, 3)} 24" stroke="${['#8fb8ff', '#ff9ad4', '#8ff2e0'][i % 3]}" stroke-width="1.8" fill="none" opacity=".7"><animate attributeName="d" values="M${x} 28 q-3 12 -2 24;M${x} 28 q4 12 2 24;M${x} 28 q-3 12 -2 24" dur="${r(2.4, 4)}s" repeatCount="indefinite"/></path>`).join('')}
              </svg>
            </span>`;
          }).join('')}
          ${sprinkle(18, 'spark', () => `left:${r(0, 100)}%;top:${r(6, 84)}%;--c:${pick(['#8fb8ff', '#ff9ad4', '#8ff2e0'])};--dur:${r(3, 7)}s;animation-delay:-${r(0, 7)}s`)}
          ${sprinkle(8, 'marine-snow', () => `left:${r(0, 100)}%;--dur:${r(18, 32)}s;animation-delay:-${r(0, 32)}s;--sway:${r(-14, 14)}px`)}
        `,
      },
      {
        id: 'subs', name: 'The Submarine Graveyard', cls: 'deep-subs',
        scene: () => `
          ${L(42, 1, ridge(800, 320, 200, 48, '#071824', .9))}
          ${L(40, 2, `
            <g transform="rotate(-7 400 240)">
              <ellipse cx="400" cy="240" rx="170" ry="44" fill="#14303e"/>
              <rect x="348" y="164" width="60" height="40" rx="9" fill="#14303e"/>
              <rect x="368" y="146" width="8" height="22" fill="#14303e"/>
              <circle cx="376" cy="142" r="5" fill="#38dcc8"><animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/></circle>
              ${[300, 360, 420, 480].map((x) => `<circle cx="${x}" cy="236" r="8" fill="#8ff2e0" opacity=".5"><animate attributeName="opacity" values=".5;.9;.5" dur="${r(2.5, 4.5)}s" repeatCount="indefinite"/></circle>`).join('')}
              <path d="M540 226 l30 -16 v40 Z" fill="#0e222e"/>
              <path d="M258 254 q-20 14 -9 34 q16 -2 23 -20" fill="#0c1e28"/>
              <path d="M300 284 l200 -6" stroke="#0c1e28" stroke-width="5" stroke-dasharray="8 10"/>
            </g>
            <circle cx="580" cy="130" r="19" fill="#0e2430"/>
            ${[0, 60, 120, 180, 240, 300].map((a) => `<line x1="580" y1="130" x2="${580 + 29 * Math.cos(a * Math.PI / 180)}" y2="${130 + 29 * Math.sin(a * Math.PI / 180)}" stroke="#0e2430" stroke-width="4.4"/>`).join('')}
            <line x1="580" y1="149" x2="580" y2="320" stroke="#0e2430" stroke-width="3.4" stroke-dasharray="6 8"/>
            <path d="M250 320 q0 -44 24 -64 q7 20 -4 38 q17 -11 28 2 q-22 11 -28 24 Z" fill="#0a2028"/>
          `)}
          ${sprinkle(6, 'sonar', () => `left:${r(28, 66)}%;top:${r(8, 44)}%;--d:${r(3, 5)}s;--s:${r(24, 44)}px;animation-delay:-${r(0, 5)}s`)}
          ${bubbles(14)}
          ${fish(7, [8, 52], [8, 14])}
          ${sprinkle(9, 'marine-snow', () => `left:${r(0, 100)}%;--dur:${r(18, 30)}s;animation-delay:-${r(0, 30)}s;--sway:${r(-14, 14)}px`)}
        `,
      },
      {
        id: 'reef', name: 'The Bioluminous Reef', cls: 'deep-reef',
        scene: () => `
          ${L(46, 1, `
            ${ridge(800, 320, 240, 26, '#0a2830')}
            ${[[280, '#e0447a'], [360, '#ff8f5c'], [450, '#8f6fdc'], [530, '#38dcc8']].map(([x, c]) => `
              <path d="M${x} 320 q-10 -${r(46, 76)} ${r(-4, 6)} -${r(80, 108)} M${x} 320 q${r(12, 22)} -${r(36, 66)} ${r(26, 40)} -${r(62, 88)} M${x} 320 q-${r(16, 26)} -${r(30, 50)} -${r(34, 48)} -${r(46, 70)}" stroke="${c}" stroke-width="10" fill="none" stroke-linecap="round" opacity=".85"/>`).join('')}
            ${[[240, 40], [420, 52], [580, 36]].map(([x, rx]) => `<ellipse cx="${x}" cy="304" rx="${rx}" ry="${r(18, 26)}" fill="#c2543a"/><path d="M${x - rx * 0.6} 298 q7 -9 14 0 q7 -9 14 0 q7 -9 14 0" stroke="#e07a5a" stroke-width="3.4" fill="none"/>`).join('')}
            <path d="M370 310 a26 17 0 0 1 52 0 Z" fill="#1c4a5c"/>
            <circle cx="396" cy="304" r="8" fill="#eef8ff"><animate attributeName="opacity" values="1;.45;1" dur="3s" repeatCount="indefinite"/></circle>
            <path d="M610 300 q14 -20 30 -8 q8 8 -2 14 q10 2 8 12 l-36 0 Z" fill="#0e2e3a"/>
            <circle cx="628" cy="298" r="2.6" fill="#8ff2e0"/>
          `)}
          ${sprinkle(24, 'polyp', (i) => `left:${r(4, 96)}%;top:${r(58, 92)}%;--c:${['#38dcc8', '#ff8f5c', '#ff9ad4', '#e0b84d', '#8fb8ff'][i % 5]};--d:${r(1.6, 4)}s;--s:${r(4, 9)}px;animation-delay:-${r(0, 4)}s`)}
          ${fish(13, [10, 58], [7, 15])}
          ${bubbles(10)}
        `,
      },
      {
        id: 'void', name: 'The Midnight Zone', cls: 'deep-void',
        scene: () => `
          <div class="fx bigeye"><i></i></div>
          ${L(30, 1, `
            <path d="M60 240 Q240 170 480 200 Q660 224 780 200 L780 234 Q560 258 340 240 Q160 230 60 262 Z" fill="#0a1622" opacity=".9"/>
            <path d="M756 206 l34 -14 l-7 18 l9 11 l-36 -7 Z" fill="#0a1622" opacity=".9"/>
            <circle cx="180" cy="230" r="3" fill="#38dcc8" opacity=".5"><animate attributeName="opacity" values=".5;.1;.5" dur="4s" repeatCount="indefinite"/></circle>
          `)}
          ${sprinkle(3, 'lure', () => `left:${r(24, 72)}%;top:${r(14, 44)}%;--d:${r(2.6, 4.5)}s;--s:${r(6, 10)}px;animation-delay:-${r(0, 4)}s`)}
          ${sprinkle(12, 'marine-snow', () => `left:${r(0, 100)}%;--dur:${r(22, 40)}s;animation-delay:-${r(0, 40)}s;--sway:${r(-10, 10)}px`)}
          ${sprinkle(6, 'spark', () => `left:${r(10, 90)}%;top:${r(56, 88)}%;--c:#1c5c52;--dur:${r(4, 8)}s;animation-delay:-${r(0, 8)}s`)}
        `,
      },
    ],
  },

  // ————— LEGS A — CRYPTID NATIONAL PARK —————
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
          ${clouds(3, 'rgba(255,220,170,.6)', [4, 16])}
          ${L(64, 1, `${ridge(800, 320, 140, 40, '#1c2c1e', .7)}${pines(800, 320, 18, '#14231a', 90, 170, .9)}`)}
          <span class="sp squatch" style="top:auto;bottom:14%;--dur:70s;animation-delay:-${r(6, 60)}s;z-index:2">
            <svg viewBox="0 0 44 64" fill="#10180f">
              <ellipse cx="22" cy="36" rx="14" ry="21"/>
              <circle cx="22" cy="13" r="9.5"/>
              <path d="M14 10 q8 -7 16 0" fill="none" stroke="#10180f" stroke-width="4"/>
              <path d="M9 30 q-7 7 -5 17 M35 30 q7 7 5 17" stroke="#10180f" stroke-width="6.5" stroke-linecap="round" fill="none"/>
              <path d="M16 55 l-3 9 M28 55 l3 9" stroke="#10180f" stroke-width="7.5" stroke-linecap="round"/>
              <circle cx="19" cy="12" r="1.4" fill="#ffd98a"/><circle cx="26" cy="12" r="1.4" fill="#ffd98a"/>
            </svg>
          </span>
          ${L(32, 3, `
            <path d="M0 320 L800 320 L800 290 Q560 278 380 286 Q180 294 0 282 Z" fill="#0e1811"/>
            ${pines(800, 320, 6, '#0a120c', 110, 190)}
            <g transform="rotate(-2 320 250)">
              <rect x="314" y="192" width="12" height="120" fill="#3a2a14"/>
              <rect x="276" y="196" width="90" height="28" rx="4" fill="#4a3820"/>
              <text x="321" y="216" text-anchor="middle" font-family="monospace" font-size="14" fill="#e8dcc0">TRAIL ➜</text>
              <rect x="282" y="232" width="78" height="22" rx="4" fill="#7a2418"/>
              <text x="321" y="248" text-anchor="middle" font-family="monospace" font-size="12" fill="#f2e8d0">BEWARE</text>
            </g>
            <g>
              <path d="M450 306 L505 254 L560 306 Z" fill="#c9a86a"/>
              <path d="M458 306 L505 262 L552 306 Z" fill="#8a6a3a"/>
              <rect x="494" y="282" width="22" height="24" fill="#3a2814"/>
              <circle cx="505" cy="272" r="8" fill="#ffe9b3"><animate attributeName="opacity" values="1;.5;1" dur="3s" repeatCount="indefinite"/></circle>
            </g>
            <g>
              <ellipse cx="398" cy="310" rx="20" ry="5" fill="#0a0f0a"/>
              <path d="M388 308 l4 -10 8 -3 8 3 4 10" fill="none" stroke="#5a4224" stroke-width="4"/>
              <path d="M394 300 q6 -14 8 -2 q4 -12 6 2" fill="#ff8a3c"><animate attributeName="opacity" values="1;.6;1" dur=".8s" repeatCount="indefinite"/></path>
            </g>
          `)}
          ${sprinkle(6, 'footprint', (i) => `left:${10 + i * 14}%;bottom:${4 + (i % 2) * 4}%;--d:${(i * 1.1).toFixed(1)}s;transform:rotate(${i % 2 ? 14 : -10}deg)`)}
          ${fireflies(10)}
          <div class="fx mist" style="bottom:22%;height:12%"></div>
        `,
      },
      {
        id: 'mothman', name: 'Mothman Overlook', cls: 'park-mothman',
        scene: () => `
          ${H('left:50%;top:3%;width:150px;margin-left:-75px', 150, 150, `
            <circle cx="75" cy="75" r="66" fill="#f4f0dc"/>
            <circle cx="52" cy="56" r="11" fill="#d8d2b4" opacity=".8"/><circle cx="94" cy="90" r="15" fill="#d8d2b4" opacity=".7"/><circle cx="84" cy="42" r="6" fill="#d8d2b4" opacity=".8"/><circle cx="48" cy="96" r="7" fill="#d8d2b4" opacity=".7"/>
            <g>
              <ellipse cx="75" cy="96" rx="10" ry="15" fill="#0a0a14"/>
              <circle cx="75" cy="76" r="7.5" fill="#0a0a14"/>
              <path d="M65 92 Q38 70 34 48 Q58 62 69 82 Z M85 92 Q112 70 116 48 Q92 62 81 82 Z" fill="#0a0a14">
                <animateTransform attributeName="transform" type="scale" values="1 1;1.08 1.03;1 1" dur="3.4s" repeatCount="indefinite" additive="sum" style="transform-origin:75px 90px"/>
              </path>
              <circle cx="72" cy="74" r="2.2" fill="#ff2f2f"><animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/></circle>
              <circle cx="78" cy="74" r="2.2" fill="#ff2f2f"><animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/></circle>
            </g>
          `, 'moonglow')}
          ${stars(18, [0, 34])}
          ${L(58, 1, `${ridge(800, 320, 170, 44, '#0e1420', .85)}${pines(800, 320, 14, '#0a0e18', 70, 140, .95)}`)}
          ${L(44, 2, `
            <path d="M0 320 L800 320 L800 294 Q400 280 0 296 Z" fill="#05070e"/>
            ${[300, 500].map((x) => `
              <path d="M${x} 294 L${x - 6} 170 q6 -16 12 0 L${x + 6} 294 Z" fill="#070b12"/>
              <path d="M${x} 186 q-34 -20 -62 -16 M${x} 208 q30 -14 56 -6 M${x - 2} 170 q-16 -20 -34 -22 M${x + 2} 172 q18 -16 36 -14" stroke="#070b12" stroke-width="6.5" fill="none" stroke-linecap="round"/>`).join('')}
            <g transform="rotate(2 396 268)">
              <rect x="390" y="240" width="10" height="66" fill="#241c10"/>
              <rect x="362" y="244" width="68" height="20" rx="3" fill="#3a2c16"/>
              <text x="396" y="259" text-anchor="middle" font-family="monospace" font-size="10.5" fill="#e8dcc0">OVERLOOK</text>
            </g>
          `)}
          ${sprinkle(5, 'redeyes', () => `left:${r(10, 84)}%;top:${r(48, 72)}%;--d:${r(3, 8)}s`)}
          ${sprinkle(10, 'moth', () => `left:${r(20, 78)}%;top:${r(4, 40)}%;--d:${r(2, 4)}s;--s:${r(8, 14)}px`)}
        `,
      },
      {
        id: 'marina', name: 'Lake-Monster Marina', cls: 'park-marina',
        scene: () => `
          ${clouds(3, 'rgba(255,190,210,.6)', [4, 18])}
          ${L(58, 1, `${ridge(800, 320, 150, 36, '#3c3358', .65)}${pines(800, 320, 10, '#241c3a', 50, 96, .85)}`)}
          ${L(48, 2, `
            <rect x="0" y="168" width="800" height="152" fill="#123240"/>
            <path d="M0 168 h800" stroke="#e090b0" stroke-width="3" opacity=".8"/>
            <path d="M370 172 q40 3 80 0 l-8 70 q-32 6 -64 0 Z" fill="#ffd0e0" opacity=".14"/>
            <g>
              <path d="M330 216 a30 22 0 0 1 60 0 Z" fill="#1c4a3c"/>
              <path d="M424 222 a22 16 0 0 1 44 0 Z" fill="#1c4a3c"/>
              <path d="M268 222 q3 -40 30 -48 q24 -8 35 10 q7 14 -8 23" fill="none" stroke="#1c4a3c" stroke-width="14" stroke-linecap="round"/>
              <circle cx="302" cy="172" r="12" fill="#1c4a3c"/>
              <circle cx="298" cy="168" r="2.4" fill="#dff2ec"/>
              <path d="M310 178 q7 4 12 2" stroke="#dff2ec" stroke-width="2" fill="none"/>
              <path d="M300 160 l-4 -8 M308 160 l3 -8" stroke="#1c4a3c" stroke-width="3" stroke-linecap="round"/>
              <path d="M276 236 q60 10 210 4" stroke="#dff2ec" stroke-width="2.4" fill="none" opacity=".5"><animate attributeName="opacity" values=".5;.2;.5" dur="3s" repeatCount="indefinite"/></path>
            </g>
            <rect x="480" y="206" width="180" height="11" fill="#3a2c18"/>
            ${[492, 540, 588, 636].map((x) => `<rect x="${x}" y="217" width="8" height="${r(22, 34)}" fill="#2c2010"/>`).join('')}
            <g><path d="M508 198 q26 -13 52 0 l-7 9 q-19 -9 -38 0 Z" fill="#5a3c1c"/><rect x="530" y="174" width="4.4" height="20" fill="#2c2010"/><path d="M534 176 l14 6 -14 6 Z" fill="#e0447a"/></g>
            <rect x="586" y="168" width="9" height="38" fill="#2c2010"/>
            <circle cx="590" cy="162" r="8" fill="#ffd98a"><animate attributeName="opacity" values="1;.55;1" dur="2.6s" repeatCount="indefinite"/></circle>
            ${[[350, 250, '#d94f3c'], [470, 258, '#e8b84d'], [290, 262, '#d94f3c']].map(([x, y, c]) => `
              <g><path d="M${x - 8} ${y} a8 9 0 0 1 16 0 l-2 8 h-12 Z" fill="${c}"/><rect x="${x - 8}" y="${y + 2}" width="16" height="4" fill="#f2e8d0"/><animateTransform attributeName="transform" type="rotate" values="-5 ${x} ${y};5 ${x} ${y};-5 ${x} ${y}" dur="${r(2.5, 4)}s" repeatCount="indefinite"/></g>`).join('')}
          `)}
          ${sprinkle(6, 'ripple', () => `left:${r(10, 88)}%;top:${r(58, 84)}%;--d:${r(3, 6)}s`)}
          ${stars(10, [0, 22])}
          ${fireflies(5)}
        `,
      },
      {
        id: 'saucer', name: 'The Saucer Crash Site', cls: 'park-ufo',
        scene: () => `
          ${stars(24, [0, 44])}
          ${L(58, 1, `${pines(800, 320, 16, '#0c1410', 90, 170, .95)}`)}
          ${L(46, 2, `
            <path d="M0 320 L800 320 L800 292 Q400 278 0 294 Z" fill="#101a12"/>
            <path d="M180 300 Q400 276 600 292 L594 306 Q400 292 188 312 Z" fill="#060a06"/>
            <path d="M400 218 L340 130 L460 130 Z" fill="#7ae0d0" opacity=".3"><animate attributeName="opacity" values=".3;.55;.3" dur="2.2s" repeatCount="indefinite"/></path>
            <g>
              <ellipse cx="424" cy="128" rx="15" ry="9" fill="#e8dcc0"/>
              <path d="M416 124 q-3 -7 3 -9 M432 124 q3 -7 -3 -9" stroke="#e8dcc0" stroke-width="3"/>
              <circle cx="419" cy="126" r="1.6" fill="#1c1208"/>
              <animateTransform attributeName="transform" type="translate" values="0 0;0 -40" dur="5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="1;0" dur="5s" repeatCount="indefinite"/>
            </g>
            <g transform="rotate(-11 400 236)">
              <ellipse cx="400" cy="236" rx="128" ry="34" fill="#2a3440"/>
              <ellipse cx="400" cy="224" rx="128" ry="30" fill="#46566a"/>
              <path d="M326 200 A74 40 0 0 1 474 200 L462 220 A62 30 0 0 0 338 220 Z" fill="#7ae0d0" opacity=".85"/>
              <path d="M362 194 q34 -17 68 0" stroke="#dff6f0" stroke-width="3.4" fill="none" opacity=".8"/>
              ${[296, 348, 400, 452, 504].map((x, i) => `<circle cx="${x}" cy="232" r="7" fill="#ffd24a"><animate attributeName="opacity" values="${i % 2 ? '1;.2;1' : '.2;1;.2'}" dur="1s" repeatCount="indefinite"/></circle>`).join('')}
              <path d="M318 258 l-24 36 M482 258 l24 36" stroke="#2a3440" stroke-width="10" stroke-linecap="round"/>
            </g>
            <path d="M262 288 q-16 -22 -34 -24 M545 292 q18 -20 34 -20" stroke="#46566a" stroke-width="6" fill="none"/>
          `)}
          ${sprinkle(9, 'spark', () => `left:${r(32, 68)}%;top:${r(44, 72)}%;--c:#7ae0d0;--dur:${r(2, 5)}s;animation-delay:-${r(0, 5)}s`)}
          ${sprinkle(4, 'brushsmoke', () => `left:${r(36, 62)}%;--s:${r(24, 44)}px;--dur:${r(10, 16)}s;animation-delay:-${r(0, 14)}s;--sway:${r(-20, 20)}px`)}
          ${wisps(4, ['#7ae0d0', '#c8e8a8'])}
        `,
      },
      {
        id: 'meadow', name: 'Jackalope Meadow', cls: 'park-meadow',
        scene: () => `
          <div class="fx bigsun" style="left:12%;top:5%;--c1:#fff6d0;--c2:#ffd24a;--s:100px"></div>
          ${clouds(4, 'rgba(255,255,255,.9)', [4, 24])}
          ${L(54, 1, `
            <path d="M0 320 Q200 216 430 250 Q640 282 800 238 L800 320 Z" fill="#2c421e"/>
            <g>
              <ellipse cx="420" cy="220" rx="60" ry="44" fill="#1c2e14"/>
              <ellipse cx="376" cy="196" rx="30" ry="24" fill="#1c2e14"/>
              <ellipse cx="462" cy="192" rx="34" ry="27" fill="#1c2e14"/>
              <ellipse cx="418" cy="170" rx="36" ry="26" fill="#1c2e14"/>
              <rect x="412" y="250" width="17" height="40" fill="#3a2814"/>
              <path d="M412 262 q-16 -8 -24 -22 M429 258 q14 -10 18 -24" stroke="#3a2814" stroke-width="6" fill="none"/>
            </g>
          `)}
          ${L(36, 2, `
            <path d="M0 320 Q240 268 520 292 Q680 304 800 288 L800 320 Z" fill="#1f3014"/>
            ${Array.from({ length: 34 }, () => `<path d="M${r(10, 790)} ${r(272, 314)} q2.4 -9 5 -14" stroke="#3c5a24" stroke-width="2.6" fill="none"/>`).join('')}
            ${Array.from({ length: 18 }, () => { const x = r(30, 770), y = r(276, 312); return `<circle cx="${x}" cy="${y}" r="3.2" fill="${pick(['#e8b84d', '#d97a94', '#c8e8a8', '#e8dcc0', '#e0447a'])}"/><line x1="${x}" y1="${y + 3}" x2="${x}" y2="${y + 9}" stroke="#3c5a24" stroke-width="1.4"/>`; }).join('')}
          `)}
          ${Array.from({ length: 3 }, (_, i) => `
            <span class="sp jackalope" style="top:auto;bottom:${r(8, 20)}%;--dur:${r(18, 28)}s;animation-delay:-${r(0, 24)}s;--flip:${i % 2 ? -1 : 1}">
              <svg viewBox="0 0 44 40">
                <path d="M12 12 l-3 -11 M15 12 l1 -12 M12 12 q-6 -7 -10 -6 M15 11 q5 -9 10 -8" stroke="#4a3820" stroke-width="2.4" fill="none" stroke-linecap="round"/>
                <ellipse cx="24" cy="28" rx="13" ry="9" fill="#6a5230"/>
                <circle cx="13" cy="19" r="7" fill="#6a5230"/>
                <path d="M8 14 q-2 -8 3 -10 q3 4 1 10 Z" fill="#6a5230"/>
                <circle cx="11" cy="18" r="1.4" fill="#1c1208"/>
                <circle cx="36" cy="24" r="4" fill="#e8dcc0"/>
                <path d="M18 36 q-4 3 -8 2 M30 36 q4 3 8 2" stroke="#4a3820" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </span>`).join('')}
          ${butterflies(6, ['#e0447a', '#ffd24a', '#8fb8ff'])}
          ${fireflies(8)}
          ${petals(10, ['#e8b84d', '#c8e8a8', '#e8dcc0'])}
        `,
      },
      {
        id: 'watchtower', name: 'The Fire Watchtower', cls: 'park-tower',
        scene: () => `
          ${stars(20, [0, 28])}
          ${clouds(2, 'rgba(255,170,140,.4)', [8, 20])}
          ${L(60, 1, `${ridge(800, 320, 160, 44, '#141c2a', .75)}${pines(800, 320, 18, '#0e141f', 80, 160, .95)}`)}
          ${L(78, 2, `
            <g>
              <path d="M330 320 L390 96 M470 320 L410 96 M340 280 L462 280 M348 240 L452 240 M356 200 L444 200 M364 160 L436 160 M330 320 L460 240 M470 320 L340 240 M348 240 L452 160 M452 240 L348 160" stroke="#1c1408" stroke-width="6" fill="none"/>
              <rect x="352" y="50" width="96" height="50" fill="#2c2010"/>
              <path d="M340 52 L400 20 L460 52 Z" fill="#1c1408"/>
              <rect x="366" y="60" width="68" height="28" fill="#ffd98a"><animate attributeName="opacity" values="1;.7;1" dur="4s" repeatCount="indefinite"/></rect>
              <path d="M366 74 h68 M383 60 v28 M417 60 v28" stroke="#2c2010" stroke-width="3"/>
              <path d="M400 74 L520 30 L520 118 Z" fill="#ffd98a" opacity=".16"><animate attributeName="opacity" values=".16;.3;.16" dur="3s" repeatCount="indefinite"/></path>
              <rect x="346" y="100" width="108" height="8" fill="#1c1408"/>
              <line x1="400" y1="20" x2="400" y2="2" stroke="#1c1408" stroke-width="3"/>
              <circle cx="400" cy="2" r="3.8" fill="#ff3b3b"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" repeatCount="indefinite"/></circle>
            </g>
            <path d="M0 320 L800 320 L800 300 Q400 288 0 302 Z" fill="#0a0e16"/>
            <g><circle cx="252" cy="270" r="3" fill="#ffb84d"/><circle cx="262" cy="270" r="3" fill="#ffb84d"/><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;.6;.65;.9;1" dur="6s" repeatCount="indefinite"/></g>
          `)}
          ${sprinkle(8, 'moth', () => `left:${r(38, 62)}%;top:${r(10, 30)}%;--d:${r(1.6, 3)}s;--s:${r(6, 11)}px`)}
          ${sprinkle(4, 'sonar', () => `left:${r(44, 56)}%;top:${r(0, 8)}%;--d:${r(2.5, 4)}s;--s:${r(16, 28)}px;animation-delay:-${r(0, 4)}s`)}
          ${fireflies(6)}
        `,
      },
      {
        id: 'canyon', name: 'Chupacabra Canyon', cls: 'park-canyon',
        scene: () => `
          ${stars(24, [0, 30])}
          ${L(70, 1, `
            <path d="M0 320 L0 90 L110 80 L160 130 L154 320 Z" fill="#3a1812"/>
            <path d="M800 320 L800 70 L690 62 L640 116 L648 320 Z" fill="#3a1812"/>
            <path d="M0 140 h154 M646 128 h154 M0 210 h150 M650 200 h150 M0 276 h152 M648 268 h152" stroke="#2a100c" stroke-width="8"/>
            <path d="M160 130 q6 -10 0 -20 M640 116 q-6 -10 0 -20" stroke="#ff9a4c" stroke-width="3" fill="none" opacity=".6"/>
          `)}
          ${L(56, 2, `
            <path d="M310 320 L318 190 Q336 148 400 144 Q464 148 480 190 L490 320 Z" fill="#2c1010"/>
            <path d="M340 144 Q400 74 470 110 Q496 134 480 190" fill="none" stroke="#2c1010" stroke-width="22"/>
            <path d="M340 148 Q400 82 464 114" fill="none" stroke="#ff9a4c" stroke-width="3" opacity=".5"/>
            <path d="M322 216 h150 M318 262 h160" stroke="#1e0a08" stroke-width="7"/>
            <ellipse cx="400" cy="252" rx="26" ry="30" fill="#140606"/>
            <circle cx="392" cy="244" r="2.6" fill="#ff2f2f"><animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;.1;.7;.8;1" dur="5s" repeatCount="indefinite"/></circle>
            <circle cx="408" cy="244" r="2.6" fill="#ff2f2f"><animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;.1;.7;.8;1" dur="5s" repeatCount="indefinite"/></circle>
          `)}
          ${L(22, 3, `
            <path d="M0 320 L800 320 L800 296 Q400 284 0 298 Z" fill="#200c06"/>
            <g transform="rotate(-6 300 300)">
              <ellipse cx="300" cy="300" rx="20" ry="10" fill="#e8dcc0"/>
              <circle cx="283" cy="295" r="8" fill="#e8dcc0"/>
              <path d="M276 290 q-5 -7 -2 -12 M289 289 q4 -8 9 -9" stroke="#e8dcc0" stroke-width="3.4" fill="none"/>
              <circle cx="281" cy="294" r="2" fill="#200c06"/>
            </g>
            <path d="M480 306 q-3 -26 9 -38 q5 10 0 24 q9 -7 14 0 q-10 7 -12 14 Z" fill="#1c3a2a"/>
            <path d="M540 310 h9 M558 310 h7" stroke="#e8dcc0" stroke-width="3"/>
          `)}
          ${sprinkle(3, 'dustdevil', (i) => `left:${[24, 58, 74][i]}%;bottom:24%;top:auto;--d:${r(3, 5)}s;animation-delay:-${r(0, 4)}s`)}
          ${sprinkle(10, 'dust', () => `left:${r(0, 100)}%;--dur:${r(14, 26)}s;animation-delay:-${r(0, 26)}s`)}
        `,
      },
      {
        id: 'bog', name: "The Will-o'-Wisp Bog", cls: 'park-bog',
        scene: () => `
          ${L(74, 1, `
            ${[[300, 1.3], [480, 1.0]].map(([x, s]) => `
              <path d="M${x} 320 L${x - 9 * s} ${320 - 170 * s} Q${x} ${320 - 190 * s} ${x + 9 * s} ${320 - 170 * s} L${x + 7 * s} 320 Z" fill="#0c140e"/>
              <path d="M${x} ${320 - 148 * s} q-${38 * s} -${22 * s} -${64 * s} -${14 * s} M${x} ${320 - 120 * s} q${34 * s} -${18 * s} ${60 * s} -${8 * s} M${x - 2} ${320 - 168 * s} q-${20 * s} -${24 * s} -${42 * s} -${26 * s} M${x + 2} ${320 - 166 * s} q${22 * s} -${20 * s} ${44 * s} -${18 * s}" stroke="#0c140e" stroke-width="${7 * s}" fill="none" stroke-linecap="round"/>
              ${[[-30, 130], [26, 108], [-16, 158]].map(([dx, dy]) => `<path d="M${x + dx * s} ${320 - dy * s} q-2 ${26 * s} 3 ${44 * s}" stroke="#2c4a2c" stroke-width="${3.4 * s}" fill="none" opacity=".9"><animateTransform attributeName="transform" type="rotate" values="-3 ${x + dx * s} ${320 - dy * s};4 ${x + dx * s} ${320 - dy * s};-3 ${x + dx * s} ${320 - dy * s}" dur="${r(3, 6)}s" repeatCount="indefinite"/></path>`).join('')}`).join('')}
          `)}
          ${L(28, 2, `
            <rect x="0" y="256" width="800" height="64" fill="#0e1a14"/>
            <path d="M0 256 h800" stroke="#3c5c34" stroke-width="2.4"/>
            ${[240, 400, 560].map((x) => `<ellipse cx="${x}" cy="${r(272, 296)}" rx="${r(34, 54)}" ry="5" fill="#1c3424" opacity=".95"/>`).join('')}
            <ellipse cx="400" cy="284" rx="40" ry="6" fill="#24402e"/>
            <g><ellipse cx="400" cy="272" rx="36" ry="9" fill="#241c10"/><circle cx="382" cy="263" r="4.4" fill="#7ad48a"/><circle cx="395" cy="261" r="4.4" fill="#7ad48a"/><circle cx="382" cy="262" r="1.6" fill="#04120a"/><circle cx="395" cy="260" r="1.6" fill="#04120a"/><path d="M406 268 q6 -3 10 0" stroke="#0a140c" stroke-width="2" fill="none"/></g>
            ${[190, 300, 500, 610].map((x) => `<rect x="${x}" y="${r(250, 262)}" width="10" height="${r(34, 56)}" fill="#1c1810" transform="rotate(${r(-9, 9)} ${x} 280)"/>`).join('')}
            <path d="M180 260 L620 260" stroke="#241c10" stroke-width="4" stroke-dasharray="26 22" opacity=".8"/>
          `)}
          ${wisps(12, ['#7ad48a', '#7ae0d0', '#c8e8a8'])}
          <div class="fx mist" style="bottom:16%;height:20%"></div>
          <div class="fx mist" style="bottom:2%;height:12%;animation-delay:-3s"></div>
          ${fireflies(6)}
        `,
      },
    ],
  },

  // ————— PUSH B — THE NOODLE COSMOS —————
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
          ${L(64, 1, `
            <g>
              <ellipse cx="270" cy="118" rx="15" ry="10" fill="#7ad48a"/>
              <ellipse cx="490" cy="96" rx="13" ry="13" fill="#ffd24a"/>
              <path d="M370 84 q14 -10 28 0 q-14 11 -28 0 Z" fill="#e8543c"/>
              <animateTransform attributeName="transform" type="translate" values="0 0;0 -26;0 0" dur="2.6s" repeatCount="indefinite"/>
            </g>
            <path d="M-20 262 q32 -100 64 -8 q22 -76 52 -6 q28 -92 62 -4 q24 -72 54 0 q30 -88 64 -6 q26 -70 56 2 q28 -86 62 -2 q24 -68 56 2 q30 -84 64 -2 q26 -66 58 4 q28 -80 62 0 q22 -62 54 2 L800 320 L0 320 Z" fill="#e8531c">
              <animateTransform attributeName="transform" type="scale" values="1 1;1 1.16;1 .94;1 1" dur="1.1s" repeatCount="indefinite" additive="sum" style="transform-origin:50% 100%"/>
            </path>
            <path d="M0 290 q28 -62 56 -4 q24 -52 50 0 q26 -60 54 -4 q22 -48 48 0 q26 -56 54 -4 q24 -50 50 0 q26 -56 54 0 q22 -46 48 0 q26 -54 54 0 q24 -48 50 0 q26 -54 54 0 q22 -44 48 0 q24 -50 52 0 L800 320 L0 320 Z" fill="#ffb84d">
              <animateTransform attributeName="transform" type="scale" values="1 1;1 .88;1 1.1;1 1" dur="0.8s" repeatCount="indefinite" additive="sum" style="transform-origin:50% 100%"/>
            </path>
          `)}
          ${L(30, 2, `
            <path d="M120 320 Q120 236 400 236 Q680 236 680 320 Z" fill="#180606"/>
            <path d="M132 300 Q400 250 668 300" stroke="#33110d" stroke-width="7" fill="none"/>
            <ellipse cx="290" cy="270" rx="9" ry="12" fill="#ff8a3c"><animate attributeName="opacity" values="1;.4;1" dur="1.2s" repeatCount="indefinite"/></ellipse>
            <ellipse cx="510" cy="270" rx="9" ry="12" fill="#ff8a3c"><animate attributeName="opacity" values=".4;1;.4" dur="1.2s" repeatCount="indefinite"/></ellipse>
            <path d="M350 292 q50 16 100 0" stroke="#ff8a3c" stroke-width="5" fill="none" opacity=".8"/>
            <path d="M240 252 l-26 -20 M560 252 l26 -20" stroke="#33110d" stroke-width="9" stroke-linecap="round"/>
          `)}
          ${sprinkle(10, 'noodle', () => `left:${r(2, 96)}%;--dur:${r(6, 11)}s;animation-delay:-${r(0, 10)}s;--sway:${r(-50, 50)}px;--rot:${r(180, 560)}deg`)}
          ${sprinkle(8, 'veg', (i) => `left:${r(4, 94)}%;--dur:${r(7, 12)}s;animation-delay:-${r(0, 11)}s;--sway:${r(-40, 40)}px;--rot:${r(140, 460)}deg;--c:${['#7ad48a', '#ff6a2c', '#ffd24a'][i % 3]}`)}
          ${embers(20)}
          ${steam(5)}
        `,
      },
      {
        id: 'steamgardens', name: 'The Dumpling Steam Gardens', cls: 'wok-steam',
        scene: () => `
          ${clouds(3, 'rgba(255,244,224,.8)', [4, 20])}
          ${L(64, 1, `
            ${[[400, 150, 210], [230, 226, 140], [570, 230, 140]].map(([cx, cy, w]) => `
              <g>
                <ellipse cx="${cx}" cy="${cy + 46}" rx="${w / 2 + 16}" ry="17" fill="#5a3a20"/>
                <rect x="${cx - w / 2}" y="${cy}" width="${w}" height="46" rx="9" fill="#8a6034"/>
                ${Array.from({ length: Math.floor(w / 16) }, (_, k) => `<path d="M${cx - w / 2 + 8 + k * 16} ${cy + 6} q6 17 0 34" stroke="#6d4826" stroke-width="3.6" fill="none"/>`).join('')}
                <ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="11" fill="#a87c46"/>
                <ellipse cx="${cx}" cy="${cy - 2}" rx="${w / 2 - 12}" ry="7" fill="#c9985a"/>
              </g>`).join('')}
            <path d="M300 240 L360 176 M440 176 L500 240" stroke="#c9884a" stroke-width="8" stroke-linecap="round"/>
            <path d="M0 320 L800 320 L800 296 Q400 286 0 298 Z" fill="#241410"/>
          `)}
          ${Array.from({ length: 6 }, (_, i) => `
            <span class="sp dumpling" style="left:${[12, 28, 44, 58, 72, 84][i]}%;top:${r(12, 44)}%;--d:${r(5, 9)}s;animation-delay:-${r(0, 8)}s;width:${r(36, 54)}px">
              <svg viewBox="0 0 34 28">
                <path d="M4 21 q0 -15 13 -15 t13 15 q-13 6 -26 0 Z" fill="#f6ead0"/>
                <path d="M9 8 q2 -4 4 -1 M15 6 q2 -4 4 -1 M21 7 q2 -4 4 0" stroke="#d9b88a" stroke-width="2" fill="none"/>
                <circle cx="13" cy="16" r="1.5" fill="#4a3218"/><circle cx="21" cy="16" r="1.5" fill="#4a3218"/>
                <path d="M15 19.5 q2 1.8 4 0" stroke="#4a3218" stroke-width="1.4" fill="none"/>
                <ellipse cx="10" cy="18" rx="1.9" ry="1.3" fill="#e8a0b4" opacity=".8"/><ellipse cx="24" cy="18" rx="1.9" ry="1.3" fill="#e8a0b4" opacity=".8"/>
              </svg>
            </span>`).join('')}
          ${steam(12)}
          <div class="fx mist" style="bottom:0;height:24%"></div>
        `,
      },
      {
        id: 'ramenalley', name: 'Midnight Ramen Alley', cls: 'wok-alley',
        scene: () => `
          ${L(86, 1, `
            <rect x="130" y="60" width="130" height="260" fill="#1c0d18"/>
            <rect x="540" y="40" width="130" height="280" fill="#1c0d18"/>
            ${windows(148, 90, 3, 5, 17, 21, 12, '#ffd98a', '#241020')}
            ${windows(558, 70, 3, 6, 17, 21, 12, '#ff9a5c', '#241020')}
            <rect x="166" y="150" width="26" height="96" rx="4" fill="#2a0f1f" stroke="#ff5d7a" stroke-width="2.4"/>
            ${[0, 1, 2].map((k) => `<rect x="172" y="${158 + k * 28}" width="15" height="17" fill="#ff5d7a" opacity=".9"><animate attributeName="opacity" values=".9;.3;.9" dur="${r(2, 4)}s" repeatCount="indefinite"/></rect>`).join('')}
            <rect x="606" y="150" width="26" height="76" rx="4" fill="#0f1f24" stroke="#3adcc8" stroke-width="2.4"/>
            ${[0, 1].map((k) => `<rect x="612" y="${158 + k * 30}" width="15" height="19" fill="#3adcc8" opacity=".9"><animate attributeName="opacity" values=".9;.35;.9" dur="${r(2.4, 4)}s" repeatCount="indefinite"/></rect>`).join('')}
            <path d="M260 320 L260 190 Q400 168 540 190 L540 320" fill="#160a12"/>
            <rect x="316" y="208" width="168" height="72" rx="8" fill="#2a0f1f" stroke="#ffb84d" stroke-width="3.4"/>
            <path d="M340 252 a28 18 0 0 0 120 0 Z" fill="#ffb84d"/>
            <path d="M356 244 q9 -20 14 -2 M382 242 q9 -22 14 -2 M408 244 q9 -20 14 -2 M434 244 q9 -18 13 -2" stroke="#ffb84d" stroke-width="4.4" fill="none"><animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite"/></path>
            <g transform="translate(492 186)">
              <path d="M0 12 q7 -14 16 -7 q9 -9 14 2 q9 0 7 10 l-37 0 Z" fill="#160a12"/>
              <path d="M32 7 q7 -7 5 -14" stroke="#160a12" stroke-width="3.4" fill="none"><animateTransform attributeName="transform" type="rotate" values="-10 32 7;12 32 7;-10 32 7" dur="2.6s" repeatCount="indefinite"/></path>
              <circle cx="10" cy="9" r="1.4" fill="#ffd98a"/><path d="M14 13 q3 2 6 0" stroke="#ffd98a" stroke-width="1.2" fill="none"/>
            </g>
            <path d="M0 320 L800 320 L800 302 Q400 292 0 304 Z" fill="#0c0510"/>
            <ellipse cx="400" cy="310" rx="170" ry="7" fill="#ffb84d" opacity=".14"/>
            <ellipse cx="180" cy="312" rx="40" ry="5" fill="#ff5d7a" opacity=".18"/>
            <ellipse cx="620" cy="312" rx="40" ry="5" fill="#3adcc8" opacity=".16"/>
          `)}
          ${lanterns(6)}
          ${steam(7)}
          ${rain(12)}
          ${sprinkle(4, 'noodle', () => `left:${r(2, 96)}%;--dur:${r(9, 14)}s;animation-delay:-${r(0, 12)}s;--sway:${r(-30, 30)}px;--rot:${r(120, 400)}deg;--op:.4`)}
        `,
      },
      {
        id: 'asteroids', name: 'The Dumpling Asteroid Belt', cls: 'wok-asteroids',
        scene: () => `
          ${stars(34, [0, 95])}
          ${H('left:10%;top:6%;width:150px', 150, 96, `
            <ellipse cx="75" cy="48" rx="46" ry="40" fill="#e8a13c"/>
            <ellipse cx="60" cy="36" rx="11" ry="8" fill="#c9822c"/><ellipse cx="90" cy="60" rx="8" ry="7" fill="#c9822c"/><ellipse cx="82" cy="30" rx="5" ry="4" fill="#c9822c"/>
            <ellipse cx="75" cy="48" rx="70" ry="16" fill="none" stroke="#ffd24a" stroke-width="5" transform="rotate(-16 75 48)"/>
            <circle cx="62" cy="46" r="3" fill="#2a1a08"/><circle cx="88" cy="46" r="3" fill="#2a1a08"/>
            <path d="M66 58 q9 7 18 0" stroke="#2a1a08" stroke-width="2.6" fill="none"/>
          `)}
          ${Array.from({ length: 6 }, (_, i) => `
            <span class="sp dumpling" style="left:${r(10, 84)}%;top:${r(16, 76)}%;--d:${r(6, 11)}s;animation-delay:-${r(0, 10)}s;width:${r(30, 58)}px">
              <svg viewBox="0 0 34 30">
                <path d="M4 21 q0 -15 13 -15 t13 15 q-13 6 -26 0 Z" fill="#e8d2b0"/>
                <ellipse cx="12" cy="14" rx="2.6" ry="2" fill="#c9ac82"/><ellipse cx="22" cy="17" rx="2" ry="1.6" fill="#c9ac82"/>
                <path d="M9 8 q2 -4 4 -1 M15 6 q2 -4 4 -1 M21 7 q2 -4 4 0" stroke="#c9ac82" stroke-width="2" fill="none"/>
                <circle cx="13" cy="16" r="1.4" fill="#4a3218"/><circle cx="21" cy="16" r="1.4" fill="#4a3218"/>
                ${i === 2 ? '<path d="M17 6 v-8 M17 -2 h8 v6 h-8" stroke="#d93a20" stroke-width="1.8" fill="#d93a20"/>' : ''}
                ${i === 4 ? '<path d="M13 19 q4 3 8 0" stroke="#4a3218" stroke-width="1.4" fill="none"/>' : '<path d="M14 20 h6" stroke="#4a3218" stroke-width="1.3"/>'}
              </svg>
            </span>`).join('')}
          <span class="sp comet" style="top:${r(12, 38)}%;--dur:${r(13, 20)}s;animation-delay:-${r(0, 16)}s">
            <svg viewBox="0 0 90 20"><path d="M0 10 Q40 2 74 8" stroke="#ff6a2c" stroke-width="3.4" fill="none" opacity=".8"/><path d="M8 13 Q44 8 74 11" stroke="#ffd24a" stroke-width="2.4" fill="none" opacity=".7"/><circle cx="78" cy="10" r="8" fill="#d93a20"/><circle cx="76" cy="8" r="2.4" fill="#ffb84d"/></svg>
          </span>
          <span class="sp chopsat" style="left:${r(55, 78)}%;top:${r(48, 68)}%;--d:${r(10, 16)}s">
            <svg viewBox="0 0 60 60"><rect x="27" y="6" width="5" height="48" rx="2.5" fill="#d9a86a"/><rect x="34" y="8" width="4" height="44" rx="2" fill="#c9985a"/><rect x="20" y="26" width="20" height="10" rx="2" fill="#7a4a20"/></svg>
          </span>
          ${starfaces(2, [30, 70])}
          ${sprinkle(7, 'noodle', () => `left:${r(2, 96)}%;--dur:${r(10, 16)}s;animation-delay:-${r(0, 15)}s;--sway:${r(-60, 60)}px;--rot:${r(180, 560)}deg;--op:.6`)}
        `,
      },
      {
        id: 'nebula', name: 'The Broth Nebula', cls: 'wok-nebula',
        scene: () => `
          ${stars(30, [0, 95])}
          ${H('left:50%;top:4%;width:210px;margin-left:-105px', 210, 210, `
            <g>
              <animateTransform attributeName="transform" type="rotate" from="0 105 105" to="360 105 105" dur="60s" repeatCount="indefinite"/>
              <circle cx="105" cy="105" r="100" fill="#f2e2c8" opacity=".13"/>
              <circle cx="105" cy="105" r="70" fill="#f2e2c8" opacity=".5"/>
              <path d="M105 105 m0 -55 a55 55 0 0 1 0 110 a42 42 0 0 0 0 -84 a30 30 0 0 1 0 60 a19 19 0 0 0 0 -38" fill="none" stroke="#e0447a" stroke-width="15" stroke-linecap="round"/>
            </g>
          `)}
          ${H('right:6%;top:38%;width:84px', 84, 54, `
            <ellipse cx="42" cy="27" rx="38" ry="23" fill="#f2e2c8"/>
            <ellipse cx="42" cy="27" rx="21" ry="13" fill="#ffd24a"/>
            <circle cx="36" cy="25" r="2" fill="#4a3218"/><circle cx="48" cy="25" r="2" fill="#4a3218"/>
            <path d="M38 31 q4 3 8 0" stroke="#4a3218" stroke-width="1.8" fill="none"/>
          `)}
          ${H('left:5%;top:52%;width:66px', 66, 44, `
            <ellipse cx="33" cy="22" rx="30" ry="18" fill="#f2e2c8"/>
            <ellipse cx="33" cy="22" rx="17" ry="10" fill="#ffd24a"/>
          `)}
          ${L(30, 1, `
            <path d="M0 256 Q200 232 400 252 T800 246 L800 320 L0 320 Z" fill="#3a1410" opacity=".92"/>
            <path d="M0 284 Q240 260 480 278 T800 274" stroke="#e8531c" stroke-width="5" fill="none" opacity=".6"/>
            <path d="M80 300 q34 -9 68 0 M320 306 q40 -11 80 0 M560 298 q34 -9 70 0" stroke="#ffb84d" stroke-width="3.4" fill="none" opacity=".5"/>
            ${[300, 400, 500].map((x, i) => `<circle cx="${x}" cy="${268 + i * 4}" r="4" fill="#ffd24a"><animate attributeName="opacity" values="1;.4;1" dur="${r(2, 3.6)}s" repeatCount="indefinite"/></circle>`).join('')}
            <path d="M300 268 L400 272 L500 276" stroke="#ffd24a" stroke-width="1.4" opacity=".5"/>
          `)}
          ${sprinkle(10, 'scallion', () => `left:${r(2, 96)}%;top:${r(10, 80)}%;--d:${r(3, 6)}s;animation-delay:-${r(0, 6)}s`)}
          ${sprinkle(6, 'noodle', () => `left:${r(2, 96)}%;--dur:${r(12, 18)}s;animation-delay:-${r(0, 16)}s;--sway:${r(-40, 40)}px;--rot:${r(120, 400)}deg;--op:.5`)}
        `,
      },
      {
        id: 'dragon', name: 'The Great Noodle Dragon', cls: 'wok-dragon',
        scene: () => `
          ${stars(20, [0, 55])}
          ${H('right:8%;top:5%;width:90px', 90, 90, `
            <circle cx="45" cy="45" r="38" fill="#ffd9a3"/>
            <circle cx="34" cy="36" r="7" fill="#e8b884" opacity=".8"/><circle cx="56" cy="54" r="9" fill="#e8b884" opacity=".7"/>
          `, 'moonglow')}
          <span class="sp noodledragon" style="top:${r(10, 24)}%;--dur:40s;animation-delay:-${r(0, 34)}s">
            <svg viewBox="0 0 340 110">
              <path d="M12 60 Q52 20 100 44 Q148 70 196 44 Q244 20 292 46" fill="none" stroke="#f2dfb8" stroke-width="24" stroke-linecap="round"/>
              <path d="M12 60 Q52 20 100 44 Q148 70 196 44 Q244 20 292 46" fill="none" stroke="#e0c898" stroke-width="24" stroke-linecap="round" stroke-dasharray="6 16"/>
              <path d="M12 60 Q52 20 100 44 Q148 70 196 44 Q244 20 292 46" fill="none" stroke="#d93a20" stroke-width="6" stroke-linecap="round" stroke-dasharray="3 24" opacity=".8"/>
              ${[48, 92, 140, 188, 236].map((x, i) => `<path d="M${x} ${[36, 28, 54, 48, 26][i]} l5 -16 l9 13" stroke="#d93a20" stroke-width="4.6" fill="none"/>`).join('')}
              <g>
                <path d="M280 42 q18 -20 44 -12 q13 7 9 22 q-4 18 -26 20 q-22 3 -34 -12 Z" fill="#d93a20"/>
                <circle cx="316" cy="52" r="3.4" fill="#1c0806"/><circle cx="317" cy="51" r="1.2" fill="#ffe9b3"/>
                <path d="M326 36 q10 -13 5 -22 M306 33 q0 -13 -10 -19" stroke="#e8a13c" stroke-width="3.6" fill="none"/>
                <path d="M332 58 q13 0 20 8 M330 63 q10 5 13 15" stroke="#d93a20" stroke-width="3" fill="none">
                  <animateTransform attributeName="transform" type="rotate" values="-8 330 60;10 330 60;-8 330 60" dur="1.8s" repeatCount="indefinite"/>
                </path>
                <circle cx="336" cy="34" r="7" fill="#ffd24a"><animate attributeName="r" values="7;9;7" dur="1.5s" repeatCount="indefinite"/></circle>
              </g>
              <path d="M104 58 q8 18 -4 36 M200 56 q8 18 -4 34" stroke="#f2dfb8" stroke-width="8" fill="none" stroke-linecap="round"/>
            </svg>
          </span>
          ${L(28, 1, `
            ${[160, 300, 440, 580].map((x) => `<ellipse cx="${x}" cy="${r(276, 308)}" rx="${r(50, 74)}" ry="${r(14, 22)}" fill="#3a1826" opacity=".9"/>`).join('')}
            ${torii(400, 320, 0.7, '#7a1408')}
          `)}
          ${lanterns(5)}
          ${starfaces(2, [28, 48])}
          ${sprinkle(7, 'noodle', () => `left:${r(2, 96)}%;--dur:${r(9, 14)}s;animation-delay:-${r(0, 13)}s;--sway:${r(-40, 40)}px;--rot:${r(140, 420)}deg;--op:.6`)}
        `,
      },
      {
        id: 'shrine', name: 'The Fortune Cookie Shrine', cls: 'wok-shrine',
        scene: () => `
          ${stars(14, [0, 26])}
          ${L(62, 1, `
            ${torii(400, 240, 1.15, '#7a1408')}
            <rect x="270" y="252" width="260" height="17" rx="5" fill="#4a2410"/>
            <rect x="300" y="222" width="200" height="34" rx="5" fill="#5a2c14"/>
            <g transform="translate(400 176)">
              <path d="M-72 34 Q-72 -30 0 -30 Q72 -30 72 34 Q34 18 0 38 Q-34 18 -72 34 Z" fill="#e8b060"/>
              <path d="M-72 34 Q-34 14 0 38 Q34 14 72 34 Q34 50 0 38 Q-34 50 -72 34 Z" fill="#c98a3c"/>
              <path d="M-50 6 q50 -25 100 0" stroke="#f2d29a" stroke-width="6" fill="none" opacity=".8"/>
              <path d="M-9 36 L-4 58 L9 56 L4 34 Z" fill="#fff8ec"/>
              <path d="M-6 45 h11" stroke="#d93a20" stroke-width="2.6"/>
              <ellipse cx="0" cy="4" rx="34" ry="18" fill="#ffe9b3" opacity=".25"><animate attributeName="opacity" values=".25;.5;.25" dur="3s" repeatCount="indefinite"/></ellipse>
            </g>
            <path d="M0 320 L800 320 L800 298 Q400 286 0 300 Z" fill="#1c0a08"/>
            ${[330, 366, 434, 470].map((x) => `<circle cx="${x}" cy="292" r="5.4" fill="#e8a13c"><animate attributeName="opacity" values="1;.55;1" dur="${r(2, 4)}s" repeatCount="indefinite"/></circle>`).join('')}
            ${stoneLantern(250, 306, 1.6, '#2a1210', '#ffb84d')}
            ${stoneLantern(550, 306, 1.6, '#2a1210', '#ffb84d')}
            <path d="M290 306 q5 -44 -5 -78 M510 306 q-5 -48 5 -82" stroke="#e8e0d0" stroke-width="3.4" fill="none" opacity=".55">
              <animate attributeName="opacity" values=".55;.2;.55" dur="4s" repeatCount="indefinite"/>
            </path>
          `)}
          ${sprinkle(11, 'fortune', () => `left:${r(6, 92)}%;--dur:${r(8, 14)}s;animation-delay:-${r(0, 13)}s;--sway:${r(-50, 50)}px;--rot:${r(100, 340)}deg`)}
          ${embers(10)}
        `,
      },
      {
        id: 'boba', name: 'The Boba Lagoon', cls: 'wok-boba',
        scene: () => `
          ${clouds(3, 'rgba(255,236,214,.85)', [3, 16])}
          ${L(60, 1, `
            <g>
              <path d="M300 130 L500 130 L482 320 L318 320 Z" fill="#f6ead0" opacity=".4"/>
              <path d="M300 130 L500 130 L495 168 L305 168 Z" fill="#f6ead0" opacity=".5"/>
              <rect x="290" y="116" width="220" height="20" rx="10" fill="#e0447a"/>
              <rect x="382" y="14" width="30" height="120" rx="13" fill="#e0447a" transform="rotate(16 397 74)"/>
              <path d="M388 20 l22 8 M382 42 l22 8 M376 64 l22 8" stroke="#fff" stroke-width="6" transform="rotate(16 397 74)"/>
              ${[[352, 250], [400, 282], [448, 244], [376, 300], [428, 296]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="#2c1408"/><circle cx="${x - 4}" cy="${y - 4}" r="3.4" fill="#5a3418"/>`).join('')}
              <path d="M318 200 q82 -22 164 0" stroke="#e0b884" stroke-width="5" fill="none" opacity=".8"/>
            </g>
            <path d="M0 244 Q200 228 400 240 T800 236 L800 320 L0 320 Z" fill="#c9985a" opacity="0"/>
          `)}
          ${L(34, 2, `
            <path d="M0 250 Q200 234 400 246 T800 242 L800 320 L0 320 Z" fill="#c9985a"/>
            <path d="M0 264 Q240 250 480 260 T800 256" stroke="#e0b884" stroke-width="6" fill="none" opacity=".8"/>
            ${[180, 620].map((x) => `<circle cx="${x}" cy="${r(276, 300)}" r="${r(14, 22)}" fill="#2c1408"/><circle cx="${x - 5}" cy="${r(270, 292)}" r="4" fill="#5a3418"/>`).join('')}
          `)}
          ${sprinkle(14, 'pearl', () => `left:${r(4, 94)}%;--s:${r(9, 17)}px;--dur:${r(8, 15)}s;animation-delay:-${r(0, 14)}s;--sway:${r(-24, 24)}px`)}
          ${steam(6)}
          ${starfaces(1, [8, 20])}
        `,
      },
    ],
  },

  // ————— PULL B — PIRATE RADIO ATOLL —————
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
          <div class="fx bigsun face" style="left:50%;margin-left:-70px;top:7%;--c1:#ffe9b3;--c2:#ff9a4c;--s:140px"></div>
          ${clouds(3, 'rgba(255,236,200,.8)', [3, 18])}
          ${L(50, 1, `
            <rect x="0" y="120" width="800" height="200" fill="#1c6b8a"/>
            <path d="M0 120 h800" stroke="#7ae0d0" stroke-width="3" opacity=".7"/>
            <path d="M60 152 q42 -9 92 0 M420 172 q52 -10 112 0 M600 146 q42 -9 92 0" stroke="#4aa8c0" stroke-width="5" fill="none" opacity=".8"/>
            <path d="M0 242 Q200 226 420 240 T800 236 L800 320 L0 320 Z" fill="#e8c88a"/>
            <path d="M140 270 q22 -6 46 0 M370 282 q28 -8 54 0 M590 272 q24 -6 48 0" stroke="#d9a860" stroke-width="4" fill="none"/>
            <circle cx="250" cy="292" r="7" fill="#ff8a5c"/><path d="M245 286 q5 -7 10 0" stroke="#c25a2c" stroke-width="2.4" fill="none"/>
            <path d="M540 288 a11 8 0 0 1 22 0 Z" fill="#f2e2c8"/><circle cx="547" cy="284" r="1.8" fill="#2a1a10"/>
            ${[300, 470].map((x) => `<circle cx="${x}" cy="${r(296, 308)}" r="4" fill="#ffd24a"><animate attributeName="opacity" values="1;.4;1" dur="${r(2, 3.4)}s" repeatCount="indefinite"/></circle>`).join('')}
          `)}
          ${L(60, 2, `
            <g transform="rotate(-4 400 220)">
              <path d="M240 240 Q400 302 570 236 L548 166 Q400 216 262 170 Z" fill="#6a3a1c"/>
              <path d="M262 190 Q400 234 548 186 M256 208 Q400 254 556 204" stroke="#4a2410" stroke-width="5.4" fill="none"/>
              ${[300, 360, 420, 480].map((x) => `<circle cx="${x}" cy="218" r="6.4" fill="#2a160a"/><circle cx="${x - 2}" cy="216" r="2" fill="#ffd24a" opacity=".7"/>`).join('')}
              <rect x="390" y="24" width="11" height="158" fill="#4a2410"/>
              <rect x="298" y="62" width="10" height="122" fill="#4a2410" transform="rotate(-14 298 62)"/>
              <path d="M401 36 Q474 64 401 106 Z" fill="#f2e2c8">
                <animateTransform attributeName="transform" type="skewX" values="0;8;0;-5;0" dur="3s" repeatCount="indefinite"/>
              </path>
              <path d="M401 42 l60 24 M401 58 l52 18" stroke="#d9b88a" stroke-width="2.6" opacity=".8"/>
              <rect x="380" y="8" width="52" height="28" fill="#1c1208"/>
              <circle cx="397" cy="19" r="7" fill="#f2e2c8"/><circle cx="397" cy="19" r="3" fill="#1c1208"/>
              <path d="M389 30 l-9 9 M405 30 l9 9" stroke="#f2e2c8" stroke-width="3.4"/>
              <path d="M432 12 l26 7 -26 8 Z" fill="#c04828"><animateTransform attributeName="transform" type="skewY" values="0;6;0;-4;0" dur="1.6s" repeatCount="indefinite"/></path>
              <path d="M240 240 q-32 -5 -47 -26 q24 -7 47 4 Z" fill="#6a3a1c"/>
            </g>
            <path d="M120 320 q-7 -116 26 -190 q11 36 2 82 q24 -52 55 -66 q-8 42 -40 82 q32 -19 51 -8 q-32 27 -68 42 q-7 30 -9 58 Z" fill="#2c8a54"/>
            <ellipse cx="146" cy="316" rx="48" ry="11" fill="#1c6b3c"/>
            <path d="M660 320 q6 -96 -22 -158 q-10 32 0 72 q-22 -44 -50 -56 q8 36 38 70 q-30 -16 -47 -6 q28 22 60 34 q6 22 8 44 Z" fill="#249150"/>
          `)}
          ${sprinkle(7, 'radiowave', () => `left:${r(40, 60)}%;top:${r(2, 20)}%;--d:${r(2, 4)}s;--s:${r(14, 30)}px;animation-delay:-${r(0, 4)}s`)}
          ${sprinkle(4, 'gull', () => `left:${r(8, 80)}%;top:${r(6, 24)}%;--d:${r(3, 5)}s;animation-delay:-${r(0, 4)}s`)}
          ${sprinkle(3, 'crab', () => `left:${r(8, 80)}%;bottom:${r(2, 7)}%;--dur:${r(16, 26)}s;animation-delay:-${r(0, 20)}s`)}
          ${sprinkle(5, 'ripple', () => `left:${r(8, 88)}%;top:${r(46, 58)}%;--d:${r(3, 6)}s`)}
        `,
      },
      {
        id: 'lighthouse', name: 'The Volcano Lighthouse', cls: 'atoll-light',
        scene: () => `
          ${stars(16, [0, 26])}
          ${L(48, 1, `
            <rect x="0" y="150" width="800" height="170" fill="#16394a"/>
            <path d="M0 150 h800" stroke="#ff9a5c" stroke-width="3" opacity=".85"/>
            <path d="M80 180 q52 -10 104 0 M540 190 q60 -12 120 0" stroke="#2c5a6c" stroke-width="6" fill="none"/>
            <path d="M180 320 L260 150 L340 320 Z" fill="#241016"/>
            <path d="M540 320 L610 190 L690 320 Z" fill="#241016"/>
          `)}
          ${L(78, 2, `
            <path d="M320 320 L352 108 L448 108 L480 320 Z" fill="#3a1430"/>
            <path d="M334 246 h132 M344 178 h114" stroke="#57204a" stroke-width="11"/>
            <path d="M348 108 h104 l-9 -24 h-86 Z" fill="#241020"/>
            <rect x="368" y="56" width="64" height="34" fill="#ffe9b3">
              <animate attributeName="opacity" values="1;.6;1" dur="1.8s" repeatCount="indefinite"/>
            </rect>
            <path d="M362 56 h78 M362 90 h78 M382 56 v34 M418 56 v34" stroke="#241020" stroke-width="4.4"/>
            <path d="M358 50 L400 24 L442 50 Z" fill="#c23b52"/>
            <circle cx="400" cy="20" r="5.4" fill="#ff3b3b"><animate attributeName="opacity" values="1;.2;1" dur="1.3s" repeatCount="indefinite"/></circle>
            <path d="M380 122 q-64 96 -34 198 M424 122 q44 104 18 198" stroke="#ff6a2c" stroke-width="8" fill="none">
              <animate attributeName="opacity" values="1;.5;1" dur="2.4s" repeatCount="indefinite"/>
            </path>
            <path d="M400 130 q-6 90 4 190" stroke="#ffb84d" stroke-width="4" fill="none" opacity=".7">
              <animate attributeName="opacity" values=".7;.3;.7" dur="3s" repeatCount="indefinite"/>
            </path>
            <path d="M320 288 q-38 8 -58 30 q30 7 58 -6 Z" fill="#3a1430"/>
            <path d="M480 288 q38 8 58 30 q-30 7 -58 -6 Z" fill="#3a1430"/>
          `)}
          <div class="fx beam" style="left:50%;margin-left:-170px;top:-96px"></div>
          ${embers(12)}
          ${sprinkle(6, 'radiowave', () => `left:${r(40, 60)}%;top:${r(0, 14)}%;--d:${r(2, 4)}s;--s:${r(14, 30)}px;animation-delay:-${r(0, 4)}s`)}
          ${sprinkle(4, 'ripple', () => `left:${r(6, 90)}%;top:${r(50, 62)}%;--d:${r(3, 6)}s`)}
        `,
      },
      {
        id: 'parrots', name: 'The Parrot Congress', cls: 'atoll-parrots',
        scene: () => `
          <div class="fx bigsun face" style="right:8%;top:4%;--c1:#fff6d0;--c2:#ffd24a;--s:100px"></div>
          ${clouds(4, 'rgba(255,255,255,.9)', [4, 20])}
          ${L(72, 1, `
            <path d="M140 320 q-11 -146 32 -220 q13 42 0 100 q31 -62 73 -80 q-10 50 -52 98 q42 -23 67 -10 q-40 31 -88 48 q-8 33 -10 64 Z" fill="#2c9a5c"/>
            <path d="M660 320 q11 -136 -28 -204 q-12 40 0 94 q-29 -58 -69 -74 q10 46 50 92 q-40 -21 -63 -8 q38 29 82 44 q8 29 10 56 Z" fill="#249150"/>
            <path d="M0 320 L800 320 L800 292 Q400 278 0 294 Z" fill="#e8c88a"/>
          `)}
          ${L(58, 2, `
            <rect x="250" y="146" width="300" height="15" rx="7" fill="#8a5a2a"/>
            <rect x="286" y="208" width="228" height="15" rx="7" fill="#8a5a2a"/>
            <rect x="322" y="270" width="156" height="15" rx="7" fill="#8a5a2a"/>
            <path d="M264 146 v174 M536 146 v174" stroke="#6a4420" stroke-width="9"/>
            <g transform="translate(400 92)">
              <circle r="36" fill="none" stroke="#6a4420" stroke-width="10"/>
              ${[0, 45, 90, 135].map((a) => `<line x1="${-45 * Math.cos(a * Math.PI / 180)}" y1="${-45 * Math.sin(a * Math.PI / 180)}" x2="${45 * Math.cos(a * Math.PI / 180)}" y2="${45 * Math.sin(a * Math.PI / 180)}" stroke="#6a4420" stroke-width="8"/>`).join('')}
              <circle r="9" fill="#4a2c12"/>
            </g>
            ${[[286, 134], [352, 134], [452, 134], [516, 134], [316, 196], [400, 196], [478, 196], [354, 258], [446, 258]].map(([x, y], i) => `
              <g>
                <ellipse cx="${x}" cy="${y}" rx="11" ry="14" fill="${['#e83a4e', '#2fb56b', '#3a8fd9', '#ffb84d', '#8f6fdc'][i % 5]}"/>
                <circle cx="${x}" cy="${y - 15}" r="7.5" fill="${['#e83a4e', '#2fb56b', '#3a8fd9', '#ffb84d', '#8f6fdc'][i % 5]}"/>
                <circle cx="${x + 2.6}" cy="${y - 16}" r="1.7" fill="#1c1208"/>
                <path d="M${x + 6.4} ${y - 14} q6.4 1 4.3 6.4 q-4.3 -1 -4.3 -3.2 Z" fill="#ffd24a"/>
                <path d="M${x - 8.5} ${y - 2} q-6.4 6.4 -2 15" stroke="${['#c22a3c', '#1f8a4e', '#2a6ba8', '#d9932c', '#6f4fc0'][i % 5]}" stroke-width="3.6" fill="none"/>
                ${i === 5 ? `<rect x="${x - 17}" y="${y - 32}" width="34" height="10" rx="4" fill="#2a1608"/><path d="M${x} ${y - 32} v-9" stroke="#2a1608" stroke-width="3.4"/><path d="M${x + 12} ${y - 6} l14 -4" stroke="#5a3a1c" stroke-width="3.4"/>` : ''}
                <animateTransform attributeName="transform" type="rotate" values="-2 ${x} ${y};2.4 ${x} ${y};-2 ${x} ${y}" dur="${r(1.8, 3.4)}s" repeatCount="indefinite"/>
              </g>`).join('')}
          `)}
          ${sprinkle(11, 'feather', (i) => `left:${r(0, 100)}%;--c:${['#e83a4e', '#2fb56b', '#3a8fd9', '#ffb84d'][i % 4]};--dur:${r(9, 16)}s;animation-delay:-${r(0, 15)}s;--sway:${r(-55, 55)}px;--rot:${r(120, 420)}deg`)}
          ${sprinkle(5, 'radiowave', () => `left:${r(40, 60)}%;top:${r(2, 16)}%;--d:${r(2, 4)}s;--s:${r(12, 24)}px;animation-delay:-${r(0, 4)}s`)}
          ${sprinkle(3, 'gull', () => `left:${r(8, 84)}%;top:${r(3, 16)}%;--d:${r(3, 5)}s;animation-delay:-${r(0, 4)}s`)}
        `,
      },
      {
        id: 'kraken', name: "The Kraken's Turntables", cls: 'atoll-kraken',
        scene: () => `
          ${stars(12, [0, 22])}
          ${L(54, 1, `
            <rect x="0" y="110" width="800" height="210" fill="#123a52"/>
            <path d="M0 110 h800" stroke="#7ae0d0" stroke-width="3" opacity=".6"/>
            <g transform="translate(400 250)">
              ${[0, 1, 2].map((i) => `<ellipse rx="${140 - i * 40}" ry="${36 - i * 10}" fill="none" stroke="#0c2a3c" stroke-width="${15 - i * 4}" transform="rotate(${i * 9})"><animateTransform attributeName="transform" type="rotate" from="${i * 9} 0 0" to="${360 + i * 9} 0 0" dur="${22 - i * 6}s" repeatCount="indefinite"/></ellipse>`).join('')}
            </g>
          `)}
          ${L(68, 2, `
            ${[[260, 1.3, -5], [420, 1.6, 5], [560, 1.1, -3]].map(([x, s, tilt]) => `
              <g transform="rotate(${tilt} ${x} 320)">
                <path d="M${x} 320 Q${x - 28 * s} ${320 - 95 * s} ${x - 11 * s} ${320 - 158 * s} Q${x + 2 * s} ${320 - 200 * s} ${x + 32 * s} ${320 - 185 * s}" fill="none" stroke="#6a2c5a" stroke-width="${28 * s}" stroke-linecap="round">
                  <animateTransform attributeName="transform" type="rotate" values="-3 ${x} 320;4 ${x} 320;-3 ${x} 320" dur="${r(5, 8)}s" repeatCount="indefinite" additive="sum"/>
                </path>
                ${[0.28, 0.46, 0.64, 0.8].map((f) => `<circle cx="${x - 20 * s + f * 24 * s}" cy="${320 - 158 * s * f}" r="${5.5 * s}" fill="#8f4a7c"><animateTransform attributeName="transform" type="rotate" values="-3 ${x} 320;4 ${x} 320;-3 ${x} 320" dur="${r(5, 8)}s" repeatCount="indefinite" additive="sum"/></circle>`).join('')}
              </g>`).join('')}
            <g>
              <rect x="356" y="96" width="88" height="52" rx="9" fill="#241640"/>
              <circle cx="382" cy="122" r="16" fill="#0c0a20"/><circle cx="382" cy="122" r="6" fill="#3adcc8"><animate attributeName="r" values="6;9;6" dur="1s" repeatCount="indefinite"/></circle>
              <circle cx="418" cy="122" r="16" fill="#0c0a20"/><circle cx="418" cy="122" r="6" fill="#ff4f9e"><animate attributeName="r" values="9;6;9" dur="1s" repeatCount="indefinite"/></circle>
              <rect x="392" y="102" width="16" height="8" rx="3" fill="#ffd24a"/>
              <animateTransform attributeName="transform" type="rotate" values="-3 400 122;3 400 122;-3 400 122" dur="2.2s" repeatCount="indefinite"/>
            </g>
          `)}
          ${Array.from({ length: 3 }, (_, i) => `
            <span class="sp vinyl" style="left:${[20, 48, 72][i]}%;top:${r(16, 34)}%;--d:${r(3, 5)}s;--spin:${r(2, 4)}s;--c:${['#e0447a', '#3adcc8', '#ffd24a'][i]}"><i></i></span>`).join('')}
          ${bubbles(12)}
          ${sprinkle(7, 'radiowave', () => `left:${r(30, 70)}%;top:${r(4, 26)}%;--d:${r(2, 4)}s;--s:${r(14, 26)}px;animation-delay:-${r(0, 4)}s`)}
        `,
      },
      {
        id: 'bottles', name: 'Message-in-a-Bottle Bay', cls: 'atoll-bottles',
        scene: () => `
          <div class="fx bigsun" style="left:10%;top:5%;--c1:#fff6d0;--c2:#ffb84d;--s:120px"></div>
          ${clouds(3, 'rgba(255,246,214,.85)', [3, 16])}
          ${L(54, 1, `
            <rect x="0" y="120" width="800" height="200" fill="#2c8aa8"/>
            <path d="M0 120 h800" stroke="#ffe9b3" stroke-width="3.4" opacity=".85"/>
            <path d="M80 162 q52 -10 104 0 M320 188 q62 -12 124 0 M560 158 q58 -10 116 0" stroke="#4ab8d0" stroke-width="6" fill="none" opacity=".9"/>
          `)}
          ${L(62, 2, `
            <g transform="rotate(5 420 210)">
              <path d="M330 240 q0 -76 48 -104 l0 -20 q-9 -4 -9 -15 l66 0 q0 11 -9 15 l0 20 q48 28 48 104 q0 50 -72 50 q-72 0 -72 -50 Z" fill="#7ac8b8" opacity=".9"/>
              <rect x="392" y="86" width="26" height="20" rx="4" fill="#8a5a2a"/>
              <rect x="356" y="176" width="96" height="64" rx="7" fill="#e8d5ae"/>
              <rect x="374" y="194" width="28" height="46" rx="3" fill="#6a3a1c"/>
              <circle cx="396" cy="218" r="2.8" fill="#ffd24a"/>
              <rect x="412" y="194" width="28" height="22" rx="3" fill="#ffe9b3"><animate attributeName="opacity" values="1;.6;1" dur="3s" repeatCount="indefinite"/></rect>
              <path d="M412 205 h28 M426 194 v22" stroke="#8a5a2a" stroke-width="2.6"/>
              <path d="M338 162 q60 -20 132 0" stroke="#5aa896" stroke-width="4.4" fill="none" opacity=".85"/>
              <path d="M356 240 q52 12 96 0" stroke="#c9b88a" stroke-width="4" fill="none"/>
            </g>
          `)}
          ${Array.from({ length: 5 }, (_, i) => `
            <span class="sp bottle" style="left:${[8, 24, 44, 64, 80][i]}%;top:${r(46, 64)}%;--d:${r(3, 5)}s;animation-delay:-${r(0, 4)}s">
              <svg viewBox="0 0 26 40">
                <path d="M9 12 L9 4 Q9 1 13 1 Q17 1 17 4 L17 12 Q23 16 23 26 Q23 38 13 38 Q3 38 3 26 Q3 16 9 12 Z" fill="#8fd8c8" opacity=".9"/>
                <rect x="10" y="0" width="6" height="6" rx="2" fill="#8a5a2a"/>
                <rect x="8" y="20" width="10" height="13" rx="2" fill="#f2e2c8" transform="rotate(-8 13 26)"/>
                <path d="M10 24 h6 M10 27 h6" stroke="#b3862a" stroke-width="1.3" transform="rotate(-8 13 26)"/>
                <path d="M6 16 q3 -4 5 -5" stroke="#dff6f0" stroke-width="2" fill="none" opacity=".8"/>
              </svg>
            </span>`).join('')}
          ${sprinkle(6, 'radiowave', () => `left:${r(10, 84)}%;top:${r(30, 52)}%;--d:${r(2.4, 4.4)}s;--s:${r(12, 22)}px;animation-delay:-${r(0, 4)}s`)}
          ${sprinkle(4, 'gull', () => `left:${r(10, 86)}%;top:${r(5, 20)}%;--d:${r(3, 5)}s;animation-delay:-${r(0, 4)}s`)}
          ${sprinkle(6, 'ripple', () => `left:${r(6, 90)}%;top:${r(46, 66)}%;--d:${r(3, 6)}s`)}
        `,
      },
      {
        id: 'skull', name: 'The Skull Cave Studio', cls: 'atoll-skull',
        scene: () => `
          ${stars(22, [0, 32])}
          ${H('right:6%;top:3%;width:90px', 90, 90, `<circle cx="45" cy="45" r="38" fill="#f4f0dc"/><circle cx="32" cy="36" r="7" fill="#d8d2b4" opacity=".8"/><circle cx="58" cy="56" r="9" fill="#d8d2b4" opacity=".7"/>`, 'moonglow')}
          ${L(50, 1, `
            <rect x="0" y="150" width="800" height="170" fill="#14294a"/>
            <path d="M0 150 h800" stroke="#8fb8d8" stroke-width="2.4" opacity=".6"/>
            <path d="M340 190 q60 8 120 0 l-8 30 q-52 8 -104 0 Z" fill="#e8f0f8" opacity=".14"/>
          `)}
          ${L(74, 2, `
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
            ${[248, 552].map((x) => `
              <rect x="${x - 3}" y="240" width="6" height="52" fill="#4a3014"/>
              <path d="M${x} 240 q-8 -14 0 -24 q8 10 0 24 Z" fill="#ff8a3c"><animate attributeName="opacity" values="1;.55;1" dur="${r(0.8, 1.4)}s" repeatCount="indefinite"/></path>`).join('')}
          `)}
          ${sprinkle(8, 'radiowave', () => `left:${r(30, 70)}%;top:${r(4, 28)}%;--d:${r(2, 4)}s;--s:${r(14, 30)}px;animation-delay:-${r(0, 4)}s`)}
          ${sprinkle(4, 'ripple', () => `left:${r(6, 90)}%;top:${r(46, 58)}%;--d:${r(3, 6)}s`)}
          ${bubbles(5)}
        `,
      },
      {
        id: 'storm', name: 'The Hurricane Dancefloor', cls: 'atoll-storm',
        scene: () => `
          <div class="fx lightning"></div>
          ${L(56, 1, `
            ${[[200, 30, 120], [420, 16, 150], [640, 36, 110]].map(([x, y, w]) => `
              <ellipse cx="${x}" cy="${y}" rx="${w}" ry="32" fill="#2c3450"/>
              <ellipse cx="${x + 44}" cy="${y + 16}" rx="${w * 0.8}" ry="27" fill="#222a44"/>`).join('')}
            <path d="M370 60 l-24 52 h19 l-29 62 l48 -43 h-19 l33 -55 Z" fill="#ffe06a">
              <animate attributeName="opacity" values="0;0;1;0;1;0;0" keyTimes="0;.86;.88;.9;.93;.96;1" dur="4s" repeatCount="indefinite"/>
            </path>
          `)}
          ${L(50, 2, `
            <rect x="0" y="110" width="800" height="210" fill="#1c3a54"/>
            <path d="M0 190 Q140 120 280 185 Q340 215 400 180 Q480 130 570 185 Q680 245 800 175 L800 320 L0 320 Z" fill="#254a68"/>
            <path d="M0 190 Q140 120 280 185 Q340 215 400 180 Q480 130 570 185 Q680 245 800 175" stroke="#8fd8e8" stroke-width="8" fill="none">
              <animate attributeName="d" values="M0 190 Q140 120 280 185 Q340 215 400 180 Q480 130 570 185 Q680 245 800 175;M0 180 Q140 235 280 178 Q340 145 400 185 Q480 228 570 180 Q680 128 800 190;M0 190 Q140 120 280 185 Q340 215 400 180 Q480 130 570 185 Q680 245 800 175" dur="3.6s" repeatCount="indefinite"/>
            </path>
            ${[240, 520].map((x) => `<path d="M${x} 208 q16 -10 32 0 q-16 12 -32 0 Z" fill="#eef4f8" opacity=".7"><animate attributeName="opacity" values=".7;.3;.7" dur="1.8s" repeatCount="indefinite"/></path>`).join('')}
            <g>
              <path d="M330 196 Q400 224 476 194 L462 158 Q400 180 344 162 Z" fill="#4a2410"/>
              <path d="M340 178 Q400 200 466 176" stroke="#2a160a" stroke-width="4" fill="none"/>
              <rect x="394" y="88" width="9" height="86" fill="#2a160a"/>
              <path d="M403 96 Q452 116 403 146 Z" fill="#ffd24a"><animateTransform attributeName="transform" type="skewX" values="0;12;0;-7;0" dur="1s" repeatCount="indefinite"/></path>
              <circle cx="398" cy="82" r="6.4" fill="#ff3b3b"><animate attributeName="opacity" values="1;.3;1" dur="0.9s" repeatCount="indefinite"/></circle>
              <animateTransform attributeName="transform" type="rotate" values="-9 400 190;8 400 190;-9 400 190" dur="2.8s" repeatCount="indefinite"/>
            </g>
          `)}
          ${rain(20)}
          ${sprinkle(6, 'radiowave', () => `left:${r(38, 62)}%;top:${r(14, 34)}%;--d:${r(1.6, 3)}s;--s:${r(12, 24)}px;animation-delay:-${r(0, 3)}s`)}
        `,
      },
      {
        id: 'antenna', name: 'The Treasure Antenna', cls: 'atoll-antenna',
        scene: () => `
          <div class="fx bigsun" style="left:50%;margin-left:-65px;top:9%;--c1:#fff0b3;--c2:#ffb84d;--s:130px"></div>
          ${clouds(3, 'rgba(255,224,170,.7)', [3, 16])}
          ${L(58, 1, `
            <path d="M0 320 L800 320 L800 264 Q400 244 0 268 Z" fill="#8a5a9c"/>
            <path d="M110 320 Q400 122 690 320 Z" fill="#e8b03c"/>
            ${Array.from({ length: 26 }, () => { const x = r(240, 560), y = r(196, 300); return `<circle cx="${x}" cy="${y}" r="${r(6, 12)}" fill="#ffd24a" stroke="#c2822c" stroke-width="2"/>`; }).join('')}
            <path d="M310 244 h18 v-28 h-18 Z M328 216 a9 9 0 0 1 -18 0" fill="#ffe9b3" stroke="#c2822c" stroke-width="2.4"/>
            <path d="M466 234 l11 -20 l11 20 M462 234 h30 l-5 17 h-21 Z" fill="#ff5d7a" stroke="#c22a4c" stroke-width="2.4"/>
            <path d="M388 196 l9 -16 l9 9 l9 -9 l9 16 Z" fill="#ffd24a" stroke="#c2822c" stroke-width="2.6"/>
            <circle cx="352" cy="270" r="4" fill="#fff" opacity=".9"><animate attributeName="opacity" values=".9;.2;.9" dur="1.4s" repeatCount="indefinite"/></circle>
            <circle cx="472" cy="284" r="4" fill="#fff" opacity=".9"><animate attributeName="opacity" values=".2;.9;.2" dur="1.8s" repeatCount="indefinite"/></circle>
          `)}
          ${L(80, 2, `
            <path d="M376 90 L424 90 L456 320 L344 320 Z" fill="none" stroke="#6a3a1c" stroke-width="9"/>
            <path d="M362 180 h76 M352 255 h96 M378 90 L446 320 M422 90 L354 320" stroke="#6a3a1c" stroke-width="6.4"/>
            <rect x="382" y="52" width="36" height="42" rx="7" fill="#8a4a2c"/>
            <circle cx="400" cy="34" r="9" fill="#ff3b3b"><animate attributeName="opacity" values="1;.25;1" dur="1.4s" repeatCount="indefinite"/></circle>
            <line x1="400" y1="52" x2="400" y2="20" stroke="#6a3a1c" stroke-width="4.4"/>
            <g transform="translate(434 80)"><path d="M0 0 q9 -13 22 -9 q7 -9 15 -4 q9 -2 9 7 l-46 6 Z" fill="#f2e8d0"/><circle cx="9" cy="-4" r="1.6" fill="#2a1a10"/><path d="M15 4 l-2 7 M22 4 l2 7" stroke="#d9903c" stroke-width="2.2"/></g>
          `)}
          ${sprinkle(11, 'coin', () => `left:${r(24, 74)}%;--dur:${r(6, 12)}s;animation-delay:-${r(0, 11)}s;--sway:${r(-30, 30)}px;--rot:${r(120, 400)}deg`)}
          ${sprinkle(9, 'radiowave', () => `left:${r(40, 60)}%;top:${r(0, 16)}%;--d:${r(2, 4)}s;--s:${r(14, 34)}px;animation-delay:-${r(0, 4)}s`)}
        `,
      },
    ],
  },

  // ————— LEGS B — YETI SKI RESORT —————
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
          <div class="fx bigsun" style="right:10%;top:4%;--c1:#fff8e0;--c2:#ffe9a3;--s:80px"></div>
          ${clouds(4, 'rgba(255,255,255,.95)', [4, 22])}
          ${L(66, 1, `
            <path d="M0 320 L0 190 L130 86 L250 210 L400 56 L550 206 L670 106 L800 240 L800 320 Z" fill="#f4fafd"/>
            <path d="M130 86 L94 128 L130 122 L164 130 Z M400 56 L364 102 L400 96 L438 104 Z M670 106 L640 142 L670 136 L702 144 Z" fill="#8ec8ec"/>
            ${pines(800, 320, 16, '#2c6b8a', 50, 100, 1, '#f4fafd')}
          `)}
          ${L(82, 2, `
            <path d="M170 320 L190 116 M630 320 L610 110 M186 150 L246 116 M614 144 L554 112" stroke="#4a3a2a" stroke-width="11"/>
            <path d="M146 148 L234 148 M566 140 L654 140" stroke="#4a3a2a" stroke-width="9"/>
            <path d="M0 176 Q400 236 800 160" stroke="#2a2018" stroke-width="5.4" fill="none"/>
            ${[[266, 212, true], [400, 234, true], [534, 204, false]].map(([x, y, hasYeti]) => `
              <g>
                <line x1="${x}" y1="${y - 44}" x2="${x}" y2="${y}" stroke="#2a2018" stroke-width="5.4"/>
                <rect x="${x - 28}" y="${y}" width="56" height="9" rx="4" fill="#c23b52"/>
                <rect x="${x - 26}" y="${y + 9}" width="52" height="28" rx="6" fill="#e0447a"/>
                ${hasYeti ? `
                  <circle cx="${x}" cy="${y + 2}" r="14" fill="#f4fafd"/>
                  <circle cx="${x - 4.4}" cy="${y}" r="2" fill="#1c3348"/><circle cx="${x + 4.4}" cy="${y}" r="2" fill="#1c3348"/>
                  <path d="M${x - 4.4} ${y + 6.5} q4.4 3.4 8.8 0" stroke="#1c3348" stroke-width="1.8" fill="none"/>
                  <rect x="${x - 13}" y="${y - 18}" width="26" height="9" rx="4.4" fill="#3a8fd9"/>
                  <circle cx="${x}" cy="${y - 20}" r="4.4" fill="#ffd24a"/>
                  <path d="M${x - 7.5} ${y + 37} l-3.4 13 M${x + 7.5} ${y + 37} l3.4 13" stroke="#c23b52" stroke-width="3.6"/>
                  <path d="M${x - 15} ${y + 52} h11 M${x + 4.4} ${y + 52} h11" stroke="#3a8fd9" stroke-width="3.6"/>` : ''}
                <animateTransform attributeName="transform" type="rotate" values="-2.4 ${x} ${y - 44};2.8 ${x} ${y - 44};-2.4 ${x} ${y - 44}" dur="${r(3, 5)}s" repeatCount="indefinite"/>
              </g>`).join('')}
            <path d="M0 320 L800 320 L800 292 Q400 276 0 294 Z" fill="#eef7fc"/>
            <g>
              <rect x="256" y="240" width="100" height="56 " rx="7" fill="#8a5a3a"/>
              <path d="M242 246 L306 204 L370 246 Z" fill="#5a3a22"/>
              <rect x="280" y="262" width="22" height="34" rx="3" fill="#4a2c16"/>
              <rect x="314" y="262" width="24" height="20" rx="3" fill="#ffd98a"><animate attributeName="opacity" values="1;.6;1" dur="3.4s" repeatCount="indefinite"/></rect>
              <path d="M348 212 q5 -20 -4 -34" stroke="#dfe8f2" stroke-width="7" fill="none" opacity=".85"/>
              ${[262, 286, 310, 334].map((x, i) => `<path d="M${x} 240 l7 -9 l7 9 Z" fill="${['#e0447a', '#ffd24a', '#3adcc8', '#8f6fdc'][i]}"/>`).join('')}
            </g>
          `)}
          ${snowfall(22)}
        `,
      },
      {
        id: 'blackdiamond', name: 'The Black Diamond Run', cls: 'yeti-diamond',
        scene: () => `
          ${clouds(3, 'rgba(255,255,255,.95)', [2, 14])}
          ${L(100, 1, `
            <path d="M0 0 L800 190 L800 320 L0 320 Z" fill="#f4fafd"/>
            <path d="M0 44 L800 234 M0 96 L800 276" stroke="#dceef8" stroke-width="18"/>
            ${[[140, 90], [280, 130], [420, 172], [560, 212], [700, 252]].map(([x, y], i) => `
              <g transform="rotate(12 ${x} ${y})">
                <line x1="${x}" y1="${y - 34}" x2="${x}" y2="${y}" stroke="#e8f0f6" stroke-width="4.4"/>
                <path d="M${x} ${y - 34} h20 l-6 8 l6 8 h-20 Z" fill="${i % 2 ? '#e0447a' : '#3a8fd9'}">
                  <animateTransform attributeName="transform" type="skewX" values="0;9;0;-6;0" dur="${r(1.2, 2.2)}s" repeatCount="indefinite"/>
                </path>
              </g>`).join('')}
            ${pines(140, 320, 3, '#2c6b8a', 40, 76, 1, '#f4fafd')}
            <path d="M690 60 L742 60 L716 22 Z" fill="#dceef8"/>
            <g transform="rotate(9 400 84)"><rect x="360" y="54" width="80" height="52" rx="8" fill="#1c3348"/><path d="M400 64 l15 24 h-30 Z" fill="#f4fafd"/><text x="400" y="98" text-anchor="middle" font-family="monospace" font-size="10.5" fill="#f4fafd">DBL DIAMOND</text></g>
          `)}
          <span class="sp skiyeti" style="--dur:7.5s;animation-delay:-${r(0, 7)}s">
            <svg viewBox="0 0 60 56">
              <circle cx="26" cy="14" r="11" fill="#eef4f8"/>
              <circle cx="23" cy="13" r="1.8" fill="#1c3348"/><circle cx="30" cy="13" r="1.8" fill="#1c3348"/>
              <ellipse cx="26" cy="17.5" rx="2.6" ry="1.8" fill="#ff9ab8"/>
              <rect x="14" y="0" width="24" height="8" rx="4" fill="#e0447a"/><circle cx="26" cy="-2" r="4" fill="#ffd24a"/>
              <ellipse cx="28" cy="34" rx="14" ry="15" fill="#eef4f8"/>
              <path d="M40 28 q12 4 16 -4" stroke="#e0447a" stroke-width="5" stroke-linecap="round" fill="none">
                <animate attributeName="d" values="M40 28 q12 4 16 -4;M40 28 q14 -2 18 -10;M40 28 q12 4 16 -4" dur="0.9s" repeatCount="indefinite"/>
              </path>
              <path d="M18 46 l-6 8 M36 44 l4 9" stroke="#c23b52" stroke-width="4.4"/>
              <path d="M2 56 q28 8 56 -2" stroke="#3a8fd9" stroke-width="4" stroke-linecap="round" fill="none"/>
            </svg>
          </span>
          ${sprinkle(9, 'spray', () => `left:${r(10, 80)}%;top:${r(28, 76)}%;--d:${r(1, 2.2)}s;--s:${r(10, 24)}px;animation-delay:-${r(0, 2)}s`)}
          ${snowfall(20)}
        `,
      },
      {
        id: 'apresski', name: 'Après-Ski Disco', cls: 'yeti-disco',
        scene: () => `
          <div class="fx discoball"><i></i></div>
          ${L(70, 1, `
            ${[-60, -20, 20, 60].map((a) => `<path d="M400 24 L${400 + 340 * Math.sin(a * Math.PI / 180)} ${24 + 340 * Math.cos(a * Math.PI / 180)}" stroke="#e8ddf6" stroke-width="26" opacity=".14"><animate attributeName="opacity" values=".14;.3;.14" dur="${r(1.6, 3)}s" repeatCount="indefinite"/></path>`).join('')}
            <path d="M0 320 L0 172 L400 108 L800 172 L800 320 Z" fill="#3a2456"/>
            <path d="M0 172 L400 108 L800 172" stroke="#241640" stroke-width="11" fill="none"/>
            ${windows(120, 206, 3, 2, 32, 26, 18, '#ffb84d', '#2a1a44')}
            ${windows(510, 206, 3, 2, 32, 26, 18, '#ff5d7a', '#2a1a44')}
            <rect x="300" y="180" width="200" height="140" rx="10" fill="#241640"/>
            <path d="M300 180 h200" stroke="#ffd24a" stroke-width="6"/>
            ${[[344, 226, '#f4fafd'], [400, 232, '#f4fafd'], [456, 224, '#c8b8e8']].map(([x, y, c], i) => `
              <g>
                <ellipse cx="${x}" cy="${Number(y) + 26}" rx="13" ry="16" fill="${c}"/>
                <circle cx="${x}" cy="${y}" r="10" fill="${c}"/>
                <circle cx="${Number(x) - 3.4}" cy="${y}" r="1.8" fill="#241640"/><circle cx="${Number(x) + 3.4}" cy="${y}" r="1.8" fill="#241640"/>
                <path d="M${Number(x) - 3.4} ${Number(y) + 5} q3.4 3 6.8 0" stroke="#241640" stroke-width="1.6" fill="none"/>
                <path d="M${Number(x) - 11} ${Number(y) + 20} q-7 ${i % 2 ? -10 : 7} -12 ${i % 2 ? -14 : 2} M${Number(x) + 11} ${Number(y) + 20} q7 ${i % 2 ? 7 : -10} 12 ${i % 2 ? 2 : -14}" stroke="${c}" stroke-width="4.4" stroke-linecap="round" fill="none">
                  <animateTransform attributeName="transform" type="rotate" values="-7 ${x} ${Number(y) + 20};8 ${x} ${Number(y) + 20};-7 ${x} ${Number(y) + 20}" dur="${r(0.6, 1.1)}s" repeatCount="indefinite"/>
                </path>
              </g>`).join('')}
            ${[318, 482].map((x) => `<rect x="${x - 13}" y="272" width="26" height="40" rx="4" fill="#18102e"/><circle cx="${x}" cy="284" r="7" fill="#4a3a6c"><animate attributeName="r" values="7;9;7" dur=".46s" repeatCount="indefinite"/></circle><circle cx="${x}" cy="302" r="4.4" fill="#4a3a6c"><animate attributeName="r" values="4.4;6;4.4" dur=".46s" repeatCount="indefinite"/></circle>`).join('')}
          `)}
          ${sprinkle(14, 'discodot', (i) => `left:${r(4, 94)}%;top:${r(8, 70)}%;--d:${r(1.2, 3)}s;--c:${['#ff4f9e', '#3adcc8', '#ffd24a', '#8f6fdc'][i % 4]}`)}
          ${steam(3)}
          ${snowfall(6)}
        `,
      },
      {
        id: 'springs', name: 'The Steaming Springs', cls: 'yeti-springs',
        scene: () => `
          ${stars(10, [0, 16])}
          ${L(64, 1, `
            <path d="M0 320 L0 160 L170 78 L330 190 L490 68 L650 180 L800 110 L800 320 Z" fill="#e8d0e0"/>
            <path d="M170 78 L140 112 L170 106 L202 114 Z M490 68 L458 106 L490 100 L524 108 Z" fill="#c890b8"/>
            ${pines(800, 320, 9, '#6a4a7c', 40, 80, .95, '#e8d0e0')}
          `)}
          ${L(48, 2, `
            <path d="M0 320 L800 320 L800 250 Q400 234 0 252 Z" fill="#eef4f8"/>
            ${[[290, 272, 150], [520, 280, 130]].map(([cx, cy, w]) => `
              <ellipse cx="${cx}" cy="${cy}" rx="${w / 2 + 16}" ry="22" fill="#dceef8"/>
              <ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="17" fill="#3adcc8"/>
              <ellipse cx="${cx - w / 6}" cy="${cy - 5}" rx="${w / 5}" ry="6" fill="#8ff2e0" opacity=".85"/>`).join('')}
            <g>
              <ellipse cx="262" cy="262" rx="15" ry="11" fill="#f4fafd"/>
              <circle cx="262" cy="244" r="10" fill="#f4fafd"/>
              <circle cx="258.5" cy="243" r="1.8" fill="#1c3348"/><circle cx="265.5" cy="243" r="1.8" fill="#1c3348"/>
              <path d="M258 249 q4 3.4 9 0" stroke="#1c3348" stroke-width="1.8" fill="none"/>
              <rect x="250" y="228" width="24" height="8" rx="4" fill="#e0447a"/>
            </g>
            <g>
              <ellipse cx="330" cy="266" rx="13" ry="10" fill="#e8e0d4"/>
              <circle cx="330" cy="250" r="9" fill="#e8e0d4"/>
              <path d="M324 248 q2.4 -3.4 5 0 M331 248 q2.4 -3.4 5 0" stroke="#1c3348" stroke-width="1.6" fill="none"/>
              <path d="M326 255 q4 2.4 8 0" stroke="#1c3348" stroke-width="1.6" fill="none"/>
              <path d="M318 240 q-4 -8 2 -12" stroke="#e8e0d4" stroke-width="4" fill="none"/>
            </g>
            <g>
              <ellipse cx="548" cy="270" rx="16" ry="12" fill="#f4fafd"/>
              <circle cx="548" cy="250" r="11" fill="#f4fafd"/>
              <circle cx="544" cy="249" r="1.9" fill="#1c3348"/><circle cx="552" cy="249" r="1.9" fill="#1c3348"/>
              <ellipse cx="548" cy="256" rx="3.4" ry="2.2" fill="#ff9ab8"/>
              <rect x="534" y="234" width="28" height="9" rx="4.4" fill="#3a8fd9"/>
              <path d="M562 264 q10 -4 12 -14" stroke="#f4fafd" stroke-width="5" stroke-linecap="round" fill="none"><animateTransform attributeName="transform" type="rotate" values="-8 562 264;10 562 264;-8 562 264" dur="1.4s" repeatCount="indefinite"/></path>
            </g>
            ${stoneLantern(420, 288, 1.7, '#8a7a94', '#ffd98a')}
            ${[248, 306, 524, 570].map((x) => `<path d="M${x} 236 q${r(-6, 6)} -22 ${r(-4, 8)} -40" stroke="#eef4f8" stroke-width="9" fill="none" opacity=".8"><animate attributeName="opacity" values=".8;.3;.8" dur="${r(2.4, 4)}s" repeatCount="indefinite"/></path>`).join('')}
          `)}
          ${steam(12)}
          ${snowfall(14)}
        `,
      },
      {
        id: 'icebar', name: 'The Ice Bar', cls: 'yeti-icebar',
        scene: () => `
          ${L(100, 1, `
            ${Array.from({ length: 5 }, (_, row) => Array.from({ length: 9 }, (_, col) => `<rect x="${col * 92 + (row % 2 ? 46 : 0) - 46}" y="${row * 66}" width="88" height="62" rx="6" fill="#4ab8dc" opacity="${(0.16 + (row % 3) * 0.07).toFixed(2)}" stroke="#8fe0f4" stroke-width="2"/>`).join('')).join('')}
          `)}
          ${L(56, 2, `
            <rect x="230" y="176" width="340" height="30" rx="9" fill="#8fe0f4" opacity=".95"/>
            <rect x="248" y="206" width="304" height="114" rx="9" fill="#5cc8e8" opacity=".8"/>
            <path d="M258 216 l24 14 M310 212 l20 16 M470 214 l22 15" stroke="#dff6fc" stroke-width="3" opacity=".7"/>
            ${[[300, 158, '#e0447a'], [356, 150, '#ffd24a'], [412, 156, '#2fb56b'], [468, 148, '#8f6fdc'], [516, 158, '#ff8a5c']].map(([x, y, c]) => `
              <path d="M${x} ${y} l0 -24 q0 -6 6 -6 q6 0 6 6 l0 24 Z" fill="${c}" opacity=".95"/>
              <rect x="${Number(x) - 1}" y="${Number(y) - 42}" width="14" height="13" rx="3" fill="${c}" opacity=".95"/>`).join('')}
            <g>
              <ellipse cx="400" cy="172" rx="18" ry="13" fill="#f4fafd"/>
              <circle cx="400" cy="148" r="12" fill="#f4fafd"/>
              <circle cx="395.6" cy="147" r="2" fill="#1c3348"/><circle cx="404.4" cy="147" r="2" fill="#1c3348"/>
              <path d="M395.6 153 q4.4 3.4 8.8 0" stroke="#1c3348" stroke-width="1.8" fill="none"/>
              <path d="M383 166 q-11 -4.4 -13 -15" stroke="#f4fafd" stroke-width="5.4" stroke-linecap="round" fill="none">
                <animateTransform attributeName="transform" type="rotate" values="-9 383 166;11 383 166;-9 383 166" dur="0.8s" repeatCount="indefinite"/>
              </path>
              <rect x="362" y="132" width="13" height="17" rx="3" fill="#c8ecf8" transform="rotate(-16 368 140)"/>
            </g>
            <g transform="translate(474 164)">
              <path d="M0 0 L20 0 L10 15 Z" fill="#ff9ab8"/><line x1="10" y1="15" x2="10" y2="24" stroke="#e8f0f6" stroke-width="2.2"/>
              <path d="M2 -4 a9 9 0 0 1 16 0 Z" fill="#ffd24a"/><line x1="10" y1="-4" x2="16" y2="-13" stroke="#c2822c" stroke-width="1.8"/>
              <circle cx="4" cy="-1" r="2" fill="#e0447a"/>
            </g>
            <rect x="316" y="86" width="168" height="46" rx="12" fill="none" stroke="#ff4f9e" stroke-width="4.4"/>
            <text x="400" y="118" text-anchor="middle" font-family="monospace" font-size="26" fill="#ff4f9e">ICE BAR<animate attributeName="opacity" values="1;1;.3;1;1" keyTimes="0;.88;.92;.96;1" dur="4.4s" repeatCount="indefinite"/></text>
            ${[290, 510].map((x) => `<rect x="${x - 11}" y="250" width="22" height="46" rx="8" fill="#8fe0f4" opacity=".85"/>`).join('')}
          `)}
          ${sprinkle(10, 'discodot', (i) => `left:${r(8, 90)}%;top:${r(6, 36)}%;--d:${r(1.6, 3.4)}s;--c:${['#ff4f9e', '#3adcc8', '#ffd24a'][i % 3]}`)}
          ${snowfall(8)}
        `,
      },
      {
        id: 'groomer', name: 'The Midnight Groomer', cls: 'yeti-groomer',
        scene: () => `
          ${stars(28, [0, 44])}
          ${H('right:10%;top:5%;width:80px', 80, 80, `<circle cx="40" cy="40" r="34" fill="#f4f0dc"/><circle cx="30" cy="32" r="7" fill="#d8d2b4" opacity=".8"/><circle cx="52" cy="50" r="8" fill="#d8d2b4" opacity=".7"/>`, 'moonglow')}
          ${L(62, 1, `
            <path d="M0 320 L0 130 L800 254 L800 320 Z" fill="#c8d8ec"/>
            ${Array.from({ length: 8 }, (_, i) => `<path d="M0 ${158 + i * 21} L800 ${272 + i * 7}" stroke="#a8bcd8" stroke-width="7.4"/>`).join('')}
            ${pines(230, 320, 5, '#1c2a4c', 60, 120, 1, '#c8d8ec')}
            <ellipse cx="410" cy="250" rx="180" ry="30" fill="#ffe9b3" opacity=".14"><animate attributeName="opacity" values=".14;.26;.14" dur="3s" repeatCount="indefinite"/></ellipse>
            <g>
              <rect x="620" y="196" width="76" height="44" rx="6" fill="#3a2c64"/>
              <path d="M610 200 L658 168 L706 200 Z" fill="#241c4c"/>
              <rect x="638" y="212" width="18" height="14" rx="2" fill="#ffd98a"><animate attributeName="opacity" values="1;.6;1" dur="2.8s" repeatCount="indefinite"/></rect>
              <path d="M690 176 q4 -14 -3 -24" stroke="#c8d8ec" stroke-width="5" fill="none" opacity=".8"/>
            </g>
          `)}
          <span class="sp snowcat" style="--dur:26s;animation-delay:-${r(0, 22)}s">
            <svg viewBox="0 0 150 82">
              <path d="M112 46 L150 28 L150 64 L112 64 Z" fill="#ffe9b3" opacity=".6"/>
              <rect x="16" y="36" width="78" height="27" rx="7" fill="#e0447a"/>
              <rect x="54" y="10" width="36" height="30" rx="6" fill="#c23b52"/>
              <rect x="62" y="16" width="22" height="17" rx="3" fill="#ffe9b3"><animate attributeName="opacity" values="1;.7;1" dur="2.2s" repeatCount="indefinite"/></rect>
              <circle cx="72" cy="20" r="3" fill="#1c3348"/><circle cx="79" cy="20" r="3" fill="#1c3348"/>
              <path d="M72 26 q4 3 8 0" stroke="#1c3348" stroke-width="1.8" fill="none"/>
              <circle cx="106" cy="42" r="7" fill="#ffd24a"><animate attributeName="opacity" values="1;.5;1" dur="1.1s" repeatCount="indefinite"/></circle>
              <path d="M8 62 Q8 76 24 76 L90 76 Q106 76 106 62 Q106 52 90 55 L24 55 Q8 52 8 62 Z" fill="#241640"/>
              ${[22, 42, 62, 82].map((x) => `<circle cx="${x}" cy="66" r="6" fill="#4a3a6c"><animateTransform attributeName="transform" type="rotate" from="0 ${x} 66" to="360 ${x} 66" dur="2s" repeatCount="indefinite"/><line x1="${x - 4}" y1="66" x2="${x + 4}" y2="66" stroke="#241640" stroke-width="2"/></circle>`).join('')}
              <path d="M2 44 l13 -13 M2 44 l13 13" stroke="#c23b52" stroke-width="5" stroke-linecap="round"/>
            </svg>
          </span>
          ${snowfall(16)}
        `,
      },
      {
        id: 'aurora', name: 'The Aurora Bowl', cls: 'yeti-aurora',
        scene: () => `
          <div class="fx aurora"></div>
          <div class="fx aurora a2"></div>
          ${stars(30, [0, 52])}
          <span class="sp shootstar" style="left:${r(10, 55)}%;top:${r(4, 16)}%"></span>
          ${L(48, 1, `
            <path d="M0 320 L0 216 L180 122 L350 234 L540 112 L700 224 L800 164 L800 320 Z" fill="#dceef8"/>
            <path d="M180 122 L152 154 L180 150 L210 156 Z M540 112 L508 150 L540 144 L574 152 Z" fill="#8aa8cc"/>
          `)}
          ${L(34, 2, `
            <path d="M0 320 L800 320 L800 282 Q400 268 0 284 Z" fill="#b8d0e8"/>
            ${[[280, 276], [400, 284], [520, 278]].map(([x, y], i) => `
              <g>
                <path d="M${x - 28} ${y} L${x} ${y - 40} L${x + 28} ${y} Z" fill="${['#e0447a', '#ffd24a', '#3adcc8'][i]}"/>
                <path d="M${x - 9} ${y} L${x} ${y - 16} L${x + 9} ${y} Z" fill="#ffe9b3"><animate attributeName="opacity" values="1;.5;1" dur="${r(2.4, 4)}s" repeatCount="indefinite"/></path>
              </g>`).join('')}
            <g>
              <ellipse cx="352" cy="252" rx="11" ry="9" fill="#f4fafd"/>
              <circle cx="352" cy="238" r="8" fill="#f4fafd"/>
              <circle cx="349.5" cy="237" r="1.4" fill="#1c3348"/><circle cx="354.5" cy="237" r="1.4" fill="#1c3348"/>
              <path d="M361 244 l18 -14" stroke="#8a6a3a" stroke-width="3.4"/>
              <path d="M377 226 l9 -4.4" stroke="#8a6a3a" stroke-width="3.4"/>
              <circle cx="388" cy="219" r="2.4" fill="#3adcc8"><animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite"/></circle>
            </g>
            <path d="M180 300 q30 -7 60 0 M560 302 q30 -7 60 0" stroke="#8aa8cc" stroke-width="3.4" fill="none"/>
          `)}
          ${snowfall(10)}
        `,
      },
      {
        id: 'village', name: 'The Yeti Village', cls: 'yeti-village',
        scene: () => `
          ${stars(18, [0, 26])}
          ${L(58, 1, `
            ${ridge(800, 320, 130, 40, '#5c4a8c', .6)}
            ${pines(800, 320, 14, '#3a2c64', 60, 130, .95, '#c8b8e8')}
          `)}
          ${L(50, 2, `
            <path d="M0 320 L800 320 L800 280 Q400 264 0 282 Z" fill="#e8eef8"/>
            ${[[240, 1.1], [400, 1.35], [560, 1.0]].map(([x, s]) => `
              <g>
                <path d="M${x - 62 * s} 288 L${x} ${288 - 104 * s} L${x + 62 * s} 288 Z" fill="#6a3a2c"/>
                <path d="M${x - 68 * s} ${288 - 6 * s} L${x} ${288 - 112 * s} L${x + 68 * s} ${288 - 6 * s} l-8 ${-11 * s} L${x} ${288 - 128 * s} L${x - 60 * s} ${288 - 17 * s} Z" fill="#f4fafd"/>
                <rect x="${x - 13 * s}" y="${288 - 46 * s}" width="${26 * s}" height="${46 * s}" rx="3" fill="#4a2416"/>
                <circle cx="${x}" cy="${288 - 26 * s}" r="${3 * s}" fill="#ffd24a"/>
                <rect x="${x - 34 * s}" y="${288 - 68 * s}" width="${20 * s}" height="${17 * s}" rx="2" fill="#ffd98a"><animate attributeName="opacity" values="1;.6;1" dur="${r(2.6, 4.6)}s" repeatCount="indefinite"/></rect>
                <rect x="${x + 14 * s}" y="${288 - 68 * s}" width="${20 * s}" height="${17 * s}" rx="2" fill="#ffb84d"><animate attributeName="opacity" values=".7;1;.7" dur="${r(2.6, 4.6)}s" repeatCount="indefinite"/></rect>
                <rect x="${x + 30 * s}" y="${288 - 150 * s}" width="${11 * s}" height="${44 * s}" fill="#4a2c16"/>
              </g>`).join('')}
            <path d="M180 156 Q400 208 620 154" stroke="#3a2c64" stroke-width="3.4" fill="none"/>
            ${[230, 290, 350, 410, 470, 530, 570].map((x, i) => `<circle cx="${x}" cy="${178 + Math.sin(i * 1.2) * 11}" r="5.4" fill="${['#ffd24a', '#ff5d7a', '#3adcc8', '#8f6fdc'][i % 4]}"><animate attributeName="opacity" values="1;.4;1" dur="${r(1.6, 3)}s" repeatCount="indefinite"/></circle>`).join('')}
            <g>
              <ellipse cx="320" cy="304" rx="10" ry="8" fill="#f4fafd"/><circle cx="320" cy="291" r="7" fill="#f4fafd"/>
              <circle cx="317.6" cy="290" r="1.4" fill="#1c3348"/><circle cx="322.4" cy="290" r="1.4" fill="#1c3348"/>
              <rect x="296" y="300" width="18" height="9" rx="3.4" fill="#c23b52"/><path d="M314 304 l-10 0" stroke="#8a6a3a" stroke-width="2.2"/>
            </g>
            <g>
              <circle cx="484" cy="302" r="9" fill="#f4fafd"/><circle cx="484" cy="288" r="6.4" fill="#f4fafd"/>
              <circle cx="482" cy="287" r="1.3" fill="#1c3348"/><circle cx="486.4" cy="287" r="1.3" fill="#1c3348"/>
              <path d="M481 291 q3 2.2 6 0" stroke="#1c3348" stroke-width="1.3" fill="none"/>
              <path d="M478 282 l-4.4 -4.4 M490 282 l4.4 -4.4" stroke="#8a6a3a" stroke-width="2.2"/>
              <circle cx="484" cy="279" r="2.2" fill="#ff8a3c"/>
            </g>
            ${[398, 562].map((x) => `<path d="M${x} ${150} q${r(-4, 6)} -18 ${r(-2, 8)} -34" stroke="#e8eef8" stroke-width="6" fill="none" opacity=".75"><animate attributeName="opacity" values=".75;.3;.75" dur="${r(3, 5)}s" repeatCount="indefinite"/></path>`).join('')}
          `)}
          ${steam(3)}
          ${snowfall(18)}
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

// Weather rides ABOVE the interface: these ambient sprites get moved to the
// front layer so snow falls over the case file and embers cross the seal.
// Creatures and set-pieces stay behind the panels, looming.
const FRONT = new Set(['petal', 'snow', 'ember', 'rain', 'bubble', 'coin', 'fortune', 'feather', 'noodle', 'pearl', 'marine-snow', 'veg', 'spark', 'dust', 'firefly', 'wisp', 'moth', 'butterfly', 'discodot']);

let current = null;

export function applyWorld(sessionType, worldId = null) {
  const key = `${sessionType}:${worldId ?? ''}`;
  if (key === current) return;
  current = key;
  const root = document.documentElement;
  const scene = document.getElementById('scene');
  const front = document.getElementById('scene-front');
  if (SPACES[sessionType]) {
    root.dataset.universe = SPACES[sessionType].cls;
    root.dataset.world = '';
    if (scene) scene.innerHTML = '';
    if (front) front.innerHTML = '';
    return;
  }
  const U = UNIVERSES[sessionType];
  const W = worldDef(sessionType, worldId);
  root.dataset.universe = U ? U.cls : '';
  root.dataset.world = W ? W.cls : '';
  if (scene) {
    scene.innerHTML = W?.scene ? W.scene() : '';
    if (front) {
      front.innerHTML = '';
      // roughly half of each ambient system drifts in front of the UI
      let toggle = false;
      for (const el of [...scene.children]) {
        if (el.classList.contains('sp') && [...el.classList].some((c) => FRONT.has(c))) {
          toggle = !toggle;
          if (toggle) front.appendChild(el);
        }
      }
    }
  }
}

// QA hook: lets tooling flip through every world without touching the draft.
if (typeof window !== 'undefined') window.__p3ApplyWorld = applyWorld;
