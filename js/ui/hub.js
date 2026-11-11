// The planning screen: board, bench, shop, traits, scouting, standings.
import * as G from '../state.js';
import { CARDS, SIGS, STATS, STAT_NAMES, POS_NAMES } from '../data/cards.js';
import { TRAITS } from '../data/traits.js';
import { ALL_SLOTS, SLOT_POS, SLOT_LABEL, SLOT_XY, OFF_SLOTS, DEF_SLOTS, COVERAGE } from '../data/slots.js';
import { gearInfo, COMPONENTS, combine } from '../data/gear.js';
import { HIRES, PERKS, CLASS_LONG, CLASS_NAMES, CLASSIFICATIONS } from '../data/content.js';
import { XP_NEEDED, XP_COST, MAX_LEVEL, sellValue } from '../engine/economy.js';
import { buildSide, activeTraits, countTraits, overall, unitBaseStats } from '../engine/ratings.js';
import { simulateGame } from '../engine/sim.js';
import { regionStandings, records, roundLabel, teamById, isPlayoff, PLAYOFF_NAMES, PRESEASON_ROUNDS, REG_WEEKS, gamesForRound } from '../engine/season.js';
import { shield, helmet, esc, stars } from './art.js';
import { tokenHTML, walkonHTML, cardHTML, shortName, toast } from './common.js';

// ---------- render ----------
export function renderHub(app) {
  const st = app.state;
  const p = st.program;
  const season = st.season;
  const rec = records(season).U;
  const opp = G.opponentFor(st);
  const label = roundLabel(season.round);
  const cap = G.starterCap(st);
  const xpNeed = XP_NEEDED[st.level];
  const prestige = '★'.repeat(Math.floor(p.prestige)) + (p.prestige % 1 ? '½' : '');
  const mod = G.seasonMod(st);

  const top = `<header class="topbar">
  <div class="team-id">${shield(p.colors, p.name, 32)}<div><div class="nm">${esc(p.name)} ${esc(p.mascot)}</div>
  <div class="sub">${season.year} · ${CLASSIFICATIONS[p.classIdx]} Region 1 ${prestige ? `· <span class="amber">${prestige}</span>` : ''}</div></div></div>
  <div class="stat-pill"><span class="k">${esc(label)}</span><span class="v">${rec.w}-${rec.l}</span></div>
  <div class="stat-pill hide-m"><span class="k">Region</span><span class="v">${rec.rw}-${rec.rl}</span></div>
  <div class="stat-pill"><span class="k">Gold</span><span class="v gold-v">$${st.gold}</span></div>
  <div class="stat-pill"><span class="k">Program Lv</span><span class="v">${st.level}</span>${st.level < MAX_LEVEL ? `<div class="xpbar"><i style="width:${(st.xp / xpNeed) * 100}%"></i></div>` : ''}</div>
  <div class="stat-pill hide-m" title="${esc(mod.desc)}"><span class="k">This fall</span><span class="v" style="font-size:16px">${mod.icon} ${esc(mod.name)}</span></div>
  <button class="icon-btn" data-act="menu" title="Menu">☰</button>
  ${opp ? `<button class="btn primary kickoff" data-act="kickoff">Kick off vs ${esc(opp.team.name)} ${opp.home ? '' : opp.neutral ? '(neutral)' : '(away)'} →</button>` : ''}
</header>`;

  const left = `<aside class="left"><div class="panel"><h3>Traits <span class="muted" style="text-transform:none;letter-spacing:0">tap for details</span></h3>${traitsHTML(app)}</div></aside>`;

  const center = `<main class="center">
  <div class="board-wrap">${boardHTML(app, st.board, p.colors, { interactive: true, cap })}</div>
  ${inspectorHTML(app)}
  ${lockerHTML(app)}
  <div class="bench-label"><span>Bench</span><span>${st.bench.filter(Boolean).length}/8</span></div>
  <div class="bench">${st.bench.map((u, i) => benchCellHTML(app, u, i)).join('')}</div>
  <div class="mobile-tabs">${tabsPanel(app, true)}</div>
</main>`;

  const right = `<aside class="right">${tabsPanel(app, false)}</aside>`;

  const owned1 = (id) => G.allUnits(st).filter((u) => u.card === id && u.star === 1).length;
  const shop = `<section class="shopbar">
  <div class="shop-side">
    <button class="btn" data-act="reroll" title="Reroll the shop"><span>🔄<span class="lbl"> Reroll</span></span><span class="cost">${G.rerollCost(st) ? `$${G.rerollCost(st)}` : 'FREE'}</span></button>
    <button class="btn" data-act="xp" title="Buy 4 program XP" ${st.level >= MAX_LEVEL ? 'disabled' : ''}><span>⬆<span class="lbl"> Level up</span></span><span class="cost">$${XP_COST}</span></button>
    <button class="btn ${st.shopLocked ? 'on' : ''}" data-act="lock" title="Keep this shop for next week"><span>${st.shopLocked ? '🔒' : '🔓'}<span class="lbl">${st.shopLocked ? ' Locked' : ' Lock'}</span></span><span></span></button>
    ${opp ? `<button class="btn primary kick-m" data-act="kickoff">Kick off →</button>` : ''}
  </div>
  <div class="shop-cards" style="--n:${st.shop.length}">${st.shop.map((id, i) => {
    const o = id ? owned1(id) : 0;
    return cardHTML(id, p.colors, { idx: i, cant: id && CARDS[id].cost > st.gold, owned: o ? (o >= 2 ? '★★ ready' : `${o} owned`) : '' });
  }).join('')}</div>
</section>`;

  return `<div class="hub">${top}${left}${center}${right}${shop}</div>`;
}

