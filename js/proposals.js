// THE one description of a program change. The decision sheet (Mission tab),
// the session briefing, and the pending-count dot all name and count
// proposals through these helpers, so the sheet that SHOWS a change and the
// sheet that DECIDES it can never describe it differently — and "N waiting"
// is the same N everywhere. Before this file, the id scheme and the
// undecided filter were copy-pasted in three places.
import { esc } from './util.js';
import { store } from './store.js';
import * as engine from './engine.js';

// A proposal's identity: date + kind + exercise + scope. Decisions in
// data/coach/decisions.json are matched on the same string.
export const propId = (p) => `${p?.date ?? ''}:${p?.kind}:${p?.exercise}:${p?.scope ?? 'all'}`;

// Every proposal in the packet, date-stamped from the packet when it carries
// none of its own, in packet order.
export function allProposals() {
  return (store.coach?.proposals ?? []).map((p) => ({ ...p, date: p.date ?? store.coach?.date ?? null }));
}

// The ones still waiting on the athlete's yes or no.
export function undecidedProposals() {
  const done = new Set(store.decisions.map((d) => propId(d.proposal)));
  return allProposals().filter((p) => !done.has(propId(p)));
}

// One plain-English line per proposal. Returns HTML: names are escaped,
// <b> is the only markup.
export function proposalLine(p, plan = store.plan) {
  const name = (id) => engine.exMeta(plan, id)?.name ?? id;
  const where = p.scope ? (plan.sessions[p.scope]?.name ?? p.scope) : null;
  const on = where ? ` on ${esc(where)}` : '';
  switch (p.kind) {
    case 'remove': return `Drop <b>${esc(name(p.exercise))}</b>${where ? ` from ${esc(where)}` : ''}`;
    case 'add': return `Add <b>${esc(name(p.exercise))}</b>${where ? ` to ${esc(where)}` : ''}`;
    case 'swap': return `Swap <b>${esc(name(p.exercise))}</b> for <b>${esc(name(p.replacement))}</b>${on}`;
    case 'reorder': return `Move <b>${esc(name(p.exercise))}</b> earlier${on}`;
    case 'volume': return `Change <b>${esc(name(p.exercise))}</b>${p.sets ? ` to ${p.sets} sets` : '’s volume'}${on}`;
    case 'reprange': return `<b>${esc(name(p.exercise))}</b> reps → ${p.repMin}–${p.repMax}${on}`;
    case 'keep': return `Put <b>${esc(name(p.exercise))}</b> back${on}`;
    default: return esc(`${p.kind} ${p.exercise}`);
  }
}
