// THE ATLAS — zoom out of the worlds and into the cosmos they float in.
// Every finished night is a planet on a winding star-path; months are
// sectors; PR nights wear a crown. Lifts are charted as constellations.
import { $, esc, fmtW, fmtDate, monthLabel, dayParts, sessionMins, haptic } from '../util.js';
import { sfx } from '../audio.js';
import { store } from '../store.js';
import { topSet, increment, ladderFor } from '../engine.js';
import { confirmSheet, toast, ICONS } from '../components.js';
import { flushQueue } from '../github.js';
import { applyWorld, UNIVERSES, worldDef, returnWorld } from '../worlds.js';
// stats.js is the light half of the arcade — pure localStorage readers, no
// game modules attached. The registry itself (which drags all six game
// modules in) is dynamic-imported inside renderWorlds, keeping the arcade a
// zero-boot lazy load.
import { bestFor, starsFor, readStats } from '../game/stats.js';

let root = null;
const state = { tab: 'sessions', entryPath: null, exId: null };

// universe hues, neon-tuned to glow against the void
const SWATCH = { PushA: '#ff6a4c', PullA: '#3adcc8', LegsA: '#7ad48a', PushB: '#ff9a5c', PullB: '#ffd24a', LegsB: '#5cb8ff' };

// The bestiary's six constellations — the arcade universes in charting order,
// each with its canonical name + neon swatch (NOT mod.TITLE, which is the
// mechanic's name). Keys match registry GAMES.
const UNI = [
  { key: 'dojo', name: 'Mount Volcano Dojo', hue: '#ff6a4c' },
  { key: 'deep', name: 'The Deep', hue: '#3adcc8' },
  { key: 'park', name: 'Cryptid National Park', hue: '#7ad48a' },
  { key: 'wok', name: 'The Noodle Cosmos', hue: '#ff9a5c' },
  { key: 'atoll', name: 'Pirate Radio Atoll', hue: '#ffd24a' },
  { key: 'yeti', name: 'Yeti Ski Resort', hue: '#5cb8ff' },
];

// 0xffb46c → "#ffb46c"; anything malformed falls back to the void-grey used
// elsewhere in the Atlas so a bad accent can never break a tile's style attr.
function accCss(n) {
  const v = (typeof n === 'number' && isFinite(n)) ? (n >>> 0) & 0xffffff : 0x8a9ac8;
  return '#' + v.toString(16).padStart(6, '0');
}

// A world's [stop,'#hex'] sky pairs → a CSS gradient we can paint a tile with.
function skyCss(sky) {
  if (!Array.isArray(sky)) return '#12203a';
  const stops = sky
    .filter((p) => Array.isArray(p) && p.length >= 2 && typeof p[1] === 'string')
    .map(([s, c]) => `${esc(c)} ${Math.round((Number(s) || 0) * 100)}%`)
    .join(', ');
  return stops ? `linear-gradient(155deg, ${stops})` : '#12203a';
}

// 3 pips, `lit` of them gold — mirrors the game-over panel's star ladder
// (.on = earned), minus the pop animation since this is a static ledger.
function starPips(lit) {
  return [1, 2, 3].map((i) => `<span class="${i <= lit ? 'on' : ''}">★</span>`).join('');
}

export function popBack() {
  if (state.entryPath || state.exId) {
    state.entryPath = null; state.exId = null;
    if (root) { render(root); root.scrollTop = 0; }
    return true;
  }
  return false;
}

// Forget any drill-in WITHOUT rendering — for when another tab takes over
// and a stale drill must not be waiting (or stomping the live world via
// popstate) when the Atlas next appears.
export function resetDrill() {
  state.entryPath = null;
  state.exId = null;
}

// Aim the Atlas at one entry WITHOUT rendering — the results card's "see
// tonight's star" path: app.js calls this, then switches the tab (which
// renders). Pushes the drill history entry so the back gesture still works.
export function openEntry(path) {
  state.tab = 'sessions';
  state.exId = null;
  state.entryPath = path;
  try { window.history.pushState({ p3: 'drill' }, ''); } catch { /* throttled */ }
}

function drillIn(patch) {
  Object.assign(state, patch);
  sfx('open');
  haptic(4);
  try { window.history.pushState({ p3: 'drill' }, ''); } catch { /* throttled */ }
  render(root);
  root.scrollTop = 0;
}

