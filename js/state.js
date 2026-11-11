// Game state and every player action. No DOM here, so the same code runs in the
// browser and in the headless balance bot (tools/bot.mjs).
import { makeRng, randomSeed } from './rng.js';
import { CARDS, CARD_LIST, POOL_SIZE } from './data/cards.js';
import { ALL_SLOTS, SLOT_POS, STARTER_CAP } from './data/slots.js';
import { COMPONENTS, COMPONENT_IDS, combine, gearInfo } from './data/gear.js';
import { HIRES, HIRE_IDS, PERK_IDS, CLASSIFICATIONS } from './data/content.js';
import {
  SHOP_ODDS, XP_NEEDED, MAX_LEVEL, PASSIVE_XP, XP_COST, XP_BUY, REROLL_COST, BENCH_SIZE, SHOP_SIZE,
  BASE_INCOME, interest, streakBonus, sellValue,
} from './engine/economy.js';
import { buildSide, countTraits } from './engine/ratings.js';
import { simulateGame } from './engine/sim.js';
import { aiLineup } from './engine/ai.js';
import {
  createSeason, gamesForRound, isPreseason, isRegular, isPlayoff, records, teamById, seedPlayoffs,
  advancePlayoffs, userAlive, seasonModById, SIGNING_ROUNDS, HIRE_ROUNDS, PRESEASON_ROUNDS, REG_WEEKS, TOTAL_ROUNDS,
  regionStandings, playoffGames,
} from './engine/season.js';

export const SAVE_KEY = 'preptactics.save.v1';
const START_CLASS = 2; // 3A

// ---------------- creation ----------------
export function newGame({ name, mascot, colors }) {
  const state = {
    version: 1,
    program: { name, mascot, short: name, colors, prestige: 0, classIdx: START_CLASS, history: [], titles: 0, seasonsPlayed: 0 },
    level: 1, xp: 0, gold: 0, streak: 0,
    board: Object.fromEntries(ALL_SLOTS.map((s) => [s, null])),
    bench: Array(BENCH_SIZE).fill(null),
    components: [],
    hires: [],
    shop: [], shopLocked: false, freeRerolls: 0,
    pool: {},
    uid: 1,
    pending: [],
    season: null,
    phase: 'planning',
    lastGame: null,
    rngCounter: randomSeed(),
    log: [],
  };
  startSeason(state);
  return state;
}

export function rng(state) {
  state.rngCounter = (state.rngCounter * 1103515245 + 12345) % 2147483647;
  return makeRng(state.rngCounter);
}

export function difficulty(state) {
  return 0.9 + state.program.classIdx * 0.05;
}

// Returning programs face opponents who also reloaded over the summer.
export function aiRoundOffset(state) {
  return Math.min(9, state.program.seasonsPlayed * 5);
}

export function aiTeam(state, team, round) {
  return aiLineup(team, round + aiRoundOffset(state), difficulty(state));
}

export function startSeason(state) {
  const p = state.program;
  const year = 2026 + p.seasonsPlayed;
  state.season = createSeason(p, rng(state)(), year);
  state.season.seed = Math.floor(rng(state)() * 1e9);
  state.gold = 8 + p.prestige * 2;
  state.streak = 0;
  state.hires = [];
  state.freeRerolls = 0;
  state.phase = 'planning';
  state.lastGame = null;
  // pool resets each season, minus players you already have
  state.pool = {};
  for (const c of CARD_LIST) state.pool[c.id] = POOL_SIZE[c.tier];
  for (const u of allUnits(state)) state.pool[u.card] = Math.max(0, state.pool[u.card] - copiesOf(u));
  state.shopLocked = false;
  state.pending = [];
  queueRoundChoices(state);
  rollShop(state);
}

function copiesOf(u) { return u.star === 1 ? 1 : u.star === 2 ? 3 : 9; }

export function allUnits(state) {
  return [...ALL_SLOTS.map((s) => state.board[s]), ...state.bench].filter(Boolean);
}

export function starters(state) {
  return ALL_SLOTS.filter((s) => state.board[s]).length;
}
export function starterCap(state) {
  return STARTER_CAP[state.level];
}

