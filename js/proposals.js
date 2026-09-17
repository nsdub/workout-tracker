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

// One plain-English line per proposal, written once. `proposalLine` returns
// HTML for the sheets (names escaped, <b> the only markup) and
// `proposalText` returns the same sentence in plain text for a toast, which
// sets textContent and would otherwise print the tags. Two describers drifted
// apart the moment one of them was edited, so there is only this one.
function describe(p, plan, b, e) {
  const name = (id) => e(engine.exMeta(plan, id)?.name ?? id);
  const where = p.scope ? (plan.sessions[p.scope]?.name ?? p.scope) : null;
  const on = where ? ` on ${e(where)}` : '';
  switch (p.kind) {
    case 'remove': return `Drop ${b(name(p.exercise))}${where ? ` from ${e(where)}` : ''}`;
    case 'add': return `Add ${b(name(p.exercise))}${where ? ` to ${e(where)}` : ''}`;
    case 'swap': return `Swap ${b(name(p.exercise))} for ${b(name(p.replacement))}${on}`;
    case 'reorder': return `Move ${b(name(p.exercise))} earlier${on}`;
    case 'volume': return `Change ${b(name(p.exercise))}${p.sets ? ` to ${p.sets} sets` : '’s volume'}${on}`;
    case 'reprange': return `${b(name(p.exercise))} reps → ${p.repMin}–${p.repMax}${on}`;
    case 'keep': return `Put ${b(name(p.exercise))} back${on}`;
    default: return e(`${p.kind} ${p.exercise}`);
  }
}

export function proposalLine(p, plan = store.plan) {
  return describe(p, plan, (s) => `<b>${s}</b>`, esc);
}

export function proposalText(p, plan = store.plan) {
  return describe(p, plan, (s) => s, (s) => s);
}