function traitsHTML(app) {
  const st = app.state;
  const list = activeTraits(countTraits(st.board, st.hires));
  if (!list.length) return `<p class="muted" style="font-size:13px">Put players on the field to activate traits. Each player has an origin and a playing style. Starting more players who share one unlocks bonuses.</p>`;
  return `<div class="traits">${list.map((at) => {
    const t = at.trait;
    const bps = t.levels.map((lv, i) => `<span class="${at.level === i + 1 ? 'on' : ''}">${lv.n}</span>`).join(' / ');
    const open = app.ui.openTrait === at.id;
    return `<div class="trait lv${Math.min(3, at.level === t.levels.length && at.level > 0 ? 3 : at.level)} ${open ? 'open' : ''}" data-act="trait" data-id="${at.id}">
      <div class="ti">${t.icon}</div>
      <div><div class="tn">${esc(t.name)} <span class="muted">${at.count}</span></div><div class="tb">${bps}</div></div>
      <div class="tdesc"><div class="muted" style="margin-bottom:3px">${esc(t.blurb)}</div>${t.levels.map((lv, i) => `<div class="${at.level === i + 1 ? 'on' : ''}">(${lv.n}) ${esc(lv.desc)}</div>`).join('')}
      <div class="muted" style="margin-top:4px">Players: ${Object.values(CARDS).filter((c) => c.traits.includes(at.id)).map((c) => `${c.name.split(' ').slice(-1)[0]} (${c.pos}, $${c.cost})`).join(', ')}</div></div>
    </div>`;
  }).join('')}</div>`;
}

export function boardHTML(app, board, colors, { interactive = false, cap = 99, mini = false } = {}) {
  const sel = app?.ui.selected;
  let selPos = null;
  if (interactive && sel?.kind === 'unit') {
    const f = G.findUnit(app.state, sel.uid);
    if (f) selPos = CARDS[f.unit.card].pos;
  }
  const n = ALL_SLOTS.filter((s) => board[s]).length;
  const slots = ALL_SLOTS.map((s) => {
    const u = board[s];
    const [x, y] = SLOT_XY[s];
    const isDef = DEF_SLOTS.includes(s);
    const target = selPos && SLOT_POS[s] === selPos && !(u && u.uid === sel.uid);
    const inner = u ? tokenHTML(u, colors, { flip: isDef, sel: interactive && sel?.kind === 'unit' && sel.uid === u.uid, small: mini })
      : (mini ? walkonHTML(colors, isDef) : `<div class="slot-empty">${SLOT_POS[s]}</div>`);
    const name = u ? shortName(u) : (mini ? '' : (SLOT_LABEL[s].split(' · ')[1] || ''));
    return `<div class="slot ${u ? '' : 'walkon'} ${target ? 'target' : ''}" style="left:${x}%;top:${y}%" ${interactive ? `data-act="slot" data-slot="${s}"` : ''}>${inner}<div class="slot-name">${esc(name)}</div></div>`;
  }).join('');
  return `<div class="board ${mini ? 'mini-board' : ''}">
    <div class="hash" style="left:33%"></div><div class="hash" style="left:67%"></div>
    <div class="los"></div>
    ${mini ? '' : `<span class="side-label def">DEFENSE</span><span class="side-label off">OFFENSE</span>`}
    ${interactive ? `<span class="cap ${n >= cap ? 'full' : ''}">Starters ${n}/${cap}</span>` : ''}
    ${slots}
  </div>`;
}

