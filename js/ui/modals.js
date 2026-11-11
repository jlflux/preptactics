// Modals: Signing Day, coaching hires, postgame, season end, help, menu.
import * as G from '../state.js';
import { CARDS, SIGS, POS_NAMES } from '../data/cards.js';
import { TRAITS } from '../data/traits.js';
import { COMPONENTS, gearInfo } from '../data/gear.js';
import { HIRES, PERKS, CLASS_LONG, CLASSIFICATIONS } from '../data/content.js';
import { statSummary, fantasyPoints } from '../engine/sim.js';
import { records, regionStandings, roundLabel, teamById, isPreseason, isPlayoff } from '../engine/season.js';
import { helmet, shield, esc, stars } from './art.js';
import { showModal, tokenHTML } from './common.js';
import { regionTable, bracketHTML } from './hub.js';

export function signingModal(app, pending, onDone) {
  const st = app.state;
  const html = `<div class="kicker">Signing Day</div><h2>Pick one recruit</h2>
  <p>He joins your bench for free with a piece of gear. ${pending.losses >= 2 ? '<span class="amber">Your losses earned you a higher-tier option.</span>' : 'Losing streaks and losses add more options at later Signing Days.'}${pending.extraComponents ? ` Your equipment manager adds ${pending.extraComponents} extra gear.` : ''}</p>
  <div class="choice-grid">${pending.options.map((o, i) => {
    const c = CARDS[o.card];
    const g = COMPONENTS[o.gear];
    return `<button class="choice recruit" data-i="${i}" style="border-color:var(--t${c.tier})">
      <div style="display:flex;align-items:center;gap:8px">${helmet(st.program.colors, { num: c.num })}<div><div class="ch-name">${esc(c.name)}</div><div class="muted cond">${POS_NAMES[c.pos]} · $${c.cost}</div></div></div>
      <div class="ch-desc">${c.traits.map((t) => `${TRAITS[t].icon} ${esc(TRAITS[t].name)}`).join(' · ')}</div>
      <div class="ch-desc"><b>${esc(SIGS[c.sig].name)}:</b> ${esc(SIGS[c.sig].desc)}</div>
      <div class="ch-gear">+ ${g.icon} ${esc(g.name)} (${esc(g.desc)})</div>
    </button>`;
  }).join('')}</div>`;
  showModal(html, (el, close) => {
    el.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => { G.choose(st, Number(b.dataset.i)); close(); onDone(); }));
  });
}

export function hireModal(app, pending, onDone) {
  const st = app.state;
  const html = `<div class="kicker">Coaching hire</div><h2>Add one to your staff</h2>
  <p>Hires last for the rest of this season. A new staff is hired each fall.</p>
  <div class="choice-grid">${pending.options.map((h, i) => `<button class="choice" data-i="${i}"><span class="ch-icon">${HIRES[h].icon}</span><div class="ch-name">${esc(HIRES[h].name)}</div><div class="ch-desc">${esc(HIRES[h].desc)}</div></button>`).join('')}</div>`;
  showModal(html, (el, close) => {
    el.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => { G.choose(st, Number(b.dataset.i)); close(); onDone(); }));
  });
}