function backOut() {
  sfx('close');
  try { window.history.back(); } catch { popBack(); }
  setTimeout(() => { if (state.entryPath || state.exId) popBack(); }, 250);
}

export function render(el) {
  root = el;
  applyWorld('sb');
  // Worlds is arcade-only — reachable and meaningful even with zero lifting
  // history, so it jumps the history-empty short-circuit below.
  if (state.tab === 'worlds') return renderWorlds();
  if (!store.history.length) return renderEmpty();
  if (state.entryPath) return renderDetail();
  if (state.exId) return renderChart();
  renderList();
}

function renderEmpty() {
  root.onclick = null;
  // Keep the tabs even with no logged nights: the Worlds collection is
  // arcade-only, so a player who has only tapped through rest-games must
  // still be able to reach it. Without the seg here, Worlds was unreachable
  // until the first night was charted.
  // Uncharted space is a scene, not blank paper: a cut-out telescope aimed at
  // three dim question-mark stars that blink (same fiction as the tabbar).
  const qstar = (x, y, r, fs, d) => `<g class="qstar" style="--d:${d}s"><circle cx="${x}" cy="${y}" r="${r}" fill="#dfe8ff"/><text x="${x + 6}" y="${y + 6}" font-family="Cinzel,serif" font-size="${fs}" fill="#8a9ac8">?</text></g>`;
  const art = `
    <svg class="emp-art" width="150" height="88" viewBox="0 0 150 88" aria-hidden="true">
      ${qstar(108, 12, 2.4, 14, 2.6)}${qstar(84, 30, 1.8, 11, 3.4)}${qstar(130, 34, 1.6, 10, 4.2)}
      <path d="M42 64 L28 84 M46 64 L46 84 M50 64 L64 84" stroke="#8a9ac8" stroke-width="3" stroke-linecap="round"/>
      <g transform="rotate(-28 46 58)">
        <rect x="20" y="52" width="46" height="12" rx="5" fill="#8f6fdc" stroke="#dfe8ff" stroke-width="1.6"/>
        <rect x="62" y="49.5" width="12" height="17" rx="3" fill="#ffd24a" stroke="#dfe8ff" stroke-width="1.6"/>
      </g>
    </svg>`;
  root.innerHTML = segHtml()
    + `<div class="empty"><div class="card-e">${art}<h3>Uncharted space</h3><p>Finish a night in any world and its star gets charted here. Tap <b>Worlds</b> to see the rest-game universes you've discovered.</p></div></div>`;
  wireSeg();
}

function segHtml() {
  return `
    <div class="space-title">The Atlas</div>
    <div class="seg">
      <button data-t="sessions" class="${state.tab === 'sessions' ? 'active' : ''}">Nights</button>
      <button data-t="exercises" class="${state.tab === 'exercises' ? 'active' : ''}">Lifts</button>
      <button data-t="worlds" class="${state.tab === 'worlds' ? 'active' : ''}">Worlds</button>
    </div>`;
}

function wireSeg() {
  root.querySelector('.seg').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-t]');
    if (!btn) return;
    if (btn.dataset.t !== state.tab) { sfx('nav'); haptic(4); }
    state.tab = btn.dataset.t;
    state.entryPath = null; state.exId = null;
    render(root);
  });
}