export function userTeam(state) {
  const p = state.program;
  return { id: 'U', name: p.name, short: p.short, mascot: p.mascot, colors: p.colors, board: state.board, hires: state.hires };
}

export function seasonMod(state) {
  return seasonModById(state.season.mod);
}

// ---------------- shop ----------------
function rollTier(r, level) {
  const odds = SHOP_ODDS[level];
  let x = r() * 100;
  for (let t = 0; t < 5; t++) { x -= odds[t]; if (x < 0) return t + 1; }
  return 1;
}

export function shopSize(state) {
  return SHOP_SIZE + state.hires.reduce((s, h) => s + (HIRES[h].fx.shopSlots || 0), 0);
}

export function rollShop(state) {
  const r = rng(state);
  const shop = [];
  for (let i = 0; i < shopSize(state); i++) {
    let tier = rollTier(r, state.level);
    let options = [];
    for (let t = tier; t >= 1 && !options.length; t--) options = CARD_LIST.filter((c) => c.tier === t && state.pool[c.id] > 0);
    if (!options.length) { shop.push(null); continue; }
    const card = r.weighted(options, (c) => state.pool[c.id]);
    shop.push(card.id);
  }
  state.shop = shop;
}

export function rerollCost(state) {
  if (state.freeRerolls > 0) return 0;
  return seasonMod(state).reroll ?? REROLL_COST;
}

export function reroll(state) {
  const cost = rerollCost(state);
  if (state.gold < cost) return fail('Not enough gold to reroll.');
  state.gold -= cost;
  if (state.freeRerolls > 0) state.freeRerolls--;
  rollShop(state);
  return ok();
}

export function buyXP(state) {
  if (state.level >= MAX_LEVEL) return fail('Program is maxed out.');
  if (state.gold < XP_COST) return fail('Not enough gold.');
  state.gold -= XP_COST;
  addXP(state, XP_BUY);
  return ok();
}

export function addXP(state, n) {
  state.xp += n;
  while (state.level < MAX_LEVEL && state.xp >= XP_NEEDED[state.level]) {
    state.xp -= XP_NEEDED[state.level];
    state.level++;
  }
  if (state.level >= MAX_LEVEL) state.xp = 0;
}

function rollClass(r, tier) {
  const t = [null, [0.4, 0.3, 0.2, 0.1], [0.25, 0.3, 0.25, 0.2], [0.15, 0.25, 0.3, 0.3], [0.1, 0.2, 0.3, 0.4], [0.05, 0.15, 0.35, 0.45]][tier];
  let x = r();
  for (let i = 0; i < 4; i++) { x -= t[i]; if (x < 0) return i; }
  return 3;
}

export function makeUnit(state, cardId, star = 1) {
  const card = CARDS[cardId];
  return { uid: state.uid++, card: cardId, star, items: [], cls: rollClass(rng(state), card.tier), dev: 0, xp: 0, perk: null };
}

function wouldCombine(state, cardId) {
  return allUnits(state).filter((u) => u.card === cardId && u.star === 1).length >= 2;
}

export function buy(state, idx) {
  const cardId = state.shop[idx];
  if (!cardId) return fail();
  const card = CARDS[cardId];
  if (state.gold < card.cost) return fail('Not enough gold.');
  const benchIdx = state.bench.indexOf(null);
  if (benchIdx < 0 && !wouldCombine(state, cardId)) return fail('Bench is full. Sell someone first.');
  state.gold -= card.cost;
  state.pool[cardId]--;
  state.shop[idx] = null;
  const unit = makeUnit(state, cardId);
  if (benchIdx >= 0) state.bench[benchIdx] = unit;
  else state._overflow = unit;
  const merged = checkCombine(state, unit);
  delete state._overflow;
  return ok(merged ? { merged } : { unit });
}