export function postgameModal(app, ug, onDone) {
  const st = app.state;
  const lg = st.lastGame;
  const [H, A] = ug.sides;
  const me = ug.userIdx;
  const won = ug.sim.winner === me;
  const box = ug.sim.box[me];
  const perfs = Object.values(box).filter((l) => !l.walkon).sort((a, b) => fantasyPoints(b) - fantasyPoints(a)).slice(0, 4);
  const potg = ug.sim.potgBySide[me];
  const potgUnit = potg?.uid ? G.findUnit(st, potg.uid)?.unit : null;
  const rw = lg.rewards;
  const goldTotal = rw.gold.reduce((s, [, g]) => s + g, 0);
  const oppTeam = teamById(st.season, ug.oppId);
  const pre = isPreseason(lg.round);
  const playoff = isPlayoff(lg.round);
  const stand = regionStandings(st.season, 0);
  const myRank = stand.findIndex((x) => x.id === 'U') + 1;
  let note = '';
  if (pre) note = 'Preseason game: it does not count toward your record.';
  else if (playoff) note = won ? (st.season.playoff?.champion === 'U' ? 'STATE CHAMPIONS!' : 'You advance in the playoffs.') : 'Your season is over.';
  else note = `You're #${myRank} in Region 1. Top 4 make the playoffs.`;
  const devNames = [...new Set(rw.devUps)].map((uid) => G.findUnit(st, uid)?.unit).filter(Boolean).map((u) => CARDS[u.card].name.split(' ').slice(-1)[0]);
  const html = `<div class="final-banner"><div class="kicker">${esc(roundLabel(lg.round))}${lg.ot ? ' · Overtime' : ''}</div><div class="wl ${won ? 'w' : 'l'}">${won ? 'WIN' : 'LOSS'}</div>
  <div class="final-score">
   <div class="fs">${shield(H.colors, H.name, 40)}<span class="pts">${ug.sim.score[0]}</span><span class="tn">${esc(H.short)}</span></div>
   <span class="muted disp" style="font-size:26px">–</span>
   <div class="fs">${shield(A.colors, A.name, 40)}<span class="pts">${ug.sim.score[1]}</span><span class="tn">${esc(A.short)}</span></div>
  </div><p style="margin:10px 0 0">${esc(note)}</p></div>
  <div class="pg-grid">
   <div class="pg-box"><h4>${won ? 'Player of the game' : 'Your best player'}</h4>${potg ? `<div class="potg">${potgUnit ? tokenHTML(potgUnit, st.program.colors, {}) : ''}<div><div class="disp" style="font-size:22px">${esc(potg.name)}</div><div class="muted" style="font-size:13px">${esc(statSummary(potg))}</div></div></div>` : '<span class="muted">—</span>'}
    <h4 style="margin-top:10px">Top performers</h4>${perfs.map((l) => `<div class="perf"><b>${esc(l.name)}</b> <span class="muted">${l.pos}</span><br><span class="muted">${esc(statSummary(l)) || '—'}</span></div>`).join('')}
   </div>
   <div class="pg-box"><h4>Rewards</h4>
    ${rw.gold.map(([k, g]) => `<div class="rew-line"><span>${esc(k)}</span><span class="amber">+$${g}</span></div>`).join('')}
    <div class="rew-line" style="border-top:1px solid var(--line);margin-top:4px;padding-top:4px"><span>Total</span><span class="amber">+$${goldTotal}</span></div>
    ${rw.components.length ? `<div class="rew-line"><span>Gear ${won ? '' : '(losses always pay gear)'}</span><span>${rw.components.map((c) => COMPONENTS[c].icon).join(' ')}</span></div>` : ''}
    <div class="rew-line"><span>Program XP</span><span>+${rw.xp}${rw.levelUp ? ` · <b class="good">Level ${rw.levelUp}!</b>` : ''}</span></div>
    ${rw.perks.map((p) => { const u = G.findUnit(st, p.uid)?.unit; return u ? `<div class="rew-line"><span>${esc(CARDS[u.card].name)} earned a perk</span><span>${PERKS[p.perk].icon} ${esc(PERKS[p.perk].name)}</span></div>` : ''; }).join('')}
    ${devNames.length ? `<div class="rew-line"><span>Development +1</span><span class="good" style="text-align:right">${esc(devNames.join(', '))}</span></div>` : ''}
   </div>
  </div>
  ${!pre && !playoff ? `<div style="margin-top:12px">${regionTable(st, 0, true)}</div>` : ''}
  ${playoff ? `<div style="margin-top:12px">${bracketHTML(st)}</div>` : ''}
  <div class="modal-actions"><button class="btn primary big" data-a="go">${st.phase === 'seasonEnd' ? 'Season wrap-up →' : 'Back to the field house →'}</button></div>`;
  showModal(html, (el, close) => {
    el.querySelector('[data-a=go]').addEventListener('click', () => { close(); onDone(); });
  }, { wide: true });
}