function benchCellHTML(app, u, i) {
  const sel = app.ui.selected;
  const target = sel?.kind === 'unit' && (!u || u.uid !== sel.uid) && G.findUnit(app.state, sel.uid)?.where === 'board';
  return `<div class="bench-cell ${target ? 'target' : ''}" data-act="bench" data-idx="${i}">${u ? tokenHTML(u, app.state.program.colors, { sel: sel?.kind === 'unit' && sel.uid === u.uid }) + `<span class="bn">${esc(shortName(u))}</span>` : ''}</div>`;
}

function lockerHTML(app) {
  const st = app.state;
  if (!st.components.length) return `<div class="bench-label"><span>Gear locker · empty</span><span class="muted">losses always earn gear</span></div>`;
  const sel = app.ui.selected;
  const selComp = sel?.kind === 'gear' && COMPONENTS[st.components[sel.idx]];
  return `<div class="bench-label"><span>Gear locker · tap gear, then a player</span><span></span></div>
  <div class="locker">${st.components.map((g, i) => {
    const gi = gearInfo(g);
    const isSel = sel?.kind === 'gear' && sel.idx === i;
    const combo = selComp && !isSel && COMPONENTS[g];
    return `<button class="gear-item ${gi.component ? '' : 'full'} ${isSel ? 'sel' : ''} ${combo ? 'combo' : ''}" data-act="gear" data-idx="${i}" title="${esc(gi.name)}: ${esc(gi.desc)}">${gi.icon}</button>`;
  }).join('')}</div>`;
}

function tabsPanel(app, mobile) {
  const tabs = mobile ? ['traits', 'scout', 'standings', 'schedule', 'program'] : ['scout', 'standings', 'schedule', 'program'];
  let tab = mobile ? app.ui.mtab : app.ui.tab;
  if (!tabs.includes(tab)) tab = tabs[mobile ? 1 : 0];
  const names = { traits: 'Traits', scout: 'Scout', standings: 'Standings', schedule: 'Schedule', program: 'Program' };
  let body = '';
  if (tab === 'traits') body = traitsHTML(app);
  if (tab === 'scout') body = scoutHTML(app);
  if (tab === 'standings') body = standingsHTML(app);
  if (tab === 'schedule') body = scheduleHTML(app);
  if (tab === 'program') body = programHTML(app);
  return `<div class="panel"><div class="tabs">${tabs.map((t) => `<button class="tab ${t === tab ? 'on' : ''}" data-act="${mobile ? 'mtab' : 'tab'}" data-tab="${t}">${names[t]}</button>`).join('')}</div><div class="tab-body">${body}</div></div>`;
}

