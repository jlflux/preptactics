// Greedy bot that plays full seasons, to check difficulty: node tools/bot.mjs [seasons]
import * as S from '../js/state.js';
import { CARDS } from '../js/data/cards.js';
import { ALL_SLOTS, SLOT_POS } from '../js/data/slots.js';
import { records, regionStandings } from '../js/engine/season.js';

globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const N = Number(process.argv[2] || 40);
const SKILL = Number(process.argv[3] || 1); // 0 = sloppy, 1 = decent

function power(u) { return S.unitPower(u); }

function arrange(st) {
  // put the best unit available at each slot, respecting cap
  const units = S.allUnits(st).sort((a, b) => power(b) - power(a));
  for (const s of ALL_SLOTS) if (st.board[s]) S.move(st, st.board[s].uid, { bench: st.bench.indexOf(null) >= 0 ? st.bench.indexOf(null) : 0 });
  for (const u of units) {
    if (S.starters(st) >= S.starterCap(st)) break;
    const f = S.findUnit(st, u.uid);
    if (f.where !== 'bench') continue;
    const pos = CARDS[u.card].pos;
    const open = ALL_SLOTS.find((s) => SLOT_POS[s] === pos && !st.board[s]);
    if (open) S.move(st, u.uid, { slot: open });
  }
}

function planning(st) {
  while (st.pending.length) {
    const p = st.pending[0];
    if (p.type === 'signing') {
      let best = 0; p.options.forEach((o, i) => { if (CARDS[o.card].tier > CARDS[p.options[best].card].tier) best = i; });
      S.choose(st, best);
    } else S.choose(st, 0);
  }
  const r = st.season.round;
  for (let loop = 0; loop < 12; loop++) {
    // buy anything that pairs or upgrades
    let bought = false;
    st.shop.forEach((id, i) => {
      if (!id) return;
      const c = CARDS[id];
      const owned = S.allUnits(st).filter((u) => u.card === id).length;
      const posUnits = S.allUnits(st).filter((u) => CARDS[u.card].pos === c.pos);
      const slotsForPos = ALL_SLOTS.filter((s) => SLOT_POS[s] === c.pos).length;
      const weakest = posUnits.length < slotsForPos ? 0 : Math.min(...posUnits.map(power));
      if ((owned > 0 || c.tier * 10 > weakest) && st.gold - c.cost >= (r > 3 ? 0 : 0)) {
        if (S.buy(st, i).ok) bought = true;
      }
    });
    arrange(st);
    // sell weakest bench guys if bench is full
    const benchUnits = st.bench.filter(Boolean);
    if (benchUnits.length >= 7) {
      benchUnits.sort((a, b) => power(a) - power(b)).slice(0, 2).forEach((u) => { if (S.allUnits(st).filter((x) => x.card === u.card).length === 1) S.sell(st, u.uid); });
    }
    if (st.gold >= 4 + (SKILL ? 10 : 0) && st.level < 9 && (r >= 3 || st.gold > 14)) { S.buyXP(st); arrange(st); continue; }
    if (st.gold >= 2 + (SKILL ? 20 : 2)) { S.reroll(st); continue; }
    if (!bought) break;
  }
  // gear onto best starters
  const best = ALL_SLOTS.map((s) => st.board[s]).filter(Boolean).sort((a, b) => power(b) - power(a));
  let guard = 0;
  while (st.components.length && best.length && guard++ < 20) {
    const target = best.find((u) => u.items.length < 3 || u.items.some((x) => !x.includes('+') && ['cleats', 'gloves', 'film', 'weights', 'twoadays'].includes(x)));
    if (!target) break;
    if (!S.equip(st, 0, target.uid).ok) break;
  }
  arrange(st);
}

let made = 0, titles = 0, wins = 0, losses = 0, finishes = {}, semis = 0;
for (let i = 0; i < N; i++) {
  const st = S.newGame({ name: 'Bot', mascot: 'Bots', colors: { name: 'Royal', main: '#1f4fd1', alt: '#fff' } });
  st.rngCounter = 1000 + i * 77;
  S.startSeason(st);
  while (st.phase !== 'seasonEnd') { planning(st); S.playRound(st); }
  const sum = S.seasonSummary(st);
  if (S.madePlayoffs(st)) made++;
  if (sum.champion) titles++;
  if (sum.result.includes('Semifinals') || sum.result.includes('Championship') || sum.champion) semis++;
  const rec = records(st.season).U;
  wins += rec.w; losses += rec.l;
  finishes[sum.regionFinish] = (finishes[sum.regionFinish] || 0) + 1;
  if (i < 3) console.log(sum.year, `${rec.w}-${rec.l}`, `region ${rec.rw}-${rec.rl} (#${sum.regionFinish})`, sum.result, 'lvl', st.level, 'board', S.starters(st));
}
console.log({ seasons: N, playoffRate: made / N, semiRate: semis / N, titleRate: titles / N, avgRecord: `${(wins / N).toFixed(1)}-${(losses / N).toFixed(1)}`, finishes });