// Combine 3 copies of the same card at the same star level. Returns the upgraded unit.
export function checkCombine(state, unit) {
  let result = null;
  let current = unit;
  while (current && current.star < 3) {
    const pool = allUnits(state);
    if (state._overflow && !pool.includes(state._overflow)) pool.push(state._overflow);
    const copies = pool.filter((u) => u.card === current.card && u.star === current.star);
    if (copies.length < 3) break;
    // keep the one on the board if there is one, else the first
    const boardCopy = copies.find((u) => ALL_SLOTS.some((s) => state.board[s] === u));
    const keep = boardCopy || copies[0];
    const others = copies.filter((u) => u !== keep).slice(0, 2);
    const items = [...keep.items];
    for (const o of others) {
      for (const it of o.items) {
        if (items.length < 3) items.push(it); else state.components.push(it);
      }
      keep.dev = Math.max(keep.dev, o.dev);
      keep.xp = Math.max(keep.xp, o.xp);
      if (!keep.perk && o.perk) keep.perk = o.perk;
      removeUnit(state, o);
    }
    keep.items = items;
    keep.star++;
    if (keep === state._overflow) {
      const bi = state.bench.indexOf(null);
      if (bi >= 0) state.bench[bi] = keep;
      delete state._overflow;
    }
    result = keep;
    current = keep;
  }
  return result;
}

function removeUnit(state, unit) {
  for (const s of ALL_SLOTS) if (state.board[s] === unit) state.board[s] = null;
  const bi = state.bench.indexOf(unit);
  if (bi >= 0) state.bench[bi] = null;
  if (state._overflow === unit) delete state._overflow;
}

export function findUnit(state, uid) {
  for (const s of ALL_SLOTS) if (state.board[s]?.uid === uid) return { unit: state.board[s], where: 'board', slot: s };
  const bi = state.bench.findIndex((u) => u?.uid === uid);
  if (bi >= 0) return { unit: state.bench[bi], where: 'bench', idx: bi };
  return null;
}

export function sell(state, uid) {
  const f = findUnit(state, uid);
  if (!f) return fail();
  const card = CARDS[f.unit.card];
  const value = sellValue(f.unit, card.cost);
  state.gold += value;
  state.pool[f.unit.card] += copiesOf(f.unit);
  for (const it of f.unit.items) state.components.push(it);
  removeUnit(state, f.unit);
  return ok({ value });
}

// dest: {slot} or {bench: idx}
export function move(state, uid, dest) {
  const f = findUnit(state, uid);
  if (!f) return fail();
  const unit = f.unit;
  const pos = CARDS[unit.card].pos;
  if (dest.slot) {
    if (SLOT_POS[dest.slot] !== pos) return fail(`${pos} can't play ${SLOT_POS[dest.slot]}.`);
    const other = state.board[dest.slot];
    if (other === unit) return ok();
    const dup = ALL_SLOTS.find((s) => s !== dest.slot && s !== f.slot && state.board[s]?.card === unit.card);
    if (dup) return fail(`${CARDS[unit.card].name} is already starting. Combine 3 copies to upgrade him instead.`);
    if (!other && f.where === 'bench' && starters(state) >= starterCap(state)) {
      return fail(`Starter limit reached (${starterCap(state)}). Level up your program to start more players.`);
    }
    // place
    if (f.where === 'board') state.board[f.slot] = null; else state.bench[f.idx] = null;
    state.board[dest.slot] = unit;
    if (other) {
      if (f.where === 'board' && SLOT_POS[f.slot] === CARDS[other.card].pos) state.board[f.slot] = other;
      else if (f.where === 'bench') state.bench[f.idx] = other;
      else {
        const bi = state.bench.indexOf(null);
        if (bi >= 0) state.bench[bi] = other;
        else { // undo
          state.board[dest.slot] = other; state.board[f.slot] = unit;
          return fail('Bench is full.');
        }
      }
    }
    return ok();
  }
  if (dest.bench !== undefined) {
    const other = state.bench[dest.bench];
    if (other === unit) return ok();
    if (f.where === 'bench') {
      state.bench[f.idx] = other; state.bench[dest.bench] = unit;
      return ok();
    }
    // board -> bench
    if (other) {
      const opos = CARDS[other.card].pos;
      if (opos === SLOT_POS[f.slot]) { state.board[f.slot] = other; state.bench[dest.bench] = unit; return ok(); }
      const bi = state.bench.indexOf(null);
      if (bi < 0) return fail('Bench is full.');
      state.board[f.slot] = null; state.bench[bi] = unit;
      return ok();
    }
    state.board[f.slot] = null;
    state.bench[dest.bench] = unit;
    return ok();
  }
  return fail();
}

