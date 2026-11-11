// Turns a team's board (units in slots) into effective player ratings and team modifiers
// that the game simulation reads. Pure functions, no DOM.
import { CARDS, SIGS, SIG_SCALE, STATS, WALKON_STATS } from '../data/cards.js';
import { TRAITS } from '../data/traits.js';
import { gearInfo } from '../data/gear.js';
import { HIRES, PERKS } from '../data/content.js';
import { ALL_SLOTS, SLOT_POS } from '../data/slots.js';

export const STAR_MULT = [0, 1, 1.22, 1.46];

function addStats(target, add, k = 1) {
  if (!add) return;
  for (const s of STATS) if (add[s]) target[s] += add[s] * k;
}
function addMods(target, add, k = 1) {
  if (!add) return;
  for (const key of Object.keys(add)) target[key] = (target[key] || 0) + add[key] * k;
}

export function unitBaseStats(unit) {
  const card = CARDS[unit.card];
  const out = {};
  for (const s of STATS) out[s] = (card.stats[s] + (unit.dev || 0) * 2) * STAR_MULT[unit.star];
  return out;
}

// Counts traits among the starters on a board. Same card twice counts once.
export function countTraits(board, hires = []) {
  const seen = new Set();
  const counts = {};
  for (const slot of ALL_SLOTS) {
    const u = board[slot];
    if (!u || seen.has(u.card)) continue;
    seen.add(u.card);
    for (const t of CARDS[u.card].traits) counts[t] = (counts[t] || 0) + 1;
  }
  for (const h of hires) {
    const tp = HIRES[h]?.fx.traitPlus;
    if (tp && counts[tp]) counts[tp] += 1;
  }
  return counts;
}

export function activeTraits(counts) {
  const list = [];
  for (const id of Object.keys(counts)) {
    const t = TRAITS[id];
    let level = 0;
    t.levels.forEach((lv, i) => { if (counts[id] >= lv.n) level = i + 1; });
    list.push({ id, count: counts[id], level, trait: t });
  }
  list.sort((a, b) => (b.level - a.level) || (b.count - a.count));
  return list;
}

export function hireFx(hires = []) {
  return hires.map((h) => HIRES[h]?.fx).filter(Boolean);
}