function renderList() {
  if (state.tab === 'exercises') return renderLiftList();
  const entries = [...store.history].sort((a, b) => b.date.localeCompare(a.date));
  const queued = new Set(store.queue.map((q) => q.path));
  let lastMonth = '';
  const rows = entries.map((e, ri) => {
    const path = store.entryPath(e);
    if (e.supplemental && e.conditioning) {
      const c = e.conditioning;
      const { mon, day } = dayParts(e.date);
      const month = monthLabel(e.date);
      const sector = month !== lastMonth ? `<div class="sector"><i></i><span>${esc(month)} sector</span><i></i></div>` : '';
      lastMonth = month;
      return `${sector}
      <button class="star-node" data-path="${esc(path)}" style="--c:#4fae5c;--i:${Math.min(ri, 12)}">
        <span class="planet"><b class="num">${mon}<u>${day}</u></b></span>
        <span class="sn-info">
          <span class="sn-name">Conditioning</span>
          <span class="sn-world">${esc(c.modality)}</span>
          <span class="sn-meta num">${c.mins} min · ${esc((c.intensity || '').toLowerCase())}${queued.has(path) ? ` · <span class="beaming">${ICONS.beam} Beaming up</span>` : ''}</span>
        </span>
      </button>`;
    }
    const sets = e.exercises.reduce((n, x) => n + x.sets.length, 0);
    const tonnage = Math.round(e.exercises.reduce((n, x) => n + x.sets.reduce((m, s) => m + (s.weight || 0) * s.reps, 0), 0));
    const ats = e.exercises.flatMap((x) => x.sets.map((q) => q.at).filter(Boolean));
    const mins = e.mins ?? sessionMins(e.startedAt ?? null, ats);
    const hasPr = false; // records live on the star itself below when known
    const { mon, day } = dayParts(e.date);
    const month = monthLabel(e.date);
    const sector = month !== lastMonth ? `<div class="sector"><i></i><span>${esc(month)} sector</span><i></i></div>` : '';
    lastMonth = month;
    const name = store.plan?.sessions[e.session_type]?.name ?? e.session_type;
    const world = (e.world && worldDef(e.session_type, e.world)?.name) || UNIVERSES[e.session_type]?.name || '';
    return `${sector}
      <button class="star-node" data-path="${esc(path)}" style="--c:${SWATCH[e.session_type] ?? '#8a9ac8'};--i:${Math.min(ri, 12)}">
        <span class="planet"><b class="num">${mon}<u>${day}</u></b></span>
        <span class="sn-info">
          <span class="sn-name">${esc(name)}</span>
          <span class="sn-world">${esc(world)}</span>
          <span class="sn-meta num">${sets} sets · ${tonnage >= 1000 ? `${(tonnage / 1000).toFixed(1)}k` : tonnage} lb${mins ? ` · ${mins} min` : ''}${e.bodyweight ? ` · bw ${fmtW(e.bodyweight)}` : ''}${queued.has(path) ? ` · <span class="beaming">${ICONS.beam} Beaming up</span>` : ''}</span>
        </span>
      </button>`;
  }).join('');
  root.innerHTML = segHtml() + `<div class="starpath">${rows}<div class="path-end"><i></i>The beginning</div></div>`;
  wireSeg();
  root.onclick = (e) => {
    const row = e.target.closest('.star-node');
    if (!row) return;
    drillIn({ entryPath: row.dataset.path });
  };
}

function renderConditioningDetail(entry) {
  const c = entry.conditioning;
  root.innerHTML = `
    <div class="space-title">The Atlas</div>
    <div class="debrief" style="--c:#4fae5c">
      <button class="back" id="back">← Back to the chart</button>
      <div class="db-head">
        <span class="planet big"></span>
        <span>
          <h1>Conditioning</h1>
          <div class="m">${esc(c.modality)}</div>
          <div class="m dim">${fmtDate(entry.date, { year: true })} · ${c.mins} min · ${esc((c.intensity || '').toLowerCase())} pace</div>
        </span>
      </div>
      ${c.note ? `<div class="d-ex"><div class="n">Note</div><div style="font-family:var(--mono);font-size:12px;color:var(--ink)">${esc(c.note)}</div></div>` : ''}
      <div class="d-ex"><div class="n" style="color:var(--ink2);font-family:var(--mono);font-size:11.5px">Kept off your lifting progression — never feeds weights, PRs, or what's next.</div></div>
      <div class="db-actions">
        <button class="btn quiet danger-ghost" id="db-remove">Remove from the chart</button>
      </div>
    </div>`;
  $('#back', root).addEventListener('click', backOut);
  $('#db-remove', root).addEventListener('click', () => {
    confirmSheet({
      title: 'Remove this conditioning session?',
      body: store.settings.token ? 'Deletes it from this phone AND from GitHub. No undo.' : 'Deletes it from this phone. No undo.',
      confirmLabel: 'Remove', danger: true,
      onConfirm() { store.deleteEntry(entry); resetDrill(); toast('Conditioning session removed', 'ok'); },
    });
  });
}

