// App controller: screens, event wiring, save/load, flow between planning, games and modals.
import * as G from './state.js';
import { TEAM_COLORS } from './data/content.js';
import { renderHub, hubClick, oddsKey, computeOdds } from './ui/hub.js';
import { playGame } from './ui/game.js';
import { signingModal, hireModal, postgameModal, seasonEndModal, helpModal, menuModal, allStandingsModal } from './ui/modals.js';
import { toast, isModalOpen } from './ui/common.js';
import { helmet, logoMark, esc, shield } from './ui/art.js';

const appEl = document.getElementById('app');
const PREFS_KEY = 'preptactics.prefs';

const app = {
  state: null,
  screen: 'title',
  ui: { selected: null, tab: 'scout', mtab: 'traits', openTrait: null },
  prefs: loadPrefs(),
  oddsCache: null,
  savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(app.prefs)); } catch (e) { /* ignore */ } },
  goTitle() { app.screen = 'title'; render(); },
};
window.__app = app; // handy for debugging in the console
app.render = () => render();

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch (e) { return {}; }
}

// ---------- render ----------
function render() {
  if (app.screen === 'title') appEl.innerHTML = titleHTML();
  else if (app.screen === 'setup') appEl.innerHTML = setupHTML();
  else if (app.screen === 'hub') {
    const scroll = window.scrollY;
    const tabBodies = [...document.querySelectorAll('.tab-body')].map((e) => e.scrollTop);
    appEl.innerHTML = renderHub(app);
    window.scrollTo(0, scroll);
    document.querySelectorAll('.tab-body').forEach((e, i) => { e.scrollTop = tabBodies[i] || 0; });
    showPending();
  }
}

function titleHTML() {
  const saved = G.load();
  return `<div class="title-screen">
  <div class="lights l"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
  <div class="lights r"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
  ${logoMark()}
  <div class="tagline">Friday night auto-battler</div>
  <div class="title-buttons">
   ${saved ? `<button class="btn primary big" data-t="continue">Continue · ${esc(saved.program.name)} ${saved.season.year}</button>` : ''}
   <button class="btn ${saved ? '' : 'primary'} big" data-t="new">New program</button>
   <button class="btn" data-t="help">How to play</button>
  </div>
  <div class="title-field"></div>
  <div class="title-foot">Recruit. Stack traits. Make the playoffs. Win state.</div>
  </div>`;
}

let setup = null;
function setupHTML() {
  if (!setup) setup = { name: 'Oak Valley', mascot: 'Rams', color: 0 };
  const c = TEAM_COLORS[setup.color];
  return `<div class="setup">
   <button class="btn small" data-t="back">← Back</button>
   <h1>Start your program</h1>
   <p class="muted">You're the new head coach. Name your school and pick your colors. You start in 3A Region 1.</p>
   <label class="field-label" for="nm">School</label>
   <input id="nm" class="text-in" maxlength="22" value="${esc(setup.name)}" autocomplete="off">
   <label class="field-label" for="ms">Mascot</label>
   <input id="ms" class="text-in" maxlength="16" value="${esc(setup.mascot)}" autocomplete="off">
   <label class="field-label">Colors</label>
   <div class="swatches">${TEAM_COLORS.map((col, i) => `<button class="swatch ${i === setup.color ? 'on' : ''}" data-t="color" data-i="${i}" style="background:${col.main}" title="${col.name}"><span style="width:40%;height:40%;border-radius:50%;background:${col.alt}"></span></button>`).join('')}</div>
   <div class="setup-preview" id="pv">${helmet(c, { num: 7 })}${shield(c, setup.name, 44)}<div><div class="disp" style="font-size:28px">${esc(setup.name)} ${esc(setup.mascot)}</div><div class="muted cond">${c.name}</div></div></div>
   <button class="btn primary big" style="width:100%" data-t="start">Start the season →</button>
  </div>`;
}

// ---------- events ----------
appEl.addEventListener('click', (e) => {
  const t = e.target.closest('[data-t]');
  if (t) return titleAction(t);
  const a = e.target.closest('[data-act]');
  if (!a || app.screen !== 'hub') return;
  const act = a.dataset.act;
  if (act === 'kickoff') return kickoff();
  if (act === 'menu') return menuModal(app);
  if (act === 'all-standings') return allStandingsModal(app);
  if (hubClick(app, a)) { persist(); render(); }
});