// ---------- scouting ----------
function scoutHTML(app) {
  const st = app.state;
  const opp = G.opponentFor(st);
  if (!opp) return '<p class="muted">No game scheduled.</p>';
  const lineup = G.opponentLineup(st, opp.team);
  const mod = G.seasonMod(st);
  const mine = buildSide(G.userTeam(st), { seasonMod: mod });
  const theirs = buildSide(lineup, { seasonMod: mod });
  const a = overall(mine), b = overall(theirs);
  const rec = records(st.season)[opp.team.id];
  const stand = regionStandings(st.season, opp.team.region);
  const rank = stand.findIndex((x) => x.id === opp.team.id) + 1;
  const tr = theirs.traits.filter((t) => t.level).slice(0, 4);
  const tips = matchupTips(mine, theirs);
  const odds = app.oddsCache?.key === oddsKey(st) ? app.oddsCache.value : null;
  if (!odds) app.requestOdds?.();
  const rival = opp.team.id === st.season.rivalId;
  return `<div class="scout-head">${shield(opp.team.colors, opp.team.name, 34)}<div><div class="nm">${esc(opp.team.name)} ${esc(opp.team.mascot)}</div>
  <div class="muted cond">${rec.w}-${rec.l} (${rec.rw}-${rec.rl} region, #${rank} in Region ${opp.team.region + 1}) · ${esc(opp.team.coach || '')}</div></div></div>
  <div>${rival ? '<span class="tag rival">RIVALRY GAME</span>' : ''}${opp.home ? '<span class="tag">Home</span>' : opp.neutral ? '<span class="tag">Neutral site</span>' : '<span class="tag">Away</span>'}${isPlayoff(st.season.round) ? '<span class="tag hot">PLAYOFFS</span>' : ''}<span class="tag">Scheme: ${TRAITS[opp.team.style].icon} ${esc(TRAITS[opp.team.style].name)}</span></div>
  <div class="compare">
    <div class="a">${a.off}</div><div class="lbl">Offense</div><div class="b">${b.off}</div>
    <div class="a">${a.def}</div><div class="lbl">Defense</div><div class="b">${b.def}</div>
    <div class="a">${a.ovr}</div><div class="lbl">Overall</div><div class="b">${b.ovr}</div>
    <div class="a amber">${odds == null ? '…' : `${Math.round(odds * 100)}%`}</div><div class="lbl">Win odds</div><div class="b">${odds == null ? '' : `${Math.round((1 - odds) * 100)}%`}</div>
  </div>
  <div class="muted cond" style="font-size:12px;margin-bottom:4px">You (left) vs them (right). Odds come from 40 quick sims of your current lineup.</div>
  ${tr.length ? `<div style="margin:6px 0">${tr.map((t) => `<span class="tag hot">${t.trait.icon} ${esc(t.trait.name)} ${t.count}</span>`).join('')}</div>` : ''}
  ${boardHTML(null, lineup.board, opp.team.colors, { mini: true })}
  <ul class="tips">${tips.map((t) => `<li>${t}</li>`).join('')}</ul>`;
}

export function oddsKey(st) {
  return JSON.stringify([st.season.round, st.season.year, ALL_SLOTS.map((s) => st.board[s] ? [st.board[s].card, st.board[s].star, st.board[s].items, st.board[s].dev, st.board[s].perk] : 0), st.hires]);
}

export function computeOdds(st, n = 40) {
  const opp = G.opponentFor(st);
  if (!opp) return null;
  const mod = G.seasonMod(st);
  const big = G.isBigGame(st, opp.team.id);
  const me = buildSide(G.userTeam(st), { seasonMod: mod, home: opp.home, bigGame: big });
  const them = buildSide(G.opponentLineup(st, opp.team), { seasonMod: mod, home: !opp.home && !opp.neutral, bigGame: big });
  let w = 0;
  for (let i = 0; i < n; i++) {
    const g = opp.home ? simulateGame(me, them, { seed: 7 + i * 31, seasonMod: mod }) : simulateGame(them, me, { seed: 7 + i * 31, seasonMod: mod });
    if ((opp.home && g.winner === 0) || (!opp.home && g.winner === 1)) w++;
  }
  return w / n;
}

const FRIENDLY = { DB1: 'left corner', DB2: 'right corner', DB3: 'nickel', LB1: 'linebacker on the TE', LB2: 'linebacker on the RB', WR1: 'left WR', WR2: 'right WR', WR3: 'slot WR', TE: 'tight end', RB: 'running back' };