// Send a bench unit to the best open (or weakest) slot for his position.
export function autoPlace(state, uid) {
  const f = findUnit(state, uid);
  if (!f || f.where !== 'bench') return fail();
  const pos = CARDS[f.unit.card].pos;
  const slots = ALL_SLOTS.filter((s) => SLOT_POS[s] === pos);
  const same = slots.find((s) => state.board[s]?.card === f.unit.card);
  if (same) return move(state, uid, { slot: same });
  const open = slots.find((s) => !state.board[s]);
  if (open) return move(state, uid, { slot: open });
  // swap with the weakest at that position
  const weakest = slots.slice().sort((a, b) => unitPower(state.board[a]) - unitPower(state.board[b]))[0];
  return move(state, uid, { slot: weakest });
}

export function unitPower(u) {
  if (!u) return 0;
  const c = CARDS[u.card];
  return c.tier * 10 * [0, 1, 3, 9][u.star] + u.dev + u.items.length * 4;
}

// ---------------- gear ----------------
export function equip(state, gearIdx, uid) {
  const g = state.components[gearIdx];
  const f = findUnit(state, uid);
  if (!g || !f) return fail();
  const unit = f.unit;
  const isComp = !!COMPONENTS[g];
  const looseIdx = unit.items.findIndex((it) => COMPONENTS[it]);
  if (isComp && looseIdx >= 0) {
    const made = combine(unit.items[looseIdx], g);
    unit.items[looseIdx] = made.id;
    state.components.splice(gearIdx, 1);
    return ok({ made });
  }
  if (unit.items.length >= 3) return fail('He already has 3 pieces of gear.');
  unit.items.push(g);
  state.components.splice(gearIdx, 1);
  return ok();
}

// Combine two loose components in the gear locker directly.
export function craft(state, i, j) {
  const a = state.components[i], b = state.components[j];
  if (!COMPONENTS[a] || !COMPONENTS[b] || i === j) return fail();
  const made = combine(a, b);
  const rm = [i, j].sort((x, y) => y - x);
  state.components.splice(rm[0], 1); state.components.splice(rm[1], 1);
  state.components.push(made.id);
  return ok({ made });
}

// ---------------- choices (Signing Day, Coaching Hires) ----------------
function queueRoundChoices(state) {
  const round = state.season.round;
  if (SIGNING_ROUNDS.includes(round)) state.pending.push(makeSigning(state));
  if (HIRE_ROUNDS.includes(round)) state.pending.push(makeHire(state));
}

function makeSigning(state) {
  const r = rng(state);
  const round = state.season.round;
  const idx = SIGNING_ROUNDS.indexOf(round);
  const baseTier = [1, 2, 3, 4][idx] ?? 2;
  const rec = state.season.results.length ? records(state.season).U : { l: 0, w: 0 };
  const losses = rec.l;
  const n = 4 + (state.streak < 0 ? 1 : 0) + (losses >= 3 ? 1 : 0);
  const options = [];
  const usedCards = new Set();
  for (let i = 0; i < n; i++) {
    let tier = Math.min(5, baseTier + (r.chance(0.3) ? 1 : 0) + (losses >= 2 && i === 0 ? 1 : 0) + Math.floor(state.program.prestige / 3) * (i === 1 ? 1 : 0));
    let pool = CARD_LIST.filter((c) => c.tier === tier && !usedCards.has(c.id) && state.pool[c.id] > 0);
    if (!pool.length) pool = CARD_LIST.filter((c) => c.tier <= tier && !usedCards.has(c.id) && state.pool[c.id] > 0);
    const card = r.pick(pool);
    usedCards.add(card.id);
    options.push({ card: card.id, gear: r.pick(COMPONENT_IDS) });
  }
  const extra = state.hires.reduce((s, h) => s + (HIRES[h].fx.signingComponent || 0), 0);
  return { type: 'signing', options, extraComponents: extra, losses };
}

function makeHire(state) {
  const r = rng(state);
  const avail = HIRE_IDS.filter((h) => !state.hires.includes(h));
  const opts = r.shuffle(avail).slice(0, 3);
  return { type: 'hire', options: opts };
}