// Build everything the sim needs for one team.
// ctx: { seasonMod, home, bigGame }
export function buildSide(team, ctx = {}) {
  const hires = team.hires || [];
  const hfx = hireFx(hires);
  const counts = countTraits(team.board, hires);
  const traits = activeTraits(counts);
  const mods = {};
  const teamStats = { spd: 0, str: 0, hnd: 0, iq: 0, tgh: 0 };
  const posStats = [];
  const memberStats = {}; // traitId -> stats
  const memberPct = {};
  let gold = 0;

  for (const at of traits) {
    if (!at.level) continue;
    const fx = at.trait.levels[at.level - 1].fx;
    if (fx.teamStats) addStats(teamStats, fx.teamStats);
    if (fx.posStats) (Array.isArray(fx.posStats) ? fx.posStats : [fx.posStats]).forEach((p) => posStats.push(p));
    if (fx.memberStats) memberStats[at.id] = fx.memberStats;
    if (fx.memberPct) memberPct[at.id] = fx.memberPct;
    if (fx.mods) addMods(mods, fx.mods);
    if (fx.gold) gold += fx.gold;
  }
  for (const fx of hfx) {
    if (fx.teamStats) addStats(teamStats, fx.teamStats);
    if (fx.mods) addMods(mods, fx.mods);
  }
  const sm = ctx.seasonMod;
  if (sm) {
    if (sm.teamStats) addStats(teamStats, sm.teamStats);
    if (sm.mods) addMods(mods, sm.mods);
  }

  // Team auras from gear and captains.
  let leaderIQ = 0, auraTGH = 0, comeback = 0;
  for (const slot of ALL_SLOTS) {
    const u = team.board[slot];
    if (!u) continue;
    const card = CARDS[u.card];
    const sig = SIGS[card.sig];
    if (sig.mods.leader) leaderIQ = Math.max(leaderIQ, sig.mods.leader * SIG_SCALE[u.star]);
    for (const g of u.items || []) {
      const gi = gearInfo(g);
      if (gi?.mods?.teamIQ) leaderIQ += gi.mods.teamIQ;
      if (gi?.mods?.teamTGH) auraTGH += gi.mods.teamTGH;
      if (gi?.mods?.comeback) comeback = Math.max(comeback, gi.mods.comeback);
    }
  }
  teamStats.iq += leaderIQ;
  teamStats.tgh += auraTGH;

  const walkon = hfx.find((f) => f.walkon)?.walkon;
  const players = {};
  for (const slot of ALL_SLOTS) {
    const pos = SLOT_POS[slot];
    const u = team.board[slot];
    let stats, pmods = {}, name, num, walk = false, cardTraits = [], tier = 0;
    if (!u) {
      walk = true;
      stats = { ...WALKON_STATS };
      if (walkon) for (const s of STATS) stats[s] = walkon;
      name = 'Walk-on';
      num = 0;
    } else {
      const card = CARDS[u.card];
      tier = card.tier;
      cardTraits = card.traits;
      stats = unitBaseStats(u);
      name = u.name || card.name;
      num = u.num || card.num;
      const sig = SIGS[card.sig];
      addMods(pmods, sig.mods, SIG_SCALE[u.star]);
      for (const g of u.items || []) {
        const gi = gearInfo(g);
        if (!gi) continue;
        addStats(stats, gi.stats);
        if (gi.mods) addMods(pmods, gi.mods);
      }
      if (u.perk && PERKS[u.perk]) {
        addStats(stats, PERKS[u.perk].stats);
        addMods(pmods, PERKS[u.perk].mods);
      }
      for (const t of card.traits) if (memberStats[t]) addStats(stats, memberStats[t]);
      for (const fx of hfx) {
        if (fx.tierStats && fx.tierStats.tier === card.tier) addStats(stats, fx.tierStats.stats);
        if (fx.classStats && fx.classStats.classes.includes(u.cls ?? 0)) addStats(stats, fx.classStats.stats);
      }
    }
    addStats(stats, teamStats);
    for (const ps of posStats) if (ps.pos.includes(pos)) addStats(stats, ps.stats);
    let pct = 0;
    for (const t of cardTraits) if (memberPct[t]) pct += memberPct[t];
    if (pct) for (const s of STATS) stats[s] *= 1 + pct;
    for (const s of STATS) stats[s] = Math.round(Math.max(10, stats[s]));
    players[slot] = { slot, pos, name, num, stats, mods: pmods, walkon: walk, tier, star: u?.star || 0, uid: u?.uid };
  }

  let bigGame = 0;
  if (ctx.bigGame) for (const fx of hfx) if (fx.bigGame) bigGame += fx.bigGame;

  return {
    id: team.id, name: team.name, short: team.short || team.name, mascot: team.mascot, colors: team.colors,
    players, mods, traits, counts, gold, comeback, bigGame, home: !!ctx.home,
  };
}

// Single-number team strength for previews and quick comparisons.
export function overall(side) {
  const p = side.players;
  const avg = (keys, f) => keys.reduce((s, k) => s + f(p[k].stats), 0) / keys.length;
  const off = avg(['QB'], (s) => s.iq * 0.5 + s.str * 0.3 + s.hnd * 0.2) * 0.25
    + avg(['RB'], (s) => s.spd * 0.5 + s.str * 0.5) * 0.12
    + avg(['WR1', 'WR2', 'WR3', 'TE'], (s) => s.spd * 0.45 + s.hnd * 0.35 + s.iq * 0.2) * 0.33
    + avg(['OL1', 'OL2'], (s) => s.str * 0.5 + s.tgh * 0.3 + s.iq * 0.2) * 0.3 + (side.mods.lineO || 0) * 0.3;
  const def = avg(['DL1', 'DL2'], (s) => s.str * 0.55 + s.spd * 0.45) * 0.3 + (side.mods.lineD || 0) * 0.3
    + avg(['LB1', 'LB2'], (s) => s.tgh * 0.4 + s.spd * 0.3 + s.iq * 0.3) * 0.3
    + avg(['DB1', 'DB2', 'DB3'], (s) => s.spd * 0.45 + s.iq * 0.35 + s.hnd * 0.2) * 0.4;
  return { off: Math.round(off), def: Math.round(def), ovr: Math.round((off + def) / 2) };
}