function matchupTips(mine, theirs) {
  const tips = [];
  const P = (side, k) => side.players[k];
  const route = (p) => p.stats.spd * 0.45 + p.stats.hnd * 0.25 + p.stats.iq * 0.3;
  const cover = (p) => p.stats.spd * 0.45 + p.stats.iq * 0.35 + p.stats.hnd * 0.2;
  // Their best receiver vs your coverage
  const recs = ['WR1', 'WR2', 'WR3', 'TE', 'RB'];
  const best = recs.slice().sort((x, y) => route(P(theirs, y)) - route(P(theirs, x)))[0];
  const myCov = COVERAGE[best];
  const bp = P(theirs, best), cp = P(mine, myCov);
  const gap = Math.round(route(bp) - cover(cp));
  tips.push(`Their top target is the <b>${FRIENDLY[best]}</b> (${esc(bp.walkon ? 'walk-on' : bp.name)}). Your <b>${FRIENDLY[myCov]}</b> covers him: ${cp.walkon ? '<span class="bad">a walk-on</span>' : esc(cp.name)}${gap > 8 ? ' <span class="bad">and he’s overmatched</span>' : gap < -5 ? ' <span class="good">and has the edge</span>' : ''}.`);
  // Your best receiver vs their coverage
  const myBest = recs.slice().sort((x, y) => route(P(mine, y)) - route(P(mine, x)))[0];
  const theirCov = P(theirs, COVERAGE[myBest]);
  if (theirCov.walkon) tips.push(`Their <b>${FRIENDLY[COVERAGE[myBest]]}</b> is a walk-on. Your ${FRIENDLY[myBest]} should feast.`);
  // Weak spots on their defense
  const weakD = ['DB1', 'DB2', 'DB3', 'LB1', 'LB2'].filter((k) => P(theirs, k).walkon);
  if (weakD.length >= 2) tips.push(`They have walk-ons at ${weakD.map((k) => FRIENDLY[k]).join(', ')}. Line up your best receivers against them.`);
  // Lines
  const ol = (s) => (P(s, 'OL1').stats.str + P(s, 'OL2').stats.str) / 2 + (s.mods.lineO || 0);
  const dl = (s) => (P(s, 'DL1').stats.str + P(s, 'DL2').stats.str) / 2 + (s.mods.lineD || 0);
  if (dl(theirs) - ol(mine) > 10) tips.push('Their defensive line is much stronger than your offensive line. Expect pressure. A scrambling QB or Trench players will help.');
  if (ol(mine) - dl(theirs) > 10) tips.push('You should win up front. Ground & Pound and a strong RB will take advantage.');
  const myEmpty = ALL_SLOTS.filter((k) => P(mine, k).walkon).length;
  if (myEmpty) tips.push(`You have ${myEmpty} walk-on${myEmpty > 1 ? 's' : ''} on the field. Fill spots from your bench or level up your program to start more players.`);
  return tips;
}

// ---------- standings ----------
function standingsHTML(app) {
  const st = app.state;
  const s = st.season;
  let html = '';
  if (s.playoff) html += bracketHTML(st);
  html += regionTable(st, 0, true);
  html += `<button class="btn small" data-act="all-standings" style="margin-top:10px">All regions</button>`;
  return html;
}

export function regionTable(st, region, compact) {
  const list = regionStandings(st.season, region);
  return `<div class="region-title">Region ${region + 1}${region === 0 ? ' (yours)' : ''} · top 4 make the playoffs</div>
  <table class="stand"><tr><th>#</th><th>Team</th><th class="num">Reg</th><th class="num">All</th>${compact ? '' : '<th class="num">PF</th><th class="num">PA</th>'}</tr>
  ${list.map((r, i) => `<tr class="${r.id === 'U' ? 'me' : ''} ${i === 4 ? 'cut' : ''}"><td>${i + 1}</td><td class="tm"><span class="dotc" style="background:${r.team.colors.main}"></span>${esc(r.team.name)}${r.id === st.season.rivalId ? ' ⚔️' : ''}</td><td class="num">${r.rw}-${r.rl}</td><td class="num">${r.w}-${r.l}</td>${compact ? '' : `<td class="num">${r.pf}</td><td class="num">${r.pa}</td>`}</tr>`).join('')}
  </table>`;
}

export function bracketHTML(st) {
  const s = st.season;
  const pf = s.playoff;
  if (!pf) return '';
  const nm = (id) => (id === 'U' ? st.program.name : teamById(s, id).name);
  const resultFor = (a, b) => s.results.find((g) => g.playoff && ((g.home === a && g.away === b) || (g.home === b && g.away === a)));
  const cols = PLAYOFF_NAMES.map((title, r) => {
    const field = pf.rounds[r];
    if (!field) return `<div class="br-col"><h5>${title}</h5><div class="muted">TBD</div></div>`;
    const games = [];
    for (let i = 0; i < field.length; i += 2) {
      const A = field[i], B = field[i + 1];
      const g = resultFor(A.id, B.id);
      const sc = (id) => (g ? (g.home === id ? g.score[0] : g.score[1]) : '');
      const lost = (id) => g && sc(id) < sc(id === A.id ? B.id : A.id);
      games.push(`<div class="br-game">${[A, B].map((t) => `<div class="br-team ${t.id === 'U' ? 'me' : ''} ${lost(t.id) ? 'lost' : ''}"><span>${t.seed}. ${esc(nm(t.id))}</span><b>${sc(t.id)}</b></div>`).join('')}</div>`);
    }
    return `<div class="br-col"><h5>${title}</h5>${games.join('')}</div>`;
  }).join('');
  return `<div class="region-title">State playoffs ${pf.champion ? `· Champion: <span class="amber">${esc(nm(pf.champion))}</span>` : ''}</div><div class="bracket">${cols}</div>`;
}