export function seasonEndModal(app, onDone) {
  const st = app.state;
  const sum = G.seasonSummary(st);
  const champId = st.season.playoff?.champion;
  const champName = champId ? (champId === 'U' ? st.program.name : teamById(st.season, champId).name) : '—';
  const nextCls = sum.champion && st.program.classIdx < CLASSIFICATIONS.length - 1 ? CLASSIFICATIONS[st.program.classIdx + 1] : CLASSIFICATIONS[st.program.classIdx];
  const html = `<div class="final-banner"><div class="kicker">${sum.year} season · ${sum.classification}</div>
   <div class="wl ${sum.champion ? 'w' : ''}" style="font-size:${sum.champion ? 60 : 44}px">${esc(sum.result.toUpperCase())}</div>
   <p>Final record <b>${sum.w}-${sum.l}</b> (${sum.rw}-${sum.rl} region, finished #${sum.regionFinish}). State champion: <b class="amber">${esc(champName)}</b>.</p></div>
   ${st.season.playoff ? bracketHTML(st) : ''}
   <div class="pg-grid">
    <div class="pg-box"><h4>Graduating seniors</h4>${sum.seniors.length ? sum.seniors.map((u) => `<div class="perf"><b>${esc(CARDS[u.card].name)}</b> ${stars(u.star)} <span class="muted">${CARDS[u.card].pos}</span></div>`).join('') : '<span class="muted">None. Everyone comes back.</span>'}
     <p class="muted" style="font-size:12.5px">Their gear goes back in your locker. Everyone else moves up a class and gets +1 development.</p></div>
    <div class="pg-box"><h4>Next season</h4>
     <div class="rew-line"><span>Classification</span><span>${sum.champion && nextCls !== sum.classification ? `<b class="good">Moving up to ${nextCls}</b>` : nextCls}</span></div>
     <div class="rew-line"><span>Starting gold</span><span class="amber">$${8 + Math.max(0, Math.min(5, st.program.prestige + (sum.champion ? 1 : sum.result.includes('Semifinals') || sum.result.includes('Championship') ? 0.5 : G.madePlayoffs(st) ? 0 : -0.5))) * 2}</span></div>
     <div class="rew-line"><span>New this year</span><span>New schedule, new region, new coaching hires</span></div>
    </div>
   </div>
   <div class="modal-actions"><button class="btn primary big" data-a="next">Start the ${sum.year + 1} season →</button></div>`;
  showModal(html, (el, close) => {
    el.querySelector('[data-a=next]').addEventListener('click', () => { close(); G.finishSeason(st); onDone(); });
  }, { wide: true });
}

export function allStandingsModal(app) {
  const st = app.state;
  const html = `<div class="kicker">${st.season.year} standings</div><h2>All regions</h2>
  <div class="pg-grid">${[0, 1, 2, 3].map((r) => `<div>${regionTable(st, r, false)}</div>`).join('')}</div>
  ${st.season.playoff ? `<div style="margin-top:12px">${bracketHTML(st)}</div>` : ''}
  <div class="modal-actions"><button class="btn" data-a="x">Close</button></div>`;
  showModal(html, (el, close) => el.querySelector('[data-a=x]').addEventListener('click', close), { wide: true, dismissable: true });
}