function renderDetail() {
  root.onclick = null;
  const entry = store.history.find((e) => store.entryPath(e) === state.entryPath);
  if (!entry) { state.entryPath = null; return renderList(); }
  if (entry.supplemental && entry.conditioning) return renderConditioningDetail(entry);
  const name = store.plan?.sessions[entry.session_type]?.name ?? entry.session_type;
  const world = (entry.world && worldDef(entry.session_type, entry.world)?.name) || UNIVERSES[entry.session_type]?.name || '';
  const phase = entry.phase === 'legacy' ? 'imported' : (store.plan?.phases.find((p) => p.id === entry.phase)?.name ?? entry.phase ?? '');
  const ats = entry.exercises.flatMap((x) => x.sets.map((q) => q.at).filter(Boolean));
  // the persisted duration wins; older entries derive one from set timestamps
  const mins = entry.mins ?? sessionMins(entry.startedAt ?? null, ats);
  root.innerHTML = `
    <div class="space-title">The Atlas</div>
    <div class="debrief" style="--c:${SWATCH[entry.session_type] ?? '#8a9ac8'}">
      <button class="back" id="back">← Back to the chart</button>
      <div class="db-head">
        <span class="planet big"></span>
        <span>
          <h1>${esc(name)}</h1>
          <div class="m">${esc(world)}</div>
          <div class="m dim">${fmtDate(entry.date, { year: true })}${mins ? ` · ${mins} min` : ''}${entry.bodyweight ? ` · bw ${fmtW(entry.bodyweight)} lb` : ''}${phase ? ` · ${esc(phase)}` : ''}</div>
        </span>
      </div>
      ${entry.exercises.map((x) => {
        const top = topSet(x.sets);
        return `<div class="d-ex"><div class="n">${esc(x.name)}</div>
          <div class="d-sets">${x.sets.map((s) => `<span class="d-set ${top && s === top ? 'top' : ''}"><b class="num">${fmtW(s.weight)}</b>×${s.reps}</span>`).join('')}</div>
          ${x.note ? `<div class="d-note">“${esc(x.note)}”</div>` : ''}
        </div>`;
      }).join('')}
      ${entry.notes ? `<div class="d-ex"><div class="n">Field notes</div><div style="font-family:var(--mono);font-size:12px;color:var(--ink)">${esc(entry.notes)}</div></div>` : ''}
      <div class="db-actions">
        <button class="btn quiet" id="db-reopen">Re-open this night</button>
        <button class="btn quiet danger-ghost" id="db-remove">Remove from the chart</button>
      </div>
    </div>`;
  $('#back', root).addEventListener('click', backOut);
  // A wrongly-logged night is fixable IN the app: re-open it as a draft
  // (re-finishing replaces the saved night — upsertEntry keys on date+type),
  // or delete it locally and queue the repo deletion. Both confirm-gated in
  // plain English.
  $('#db-reopen', root).addEventListener('click', () => {
    const dirty = store.draft?.exercises?.some((x) => x.sets.some((s) => s.done));
    confirmSheet({
      title: 'Re-open this night?',
      body: `Loads it back onto the Lift screen with every set editable. Re-finishing there replaces this saved night.${dirty ? ' <b>The workout currently in progress on the Lift screen will be dropped.</b>' : ''}`,
      confirmLabel: 'Re-open it',
      danger: !!dirty,
      onConfirm() {
        // Stomping a clean in-progress draft hands its unseen world back to
        // the deck (same rule as switchSession) — reopening must not burn the
        // draw. A reopened prev is exempt: its world was already trained.
        const prev = store.draft;
        const prevDirty = prev?.exercises?.some((x) => x.sets.some((s) => s.done));
        if (prev?.world && !prevDirty && !prev.reopened) returnWorld(prev.session_type, prev.world);
        store.saveDraft(draftFromEntry(entry));
        resetDrill();
        toast('Night re-opened — it’s on the Lift screen');
        window.dispatchEvent(new CustomEvent('p3:nav', { detail: { tab: 'today' } }));
      },
    });
  });
  $('#db-remove', root).addEventListener('click', () => {
    confirmSheet({
      title: 'Remove this night from the chart?',
      body: store.settings.token
        ? 'Deletes this night from this phone AND from GitHub. There is no undo.'
        : 'Deletes this night from this phone. There is no undo.',
      confirmLabel: 'Remove it', danger: true,
      onConfirm() {
        store.deleteEntry(entry);
        flushQueue();
        resetDrill();
        toast(store.settings.token ? 'Night removed — deleting it from GitHub too' : 'Night removed from this phone');
        if (root) { render(root); root.scrollTop = 0; }
      },
    });
  });
}