// ---------- schedule ----------
function scheduleHTML(app) {
  const st = app.state;
  const s = st.season;
  const rows = [];
  const total = PRESEASON_ROUNDS + REG_WEEKS + (s.playoff ? s.playoff.rounds.length : 0);
  for (let r = 0; r < total; r++) {
    const games = gamesForRound(s, r);
    const g = games.find((x) => x.home === 'U' || x.away === 'U');
    if (!g) continue;
    const oppId = g.home === 'U' ? g.away : g.home;
    const opp = teamById(s, oppId);
    const res = s.results.find((x) => x.round === r && (x.home === 'U' || x.away === 'U'));
    let right = '';
    if (res) {
      const my = res.home === 'U' ? res.score[0] : res.score[1];
      const th = res.home === 'U' ? res.score[1] : res.score[0];
      right = `<span class="${my > th ? 'res-w' : 'res-l'}">${my > th ? 'W' : 'L'} ${my}-${th}${res.ot ? ' OT' : ''}</span>`;
    } else if (r === s.round) right = '<span class="amber">NEXT</span>';
    const tag = g.region ? '' : g.preseason ? ' <span class="muted">(exh)</span>' : g.playoff ? ' 🏆' : ' <span class="muted">(non-region)</span>';
    rows.push(`<div class="sched-row ${r === s.round ? 'now' : ''}"><span class="wk">${esc(roundLabel(r).replace('Preseason ', ''))}</span><span>${g.home === 'U' ? 'vs' : '@'} ${esc(opp.name)}${oppId === s.rivalId ? ' ⚔️' : ''}${tag}</span>${right}</div>`);
  }
  return rows.join('');
}

// ---------- program ----------
function programHTML(app) {
  const st = app.state;
  const p = st.program;
  const mod = G.seasonMod(st);
  const hires = st.hires.length ? st.hires.map((h) => `<div class="hire-row"><span class="hi">${HIRES[h].icon}</span><div><div class="hn">${esc(HIRES[h].name)}</div><div class="hd">${esc(HIRES[h].desc)}</div></div></div>`).join('')
    : '<p class="muted" style="font-size:13px">No hires yet. You pick a coaching hire before Weeks 1, 4 and 8.</p>';
  const hist = p.history.length ? p.history.map((h) => `<div class="history-row"><span>${h.year} (${h.cls})</span><span>${h.w}-${h.l}</span><span class="muted">${esc(h.result)}</span></div>`).join('') : '<p class="muted" style="font-size:13px">First season. Seniors graduate at the end of the year; everyone else comes back better.</p>';
  return `<div class="region-title">This fall</div><div class="hire-row"><span class="hi">${mod.icon}</span><div><div class="hn">${esc(mod.name)}</div><div class="hd">${esc(mod.desc)}</div></div></div>
  <div class="region-title">Coaching staff</div>${hires}
  <div class="region-title">Program</div>
  <div class="cond" style="font-weight:600">Classification: ${CLASSIFICATIONS[p.classIdx]} · Prestige: ${p.prestige} · State titles: ${p.titles}</div>
  <div class="muted" style="font-size:12.5px;margin:4px 0">Win state and you move up a classification, where opponents are tougher. Prestige raises your starting gold and Signing Day quality.</div>
  ${hist}`;
}