export function choose(state, optionIdx) {
  const p = state.pending[0];
  if (!p) return fail();
  if (p.type === 'signing') {
    const o = p.options[optionIdx];
    const unit = makeUnit(state, o.card);
    state.pool[o.card] = Math.max(0, state.pool[o.card] - 1);
    unit.items.push(o.gear);
    const bi = state.bench.indexOf(null);
    if (bi >= 0) state.bench[bi] = unit; else { state.gold += CARDS[o.card].cost; state.components.push(o.gear); }
    for (let i = 0; i < p.extraComponents; i++) state.components.push(rng(state).pick(COMPONENT_IDS));
    if (bi >= 0) checkCombine(state, unit);
  } else if (p.type === 'hire') {
    const h = p.options[optionIdx];
    state.hires.push(h);
    const fx = HIRES[h].fx;
    if (fx.goldNow) state.gold += fx.goldNow;
    if (fx.components) for (let i = 0; i < fx.components; i++) state.components.push(rng(state).pick(COMPONENT_IDS));
    if (fx.freeReroll) state.freeRerolls += fx.freeReroll;
    if (fx.shopSlots && !state.shopLocked) rollShop(state);
  }
  state.pending.shift();
  return ok();
}

// ---------------- playing a round ----------------
export function opponentFor(state) {
  const games = gamesForRound(state.season, state.season.round);
  const g = games.find((x) => x.home === 'U' || x.away === 'U');
  if (!g) return null;
  const oppId = g.home === 'U' ? g.away : g.home;
  return { game: g, team: teamById(state.season, oppId), home: g.home === 'U' && !g.neutral, neutral: !!g.neutral };
}

export function opponentLineup(state, team) {
  return aiTeam(state, team, state.season.round);
}

export function isBigGame(state, oppId) {
  return isPlayoff(state.season.round) || oppId === state.season.rivalId;
}

export function playRound(state) {
  const season = state.season;
  const round = season.round;
  const mod = seasonMod(state);
  const opp = opponentFor(state);
  const results = [];
  let userGame = null;
  const games = gamesForRound(season, round);
  for (const g of games) {
    const homeT = g.home === 'U' ? userTeam(state) : aiTeam(state, teamById(season, g.home), round);
    const awayT = g.away === 'U' ? userTeam(state) : aiTeam(state, teamById(season, g.away), round);
    const isUser = g.home === 'U' || g.away === 'U';
    const big = isUser && isBigGame(state, g.home === 'U' ? g.away : g.home);
    const H = buildSide(homeT, { seasonMod: mod, home: !g.neutral, bigGame: big || g.playoff });
    const A = buildSide(awayT, { seasonMod: mod, home: false, bigGame: big || g.playoff });
    const seed = Math.floor(rng(state)() * 1e9);
    const res = simulateGame(H, A, { seed, seasonMod: mod });
    const rec = { round, home: g.home, away: g.away, score: res.score, region: !!g.region, playoff: !!g.playoff, preseason: !!g.preseason, ot: res.ot };
    results.push(rec);
    if (isUser) userGame = { ...rec, sim: res, sides: [H, A], userIdx: g.home === 'U' ? 0 : 1, oppId: g.home === 'U' ? g.away : g.home };
  }
  season.results.push(...results.filter((r) => !r.preseason || r.home === 'U' || r.away === 'U'));
  const won = userGame ? userGame.sim.winner === userGame.userIdx : false;
  const rewards = applyRewards(state, userGame, won);
  state.lastGame = { round, oppId: userGame?.oppId, won, score: userGame?.sim.score, userIdx: userGame?.userIdx, rewards, ot: userGame?.ot };

  // advance
  if (isPlayoff(round)) advancePlayoffs(season, round, results);
  season.round++;
  if (season.round === PRESEASON_ROUNDS + REG_WEEKS) seedPlayoffs(season);

  const over = seasonOver(state);
  if (over) { simRestOfPlayoffs(state); state.phase = 'seasonEnd'; }
  else {
    queueRoundChoices(state);
    if (!state.shopLocked) rollShop(state);
    state.phase = 'planning';
  }
  return userGame;
}