// Rebuild a Lift-screen draft from a banked entry: every set comes back done
// (with its timestamp), weights editable via the trophies/un-log flow. Slot
// metadata rehydrates from the plan where it still exists.
function draftFromEntry(entry) {
  const session = store.plan?.sessions[entry.session_type];
  const exercises = entry.exercises.map((x) => {
    const slot = session?.exercises.find((s) => s.id === x.id);
    return {
      prev: null,
      id: x.id, name: x.name,
      repMin: slot?.repMin ?? 8, repMax: slot?.repMax ?? 12, repUnit: slot?.repUnit || null,
      rest: slot?.rest || 90,
      basis: 'verify', prevTop: null,
      note: 'Re-opened from the Atlas — these are the night’s saved numbers',
      // The night's saved per-exercise note MUST ride into the reopen, or
      // re-finishing silently deletes it from the record (found by the v45
      // adversarial review): finishSession persists only logNote.
      logNote: x.note ?? null,
      // inc drives the numpad's ± stepper: resolve the real per-exercise grid
      // (5/10 lb on the barbells) exactly like buildDraft, never a flat 2.5.
      bump: 0, pct: null, stalled: false, inc: (slot && increment(store.plan, slot.id)) || 2.5, adhoc: !slot,
      grid: slot ? ladderFor(store.plan, slot.id) : null,
      sets: x.sets.map((s) => ({ weight: s.weight, reps: s.reps, rxWeight: s.weight, done: true, ...(s.at ? { at: s.at } : {}) })),
    };
  });
  return {
    date: entry.date, session_type: entry.session_type,
    world: entry.world ?? null,
    phase: entry.phase ?? null, week: entry.week ?? null,
    startedAt: entry.startedAt ?? null,
    // The banked duration rides along: re-finishing must keep it rather than
    // recompute across the reopen gap (startedAt is days old by then).
    origMins: entry.mins ?? null,
    bodyweight: entry.bodyweight ?? null, notes: entry.notes ?? '',
    reopened: true, // the Lift screen skips its "resume or start fresh?" prompt
    exercises,
  };
}

function renderLiftList() {
  const map = new Map();
  for (const e of store.history) {
    if (e.supplemental || !e.exercises) continue; // conditioning entries hold no lifts to chart
    for (const x of e.exercises) {
      const rec = map.get(x.id) || { id: x.id, name: x.name, count: 0, last: '' };
      rec.count += 1;
      if (e.date > rec.last) rec.last = e.date;
      map.set(x.id, rec);
    }
  }
  const items = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  root.innerHTML = segHtml() + `<div class="lift-grid">` + items.map((x, i) => `
    <button class="lift-card" data-ex="${esc(x.id)}" style="--c:${['#ffd24a', '#3adcc8', '#ff6a4c', '#5cb8ff', '#8f6fdc', '#7ad48a'][i % 6]}">
      <span class="lc-orbit"><i></i></span>
      <span><span class="lc-name">${esc(x.name)}</span>
        <span class="lc-meta num">${x.count} nights · Last ${fmtDate(x.last)}</span></span>
      <span class="lc-end">›</span>
    </button>`).join('') + `</div>`;
  wireSeg();
  root.onclick = (e) => {
    const row = e.target.closest('.lift-card[data-ex]');
    if (!row) return;
    drillIn({ exId: row.dataset.ex });
  };
}