// ---------- inspector ----------
function inspectorHTML(app) {
  const st = app.state;
  const sel = app.ui.selected;
  if (!sel) return '';
  if (sel.kind === 'gear') {
    const g = st.components[sel.idx];
    if (!g) return '';
    const gi = gearInfo(g);
    let combos = '';
    if (gi.component) {
      combos = `<div class="insp-meta" style="margin-top:8px"><b>Combines into:</b>${Object.keys(COMPONENTS).map((c) => { const m = combine(g, c); return `<div>${COMPONENTS[c].icon} + → ${m.icon} <b>${esc(m.name)}</b>: ${esc(m.desc)}</div>`; }).join('')}</div>`;
    }
    return `<div class="inspector"><button class="insp-close" data-act="deselect">×</button>
    <div class="insp-top"><div class="gear-item ${gi.component ? '' : 'full'}" style="width:56px;height:56px;font-size:28px">${gi.icon}</div><div><div class="insp-name">${esc(gi.name)}</div><div class="insp-sub">${esc(gi.desc)}</div></div></div>
    <p class="muted" style="font-size:13px;margin:8px 0 0">Tap a player to equip. ${gi.component ? 'Tap another component in the locker to combine them, or give two to the same player.' : ''}</p>${combos}</div>`;
  }
  const f = G.findUnit(st, sel.uid);
  if (!f) return '';
  const u = f.unit;
  const card = CARDS[u.card];
  const sig = SIGS[card.sig];
  const base = unitBaseStats(u);
  let eff = null;
  if (f.where === 'board') eff = buildSide(G.userTeam(st), { seasonMod: G.seasonMod(st) }).players[f.slot].stats;
  const statsHTML = STATS.map((s) => {
    const b = Math.round(base[s]);
    const e = eff ? eff[s] : null;
    return `<div class="insp-stat"><div class="k">${STAT_NAMES[s]}</div><div class="v">${e ?? b}${e != null && e - b > 0 ? ` <small>+${e - b}</small>` : ''}</div></div>`;
  }).join('');
  const items = u.items.map((g) => { const gi = gearInfo(g); return `${gi.icon} <b>${esc(gi.name)}</b> (${esc(gi.desc)})`; }).join('<br>') || '<span class="muted">none</span>';
  const traits = card.traits.map((t) => `${TRAITS[t].icon} <b>${esc(TRAITS[t].name)}</b>`).join(' · ');
  const value = sellValue(u, card.cost);
  return `<div class="inspector"><button class="insp-close" data-act="deselect">×</button>
  <div class="insp-top">${tokenHTML(u, st.program.colors, {})}<div><div class="insp-name">${esc(card.name)} ${stars(u.star)}</div>
  <div class="insp-sub">${POS_NAMES[card.pos]} · ${CLASS_LONG[u.cls]} · $${card.cost} tier ${card.tier}</div></div></div>
  <div class="insp-stats">${statsHTML}</div>
  <div class="insp-meta">
   <div>${traits}</div>
   <div><b>${esc(sig.name)}:</b> ${esc(sig.desc)}</div>
   <div><b>Gear:</b> ${items}</div>
   <div><b>Development:</b> level ${u.dev} <span class="devbar"><i style="width:${(u.xp / 5) * 100}%"></i></span> ${u.perk ? ` · ${PERKS[u.perk].icon} <b>${esc(PERKS[u.perk].name)}</b>: ${esc(PERKS[u.perk].desc)}` : ''}</div>
   ${u.cls >= 3 ? '<div class="amber">Senior: graduates after this season.</div>' : ''}
  </div>
  <div class="insp-actions">
   ${f.where === 'bench' ? `<button class="btn primary small" data-act="start">Put on field</button>` : `<button class="btn small" data-act="tobench">Move to bench</button>`}
   <button class="btn danger small" data-act="sell">Sell for $${value}</button>
   <span class="muted" style="font-size:12px;align-self:center">${f.where === 'bench' ? `Tap a highlighted ${card.pos} spot to place him.` : 'Tap another spot or a bench cell to move him.'}</span>
  </div></div>`;
}