// After the user is eliminated (or misses), finish the bracket so there's a champion.
function simRestOfPlayoffs(state) {
  const season = state.season;
  const mod = seasonMod(state);
  if (!season.playoff && season.round >= PRESEASON_ROUNDS + REG_WEEKS) seedPlayoffs(season);
  let guard = 0;
  while (season.playoff && !season.playoff.champion && guard++ < 6) {
    const round = PRESEASON_ROUNDS + REG_WEEKS + season.playoff.rounds.length - 1;
    const games = playoffGames(season, round);
    const results = [];
    for (const g of games) {
      const toTeam = (id) => (id === 'U' ? userTeam(state) : aiTeam(state, teamById(season, id), round));
      const H = buildSide(toTeam(g.home), { seasonMod: mod, home: !g.neutral, bigGame: true });
      const A = buildSide(toTeam(g.away), { seasonMod: mod, bigGame: true });
      const res = simulateGame(H, A, { seed: Math.floor(rng(state)() * 1e9), seasonMod: mod });
      results.push({ round, home: g.home, away: g.away, score: res.score, playoff: true, ot: res.ot });
    }
    season.results.push(...results);
    advancePlayoffs(season, round, results);
  }
}

export function madePlayoffs(state) {
  const pf = state.season.playoff;
  return !!pf && pf.rounds[0].some((s) => s.id === 'U');
}

export function seasonOver(state) {
  const s = state.season;
  if (s.round >= TOTAL_ROUNDS) return true;
  if (s.round === PRESEASON_ROUNDS + REG_WEEKS && !madePlayoffs(state)) return true;
  if (isPlayoff(s.round) && !userAlive(s)) return true;
  if (s.playoff?.champion) return true;
  return false;
}

function applyRewards(state, userGame, won) {
  const r = rng(state);
  const pre = userGame && isPreseason(userGame.round);
  const out = { gold: [], components: [], xp: 0, perks: [], devUps: [] };
  // streak (preseason doesn't count)
  if (!pre) state.streak = won ? (state.streak > 0 ? state.streak + 1 : 1) : (state.streak < 0 ? state.streak - 1 : -1);
  const side = userGame ? userGame.sides[userGame.userIdx] : buildSide(userTeam(state));
  const inc = BASE_INCOME;
  const intr = interest(state.gold);
  const stk = pre ? 0 : streakBonus(state.streak);
  out.gold.push(['Weekly budget', inc]);
  if (intr) out.gold.push(['Interest', intr]);
  if (stk) out.gold.push([state.streak > 0 ? `Win streak (${state.streak})` : `Loss streak (${-state.streak})`, stk]);
  if (won) out.gold.push(['Win bonus', 1]);
  if (side.gold) out.gold.push(['Transfer boosters', side.gold]);
  const hireGold = state.hires.reduce((s, h) => s + (HIRES[h].fx.gold || 0), 0);
  if (hireGold) out.gold.push(['Booster club', hireGold]);
  const mod = seasonMod(state);
  if (mod.gold) out.gold.push([mod.name, mod.gold]);
  if (!won) {
    const lb = state.hires.reduce((s, h) => s + (HIRES[h].fx.lossBonus || 0), 0);
    if (lb) out.gold.push(['Embrace the Grind', lb]);
  }
  if (userGame && userGame.oppId === state.season.rivalId && won && !pre) out.gold.push(['Rivalry win', 3]);
  for (const [, g] of out.gold) state.gold += g;

  // gear: losses always pay a component, wins sometimes
  const nComp = won ? (r.chance(0.4) ? 1 : 0) : 1 + (state.hires.some((h) => HIRES[h].fx.lossBonus) ? 1 : 0);
  for (let i = 0; i < nComp; i++) { const c = r.pick(COMPONENT_IDS); state.components.push(c); out.components.push(c); }

  // program XP
  const xp = PASSIVE_XP + state.hires.reduce((s, h) => s + (HIRES[h].fx.xp || 0), 0);
  const before = state.level;
  addXP(state, xp);
  out.xp = xp;
  if (state.level > before) out.levelUp = state.level;

  // player development (RPG)
  const devMult = state.hires.reduce((m, h) => Math.max(m, HIRES[h].fx.devMult || 1), 1);
  const potg = userGame ? userGame.sim.potgBySide[userGame.userIdx] : null;
  for (const slot of ALL_SLOTS) {
    const u = state.board[slot];
    if (!u) continue;
    let gain = (1 + (won ? 1 : 0)) * devMult;
    if (potg && potg.uid === u.uid) {
      gain += 2;
      if (!u.perk && r.chance(0.6)) { u.perk = r.pick(PERK_IDS); out.perks.push({ uid: u.uid, perk: u.perk }); }
    }
    u.xp += gain;
    while (u.xp >= 5) { u.xp -= 5; u.dev++; out.devUps.push(u.uid); }
  }
  if (state.freeRerolls < 1) state.freeRerolls = state.hires.reduce((s, h) => s + (HIRES[h].fx.freeReroll || 0), 0);
  return out;
}

