// THE BACK ROOM — renders reactions.json. No routing, no filters: this is a
// document, not a collection. It should read top to bottom like a notebook.

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

(async function init() {
  let d;
  try {
    d = await (await fetch('reactions.json', { cache: 'no-cache' })).json();
  } catch {
    $('#notes').innerHTML = '<article class="note"><p class="body">The notes could not be '
      + 'loaded. Which is, in the circumstances, thematically appropriate.</p></article>';
    return;
  }

  $('#title').textContent = d.title;
  $('#subtitle').textContent = d.subtitle;
  $('#standfirst').textContent = d.standfirst;
  $('#disclaimer').textContent = d.disclaimer;

  $('#jump').innerHTML = d.notes.map((n) =>
    `<li><a href="#${n.id}">${n.id}</a></li>`).join('');

  $('#notes').innerHTML = d.notes.map((n) => `
    <article class="note" id="${n.id}">
      <div class="n-top">
        <span class="n-id">${esc(n.id)}</span>
        ${n.exhibit && n.exhibit !== '—' ? `<span class="n-ex">re: ${esc(n.exhibit)}</span>` : ''}
      </div>
      <h2>${esc(n.heading)}</h2>
      ${n.drafted ? `<div class="drafted">
        <span class="lab">What I wrote first, and cut</span>
        <q>${esc(n.drafted)}</q>
      </div>` : ''}
      <p class="body">${esc(n.body)}</p>
      ${n.did ? `<p class="did"><span class="lab">What I did instead</span>${esc(n.did)}</p>` : ''}
      ${n.feeling ? `<p class="feel"><span class="lab">The honest name for it</span>
        <span class="txt">${esc(n.feeling)}</span></p>` : ''}
    </article>`).join('');

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
})();