// ---------- events ----------
export function hubClick(app, el) {
  const st = app.state;
  const act = el.dataset.act;
  const sel = app.ui.selected;
  const res = (r, okMsg) => { if (!r.ok) toast(r.msg, 'err'); else if (okMsg) toast(okMsg, 'good'); return r.ok; };

  switch (act) {
    case 'slot': {
      const slot = el.dataset.slot;
      const u = st.board[slot];
      if (sel?.kind === 'gear') {
        if (!u) return toast('Tap a player to give him the gear.', 'err');
        const r = G.equip(st, sel.idx, u.uid);
        if (res(r, r.made ? `Crafted ${r.made.icon} ${r.made.name}!` : null)) app.ui.selected = null;
        break;
      }
      if (sel?.kind === 'unit') {
        if (u && u.uid === sel.uid) { app.ui.selected = null; break; }
        const f = G.findUnit(st, sel.uid);
        if (f && CARDS[f.unit.card].pos !== SLOT_POS[slot]) {
          if (u) { app.ui.selected = { kind: 'unit', uid: u.uid }; break; }
          toast(`${CARDS[f.unit.card].pos} can't play ${SLOT_POS[slot]}.`, 'err');
          break;
        }
        if (res(G.move(st, sel.uid, { slot }))) app.ui.selected = null;
        break;
      }
      if (u) app.ui.selected = { kind: 'unit', uid: u.uid };
      else toast(`Empty ${SLOT_POS[slot]} spot. A walk-on plays here. Select a ${SLOT_POS[slot]} from your bench.`);
      break;
    }
    case 'bench': {
      const i = Number(el.dataset.idx);
      const u = st.bench[i];
      if (sel?.kind === 'gear') {
        if (!u) return;
        const r = G.equip(st, sel.idx, u.uid);
        if (res(r, r.made ? `Crafted ${r.made.icon} ${r.made.name}!` : null)) app.ui.selected = null;
        break;
      }
      if (sel?.kind === 'unit') {
        if (u && u.uid === sel.uid) { app.ui.selected = null; break; }
        const f = G.findUnit(st, sel.uid);
        if (f?.where === 'bench' && u) { app.ui.selected = { kind: 'unit', uid: u.uid }; break; }
        if (res(G.move(st, sel.uid, { bench: i }))) app.ui.selected = null;
        break;
      }
      if (u) app.ui.selected = { kind: 'unit', uid: u.uid };
      break;
    }
    case 'shop': {
      const r = G.buy(st, Number(el.dataset.idx));
      if (r.ok && r.merged) toast(`${CARDS[r.merged.card].name} upgraded to ${'★'.repeat(r.merged.star)}!`, 'good');
      else if (!r.ok) toast(r.msg, 'err');
      break;
    }
    case 'reroll': res(G.reroll(st)); break;
    case 'xp': {
      const lv = st.level;
      if (res(G.buyXP(st)) && st.level > lv) toast(`Program level ${st.level}! You can start ${G.starterCap(st)} players.`, 'good');
      break;
    }
    case 'lock': st.shopLocked = !st.shopLocked; break;
    case 'gear': {
      const i = Number(el.dataset.idx);
      if (sel?.kind === 'gear' && sel.idx !== i && COMPONENTS[st.components[sel.idx]] && COMPONENTS[st.components[i]]) {
        const r = G.craft(st, sel.idx, i);
        if (res(r, `Crafted ${r.made?.icon} ${r.made?.name}!`)) app.ui.selected = null;
        break;
      }
      app.ui.selected = sel?.kind === 'gear' && sel.idx === i ? null : { kind: 'gear', idx: i };
      break;
    }
    case 'deselect': app.ui.selected = null; break;
    case 'sell': {
      if (sel?.kind !== 'unit') break;
      const f = G.findUnit(st, sel.uid);
      const r = G.sell(st, sel.uid);
      if (res(r, `Sold ${CARDS[f.unit.card].name} for $${r.value}.`)) app.ui.selected = null;
      break;
    }
    case 'start': if (sel?.kind === 'unit' && res(G.autoPlace(st, sel.uid))) app.ui.selected = null; break;
    case 'tobench': {
      if (sel?.kind !== 'unit') break;
      const bi = st.bench.indexOf(null);
      if (bi < 0) { toast('Bench is full.', 'err'); break; }
      if (res(G.move(st, sel.uid, { bench: bi }))) app.ui.selected = null;
      break;
    }
    case 'trait': app.ui.openTrait = app.ui.openTrait === el.dataset.id ? null : el.dataset.id; break;
    case 'tab': app.ui.tab = el.dataset.tab; break;
    case 'mtab': app.ui.mtab = el.dataset.tab; break;
    default: return false;
  }
  return true;
}