// ——— Worlds: the bestiary / sticker-album of the 48 arcade worlds ———
// The registry hauls all six game modules with it, so it only crosses the
// event horizon when the player actually opens this tab: one frame of
// "charting", then the full album. Cached for the rest of the session.
let registryMod = null;
function renderWorlds() {
  root.onclick = null; // tiles are display-only; no drill-in
  if (!registryMod) {
    root.innerHTML = segHtml()
      + `<div class="empty"><div class="card-e"><h3>Charting…</h3><p>Unrolling the world maps.</p></div></div>`;
    wireSeg();
    import('../game/registry.js').then((m) => {
      registryMod = m;
      if (root && state.tab === 'worlds') renderWorlds();
    }).catch(() => {
      if (root && state.tab === 'worlds') {
        root.innerHTML = segHtml()
          + `<div class="empty"><div class="card-e"><h3>Charts out of reach</h3><p>The world maps didn't load — check the connection and tap Worlds again.</p></div></div>`;
        wireSeg();
      }
    });
    return;
  }
  const { GAMES } = registryMod;
  const stats = readStats();

  // Walk the registry once, tallying discovery + medals for the career band.
  let discovered = 0;
  let medals = 0;
  const groups = UNI.map((u) => {
    const mod = GAMES[u.key];
    const worlds = Object.entries(mod?.WORLDS ?? {}).map(([cls, cfg]) => {
      const best = bestFor(cls) || 0;
      const stars = starsFor(cls) || 0;
      const found = best > 0 || stars > 0;
      if (found) discovered += 1;
      medals += stars;
      return { cls, cfg: cfg || {}, best, stars, found };
    });
    return { u, worlds, uDisc: worlds.filter((w) => w.found).length };
  });
  const total = groups.reduce((n, g) => n + g.worlds.length, 0) || 48;

  // Never touched the arcade at all → a friendly hero, seg kept so they can
  // sail back to Nights/Lifts.
  if (!discovered && !(stats.plays > 0)) {
    root.innerHTML = segHtml()
      + `<div class="empty"><div class="card-e">`
      + `<span class="wc-q big" style="--c:#8a9ac8">?</span>`
      + `<h3>No worlds discovered yet</h3>`
      + `<p>Play a rest-game between sets and each world you visit gets charted here.</p></div></div>`;
    wireSeg();
    return;
  }

  const pct = Math.round((discovered / total) * 100);
  const hero = `
    <div class="wc-hero">
      <div class="wc-lead">
        <b class="num">${discovered}<u>/ ${total}</u></b>
        <i>Worlds discovered</i>
        <span class="wc-bar"><span style="width:${pct}%"></span></span>
      </div>
      <div class="wc-cells">
        <div class="wc-cell"><b class="num">${stats.plays || 0}</b><i>Plays</i></div>
        <div class="wc-cell"><b class="num">${stats.streak || 0}</b><i>Day streak</i></div>
        <div class="wc-cell"><b class="num">${stats.streakBest || 0}</b><i>Best streak</i></div>
        <div class="wc-cell"><b class="num">${medals}<u>/144</u></b><i>Medals</i></div>
      </div>
    </div>`;

  const sectors = groups.map((g) => {
    const tiles = g.worlds.map((w, wi) => {
      if (!w.found) {
        return `<div class="wc-tile locked" style="--c:${g.u.hue};--i:${wi}">
          <span class="wc-q">?</span>
          <span class="wc-tname dim">???</span>
        </div>`;
      }
      const acc = accCss(w.cfg.accent);
      return `<div class="wc-tile found${w.stars >= 3 ? ' gold' : ''}" style="--c:${acc};--sky:${skyCss(w.cfg.sky)};--i:${wi}">
        <span class="wc-tname">${esc(w.cfg.name || 'Unknown')}</span>
        <span class="wc-stars">${starPips(w.stars)}</span>
        <span class="wc-best num">${w.best}</span>
      </div>`;
    }).join('');
    return `
      <div class="wc-sector" style="--c:${g.u.hue}">
        <span class="wc-uni">${esc(g.u.name)}</span>
        <span class="wc-count num">${g.uDisc} / ${g.worlds.length}</span>
      </div>
      <div class="wc-grid">${tiles}</div>`;
  }).join('');

  // NEW MEDAL CELEBRATION: the album remembers how many medals it showed last
  // time — coming back with more makes every lit star re-pop (staggered) and
  // plays the finish fanfare once. Grinding across worlds is celebrated HERE.
  let lastMedals = 0;
  try { lastMedals = Number(localStorage.getItem('p3.lastMedals')) || 0; } catch { /* private mode */ }
  const newMedals = medals > lastMedals;
  try { localStorage.setItem('p3.lastMedals', String(medals)); } catch { /* private mode */ }

  root.innerHTML = segHtml() + `<div class="wc-wrap${newMedals ? ' medal-party' : ''}">${hero}${sectors}</div>`;
  wireSeg();
  if (newMedals) sfx('finish');
}

