import * as S from '../js/state.js';
import { CARDS } from '../js/data/cards.js';
import { ALL_SLOTS, SLOT_POS } from '../js/data/slots.js';
const SKILL = 1;
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

export function planning(st) {
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