// ---------------- season end ----------------
export function seasonSummary(state) {
  const s = state.season;
  const rec = records(s).U;
  const standing = regionStandings(s, 0).findIndex((x) => x.id === 'U') + 1;
  let result;
  if (s.playoff?.champion === 'U') result = 'State Champions';
  else if (!madePlayoffs(state)) result = 'Missed the playoffs';
  else {
    let reached = 0;
    s.playoff.rounds.forEach((rd, i) => { if (rd.some((x) => x.id === 'U')) reached = i; });
    result = ['Lost in the First Round', 'Lost in the Quarterfinals', 'Lost in the Semifinals', 'Lost in the State Championship'][Math.min(3, reached)];
  }
  const playoffW = s.results.filter((g) => g.playoff && ((g.home === 'U' && g.score[0] > g.score[1]) || (g.away === 'U' && g.score[1] > g.score[0]))).length;
  const playoffL = s.results.filter((g) => g.playoff && ((g.home === 'U' && g.score[0] < g.score[1]) || (g.away === 'U' && g.score[1] < g.score[0]))).length;
  const seniors = allUnits(state).filter((u) => u.cls >= 3);
  return { year: s.year, w: rec.w + playoffW, l: rec.l + playoffL, rw: rec.rw, rl: rec.rl, regionFinish: standing, result, champion: s.playoff?.champion === 'U', seniors, classification: CLASSIFICATIONS[state.program.classIdx] };
}

export function finishSeason(state) {
  const sum = seasonSummary(state);
  const p = state.program;
  let prestigeDelta = 0;
  if (sum.champion) prestigeDelta = 1;
  else if (sum.result.includes('Semifinals') || sum.result.includes('Championship')) prestigeDelta = 0.5;
  else if (!madePlayoffs(state)) prestigeDelta = -0.5;
  p.prestige = Math.max(0, Math.min(5, p.prestige + prestigeDelta));
  let moved = 0;
  if (sum.champion && p.classIdx < CLASSIFICATIONS.length - 1) { p.classIdx++; moved = 1; }
  p.history.push({ year: sum.year, w: sum.w, l: sum.l, result: sum.result, cls: sum.classification });
  if (sum.champion) p.titles++;
  p.seasonsPlayed++;
  // graduation + offseason development
  const graduated = [];
  for (const u of allUnits(state)) {
    if (u.cls >= 3) { graduated.push(u); for (const it of u.items) state.components.push(it); removeUnit(state, u); }
    else { u.cls++; u.dev += 1; }
  }
  startSeason(state);
  return { ...sum, graduated, prestigeDelta, moved, newClass: CLASSIFICATIONS[p.classIdx] };
}

// ---------------- save / load ----------------
export function save(state) {
  try {
    const copy = { ...state, lastGame: state.lastGame ? { ...state.lastGame } : null };
    localStorage.setItem(SAVE_KEY, JSON.stringify(copy));
    return true;
  } catch (e) { return false; }
}
export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.version !== 1) return null;
    return s;
  } catch (e) { return null; }
}
export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}

// ---------------- helpers ----------------
function ok(extra = {}) { return { ok: true, ...extra }; }
function fail(msg) { return { ok: false, msg }; }

export { countTraits, gearInfo, isPreseason, isRegular, isPlayoff };
