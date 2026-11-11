// Builds AI opponents' lineups. AI programs get stronger as the season goes on,
// roughly tracking how a human's board grows, scaled by each program's quality
// and by the classification you play in.
import { makeRng } from '../rng.js';
import { CARD_LIST, CARDS } from '../data/cards.js';
import { SLOT_POS } from '../data/slots.js';
import { SHOP_ODDS, MAX_LEVEL } from './economy.js';
import { GEAR, COMPONENT_IDS } from '../data/gear.js';
import { FIRST_NAMES, LAST_NAMES, HIRE_IDS, HIRES } from '../data/content.js';
import { STARTER_CAP } from '../data/slots.js';

const FILL_ORDER = ['QB', 'RB', 'WR1', 'DL1', 'DB1', 'OL1', 'LB1', 'WR2', 'DL2', 'DB2', 'TE', 'LB2', 'OL2', 'WR3', 'DB3'];
const GEAR_IDS = Object.keys(GEAR);
const ORIGINS = ['smalltown', 'cityprep', 'farmstrong', 'coachskid', 'transfer', 'multisport'];
// Hires that make sense for an AI to have (no economy ones).
const AI_HIRES = HIRE_IDS.filter((h) => !['boosterclub', 'tailgate', 'recruitingcoord', 'twoadayscamp', 'equipmanager', 'embracethegrind'].includes(h));

export function aiPersonality(rng) {
  return {
    style: rng.pick(['airraid', 'groundpound', 'trench', 'blitz', 'lockdown', 'ballhawk', 'playmaker']),
    origin: rng.pick(ORIGINS),
  };
}

// round: 0-1 preseason, 2-11 regular season weeks 1-10, 12-15 playoffs.
// difficulty: classification multiplier (1.0 at the default level).
export function aiLineup(team, round, difficulty = 1) {
  const rng = makeRng((team.seed * 7919 + round * 104729) >>> 0);
  const q = team.quality * difficulty;
  const eff = round <= 10 ? round : 10 + (round - 10) * 0.6;
  const prog = eff * (1 + (q - 1) * 0.6);
  const level = Math.max(1, Math.min(MAX_LEVEL, Math.round(1.5 + prog * 0.45)));
  const filled = Math.min(15, STARTER_CAP[level] + (q > 1.1 ? 1 : 0));
  const odds = SHOP_ODDS[level];
  const board = {};
  const used = new Set();
  for (let i = 0; i < FILL_ORDER.length; i++) {
    const slot = FILL_ORDER[i];
    if (i >= filled) { board[slot] = null; continue; }
    const pos = SLOT_POS[slot];
    // AI favors better players at premium slots.
    let tier = rollTier(rng, odds);
    if (i < 3 && rng.chance(0.35)) tier = Math.min(5, tier + 1);
    let options = [];
    for (let t = tier; t >= 1 && !options.length; t--) options = CARD_LIST.filter((c) => c.pos === pos && c.tier === t && !used.has(c.id));
    if (!options.length) options = CARD_LIST.filter((c) => c.pos === pos && !used.has(c.id));
    if (!options.length) options = CARD_LIST.filter((c) => c.pos === pos);
    const card = rng.weighted(options, (c) => 1 + (c.traits.includes(team.style) ? 3 : 0) + (c.traits.includes(team.origin) ? 2 : 0));
    used.add(card.id);
    const t2 = Math.max(0, Math.min(0.7, (prog - 3) * 0.055));
    const t3 = card.tier <= 2 ? Math.max(0, Math.min(0.2, (prog - 11) * 0.04)) : Math.max(0, Math.min(0.08, (prog - 13) * 0.03));
    const r = rng();
    const star = r < t3 ? 3 : r < t3 + t2 ? 2 : 1;
    board[slot] = {
      uid: `${team.id}-${slot}`, card: card.id, star, items: [], cls: rng.int(0, 3), dev: Math.max(0, Math.round((prog - 4) / 5)),
      name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`, num: card.num,
    };
  }
  // Gear: components early, finished items later.
  const finished = Math.max(0, Math.floor((prog - 2) / 2.6));
  const keys = FILL_ORDER.filter((k) => board[k]).slice(0, 8);
  for (let i = 0; i < finished && keys.length; i++) {
    const k = keys[i % keys.length];
    if (board[k].items.length < 3) board[k].items.push(rng.pick(GEAR_IDS));
  }
  if (finished === 0 && prog > 1 && keys.length) board[keys[0]].items.push(rng.pick(COMPONENT_IDS));
  // Hires
  const hires = [];
  const nh = prog >= 9 ? 3 : prog >= 5 ? 2 : prog >= 2.5 ? 1 : 0;
  const hrng = makeRng(team.seed * 31 + 7);
  const pool = hrng.shuffle(AI_HIRES.filter((h) => !HIRES[h].fx.traitPlus || HIRES[h].fx.traitPlus === team.style));
  for (let i = 0; i < nh; i++) hires.push(pool[i]);
  return { ...team, board, hires, level };
}

function rollTier(rng, odds) {
  let r = rng() * 100;
  for (let t = 0; t < 5; t++) { r -= odds[t]; if (r < 0) return t + 1; }
  return 1;
}

export { CARDS };