export function helpModal() {
  const html = `<div class="kicker">How to play</div><h2>PrepTactics</h2>
  <div class="help">
  <p>Build a high school football team, week by week, like Teamfight Tactics. Games play themselves. Your job is the roster, the formation and the plan.</p>
  <h4>Each week</h4>
  <ul>
   <li><b>Recruit</b> from the shop at the bottom. Cost = tier ($1 to $5).</li>
   <li><b>Three copies</b> of the same player combine into a ★★ version. Three ★★ make a ★★★.</li>
   <li><b>Start players</b> by tapping them, then tapping a matching spot on the field. Empty spots are filled by walk-ons, who are bad.</li>
   <li>Your <b>program level</b> limits how many players you can start. Level up with the button or by playing games.</li>
   <li>Hit <b>Kick off</b> when you're ready. The game simulates play by play.</li>
  </ul>
  <h4>Matchups matter</h4>
  <p>Your defenders cover the opponent's receivers by spot: the left cornerback covers their left receiver, the nickel covers their slot, one linebacker takes the tight end and the other takes the running back. Check the <b>Scout</b> tab: it shows their lineup, their best target, and your win odds from 40 quick sims of your current lineup.</p>
  <h4>Traits</h4>
  <p>Every player has an origin (Small Town, City Prep, Farm Strong, Coach's Kid, Transfer, Multi-Sport, Five-Star) and a style (Air Raid, Ground & Pound, Trench, Blitz, Lockdown, Ballhawk, Playmaker). Start more players who share a trait to unlock its bonuses.</p>
  <h4>Gold</h4>
  <ul><li>You get $5 a week, plus $1 interest per $10 saved (up to $5), plus streak bonuses for winning or losing streaks.</li>
  <li>Reroll the shop for $2. Lock it to keep the same players for next week.</li></ul>
  <h4>Gear</h4>
  <p>Gear components drop after games. <b>Losses always pay gear.</b> Give two components to one player (or combine them in the locker) to craft finished gear with special effects.</p>
  <h4>The season</h4>
  <ul>
   <li>Two preseason games (they don't count), then 10 weeks: 3 non-region games and 7 region games.</li>
   <li><b>Finish top 4 in your region</b> to make the 16-team state playoffs. Region record is what counts. You can lose a couple and still get in.</li>
   <li><b>Signing Day</b> (start, Week 3, Week 7, playoffs): pick a free recruit. Losses earn better options.</li>
   <li><b>Coaching hires</b> (Weeks 1, 4, 8): pick one of three staff upgrades.</li>
   <li>Your rival is marked ⚔️. Beat him for bonus gold.</li>
  </ul>
  <h4>Seasons carry over</h4>
  <p>Seniors graduate. Everyone else comes back a year older and better. Players who win Player of the Game can earn perks. Win state and you move up a classification, where the competition is tougher.</p>
  </div>
  <div class="modal-actions"><button class="btn primary" data-a="x">Got it</button></div>`;
  showModal(html, (el, close) => el.querySelector('[data-a=x]').addEventListener('click', close), { dismissable: true });
}

export function menuModal(app) {
  const html = `<div class="kicker">Menu</div><h2>Field house</h2>
  <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">
   <button class="btn" data-a="help">How to play</button>
   <button class="btn" data-a="stand">All standings</button>
   <button class="btn" data-a="title">Title screen</button>
   <button class="btn danger" data-a="reset">Delete save and start over</button>
  </div>
  <p class="muted" style="font-size:12.5px">Your program saves automatically after every game and change.</p>
  <div class="modal-actions"><button class="btn" data-a="x">Close</button></div>`;
  showModal(html, (el, close) => {
    el.querySelector('[data-a=x]').addEventListener('click', close);
    el.querySelector('[data-a=help]').addEventListener('click', () => { close(); helpModal(); });
    el.querySelector('[data-a=stand]').addEventListener('click', () => { close(); allStandingsModal(app); });
    el.querySelector('[data-a=title]').addEventListener('click', () => { close(); app.goTitle(); });
    el.querySelector('[data-a=reset]').addEventListener('click', () => {
      if (el.querySelector('[data-a=reset]').dataset.confirm) { G.clearSave(); close(); app.state = null; app.goTitle(); return; }
      el.querySelector('[data-a=reset]').dataset.confirm = '1';
      el.querySelector('[data-a=reset]').textContent = 'Tap again to delete your program';
    });
  }, { dismissable: true });
}