function renderChart() {
  root.onclick = null;
  const points = [];
  let name = state.exId;
  for (const e of [...store.history].sort((a, b) => a.date.localeCompare(b.date))) {
    const x = e.exercises.find((q) => q.id === state.exId);
    if (!x) continue;
    name = x.name;
    const top = topSet(x.sets);
    if (top) points.push({ date: e.date, w: top.weight, reps: top.reps });
  }
  const useReps = points.length > 0 && points.every((p) => !p.w);
  const series = useReps ? points.map((p) => ({ ...p, w: p.reps })) : points;
  const last = series[series.length - 1];
  const best = series.reduce((m, p) => (p.w > m.w ? p : m), series[0] ?? { w: 0 });
  root.innerHTML = `
    <div class="space-title">The Atlas</div>
    <div class="debrief" style="padding-bottom:8px;--c:#ffd24a">
      <button class="back" id="back">← Back to the lifts</button>
      <h1>${esc(name)}</h1>
      <div class="m dim">${useReps ? 'Top-set reps' : 'Top set'} per night — the trajectory</div>
    </div>
    <div class="chart-box">
      ${chartSvg(series)}
      <div class="chart-meta">
        <span>last <b class="num">${last ? fmtW(last.w) : '—'}</b></span>
        <span>best <b class="num">${best ? fmtW(best.w) : '—'}</b></span>
        <span><b class="num">${series.length}</b> nights</span>
      </div>
    </div>`;
  $('#back', root).addEventListener('click', backOut);
}

function chartSvg(points) {
  const W = 340, H = 156, P = { t: 16, r: 16, b: 24, l: 38 };
  if (points.length < 2) return `<svg viewBox="0 0 ${W} ${H}"><text x="${W / 2}" y="${H / 2}" fill="#8a9ac8" font-size="12" text-anchor="middle" font-family="monospace">Not enough data yet</text></svg>`;
  const ws = points.map((p) => p.w);
  let lo = Math.min(...ws), hi = Math.max(...ws);
  if (lo === hi) { lo -= 10; hi += 10; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  const X = (i) => P.l + (i / (points.length - 1)) * (W - P.l - P.r);
  const Y = (w) => P.t + (1 - (w - lo) / (hi - lo)) * (H - P.t - P.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.w).toFixed(1)}`).join('');
  const bi = points.reduce((m, p, i) => (p.w > points[m].w ? i : m), 0);
  return `<svg viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="tj" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3adcc8"/><stop offset="1" stop-color="#ffd24a"/></linearGradient>
      <linearGradient id="tjf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,210,74,.22)"/><stop offset="1" stop-color="rgba(255,210,74,0)"/></linearGradient>
    </defs>
    ${[0.25, 0.5, 0.75].map((f) => `<line x1="${P.l}" y1="${P.t + f * (H - P.t - P.b)}" x2="${W - P.r}" y2="${P.t + f * (H - P.t - P.b)}" stroke="rgba(138,154,200,.16)" stroke-width="1" stroke-dasharray="3 5"/>`).join('')}
    <path d="${path} L${X(points.length - 1).toFixed(1)},${H - P.b} L${P.l},${H - P.b} Z" fill="url(#tjf)"/>
    <path d="${path}" fill="none" stroke="url(#tj)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
    ${points.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.w).toFixed(1)}" r="${i === points.length - 1 ? 4.4 : 2.6}" fill="${i === points.length - 1 ? '#ffd24a' : '#3adcc8'}"/>`).join('')}
    <circle cx="${X(bi).toFixed(1)}" cy="${Y(points[bi].w).toFixed(1)}" r="7" fill="none" stroke="#ffd24a" stroke-width="1.6"><animate attributeName="r" values="7;10;7" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.3;1" dur="2.4s" repeatCount="indefinite"/></circle>
    <text x="${P.l - 6}" y="${Y(hi - pad) + 4}" fill="#8a9ac8" font-size="10" text-anchor="end" font-family="monospace">${fmtW(Math.round(hi - pad))}</text>
    <text x="${P.l - 6}" y="${Y(lo + pad) + 4}" fill="#8a9ac8" font-size="10" text-anchor="end" font-family="monospace">${fmtW(Math.round(lo + pad))}</text>
    <text x="${P.l}" y="${H - 7}" fill="#8a9ac8" font-size="10" font-family="monospace">${fmtDate(points[0].date, { year: true })}</text>
    <text x="${W - P.r}" y="${H - 7}" fill="#8a9ac8" font-size="10" text-anchor="end" font-family="monospace">${fmtDate(points[points.length - 1].date, { year: true })}</text>
  </svg>`;
}