appEl.addEventListener('input', (e) => {
  if (app.screen !== 'setup') return;
  if (e.target.id === 'nm') setup.name = e.target.value;
  if (e.target.id === 'ms') setup.mascot = e.target.value;
  const pv = document.getElementById('pv');
  const c = TEAM_COLORS[setup.color];
  if (pv) pv.innerHTML = `${helmet(c, { num: 7 })}${shield(c, setup.name || 'School', 44)}<div><div class="disp" style="font-size:28px">${esc(setup.name)} ${esc(setup.mascot)}</div><div class="muted cond">${c.name}</div></div>`;
});

// Escape closes the inspector
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && app.screen === 'hub' && app.ui.selected) { app.ui.selected = null; render(); }
});

function titleAction(t) {
  const k = t.dataset.t;
  if (k === 'help') return helpModal();
  if (k === 'continue') {
    app.state = G.load();
    if (!app.state) { toast('Could not load your save.', 'err'); return; }
    app.screen = 'hub'; app.ui.selected = null; render();
    if (app.state.phase === 'seasonEnd') seasonEndModal(app, afterSeason);
    return;
  }
  if (k === 'new') { setup = null; app.screen = 'setup'; render(); return; }
  if (k === 'back') { app.screen = 'title'; render(); return; }
  if (k === 'color') { setup.color = Number(t.dataset.i); render(); return; }
  if (k === 'start') {
    const name = (setup.name || '').trim() || 'Oak Valley';
    const mascot = (setup.mascot || '').trim() || 'Rams';
    app.state = G.newGame({ name, mascot, colors: TEAM_COLORS[setup.color] });
    app.screen = 'hub';
    app.ui = { selected: null, tab: 'scout', mtab: 'traits', openTrait: null };
    persist();
    render();
    if (!app.prefs.seenHelp) { app.prefs.seenHelp = true; app.savePrefs(); helpModal(); }
  }
}

function persist() {
  if (app.state) G.save(app.state);
}

// Signing Day and hires pop up when they're waiting.
function showPending() {
  const st = app.state;
  if (!st || isModalOpen() || app.screen !== 'hub' || app.holdPending) return;
  const p = st.pending[0];
  if (!p) return;
  const done = () => { persist(); render(); };
  if (p.type === 'signing') signingModal(app, p, done);
  else if (p.type === 'hire') hireModal(app, p, done);
}

function kickoff() {
  const st = app.state;
  if (st.pending.length) { showPending(); return; }
  const benchStarters = st.bench.filter(Boolean).length;
  const open = G.starterCap(st) - G.starters(st);
  if (open > 0 && benchStarters > 0 && !app._warned) {
    app._warned = true;
    toast(`You can start ${open} more player${open > 1 ? 's' : ''}. Tap Kick off again to play anyway.`);
    setTimeout(() => { app._warned = false; }, 5000);
    return;
  }
  app._warned = false;
  app.ui.selected = null;
  const ug = G.playRound(st);
  persist();
  app.holdPending = true; // Signing Day / hires wait until the postgame closes
  playGame(app, ug, () => {
    render();
    postgameModal(app, ug, () => {
      app.holdPending = false;
      if (st.phase === 'seasonEnd') seasonEndModal(app, afterSeason);
      else render();
    });
  });
}

function afterSeason() {
  persist();
  app.ui.selected = null;
  render();
  toast(`Welcome to the ${app.state.season.year} season.`, 'good');
}

// ---------- background win-odds sims ----------
let oddsTimer = 0;
app.requestOdds = () => {
  clearTimeout(oddsTimer);
  oddsTimer = setTimeout(() => {
    const st = app.state;
    if (!st || app.screen !== 'hub') return;
    const key = oddsKey(st);
    if (app.oddsCache?.key === key) return;
    const value = computeOdds(st, 40);
    app.oddsCache = { key, value };
    if (!isModalOpen()) render();
  }, 350);
};

render();
