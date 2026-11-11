// Player cards. Like champions in TFT: each card is a specific player, the shop sells copies,
// and 3 copies of the same card (same star level) combine into the next star.

export const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB'];

export const POS_NAMES = {
  QB: 'Quarterback', RB: 'Running Back', WR: 'Wide Receiver', TE: 'Tight End',
  OL: 'Offensive Line', DL: 'Defensive Line', LB: 'Linebacker', DB: 'Defensive Back',
};

export const STAT_NAMES = { spd: 'Speed', str: 'Strength', hnd: 'Hands', iq: 'IQ', tgh: 'Toughness' };
export const STATS = ['spd', 'str', 'hnd', 'iq', 'tgh'];

// Base stats by position at tier 1.
const TEMPLATE = {
  QB: { spd: 45, str: 55, hnd: 46, iq: 56, tgh: 42 },
  RB: { spd: 60, str: 52, hnd: 50, iq: 42, tgh: 52 },
  WR: { spd: 62, str: 38, hnd: 58, iq: 46, tgh: 36 },
  TE: { spd: 46, str: 58, hnd: 52, iq: 46, tgh: 52 },
  OL: { spd: 30, str: 62, hnd: 32, iq: 50, tgh: 58 },
  DL: { spd: 46, str: 62, hnd: 32, iq: 42, tgh: 56 },
  LB: { spd: 52, str: 55, hnd: 42, iq: 50, tgh: 58 },
  DB: { spd: 62, str: 40, hnd: 52, iq: 52, tgh: 42 },
};
const TIER_BONUS = [0, 0, 6, 11, 16, 22];

// Signature skills. Mods scale with star level (see SIG_SCALE).
export const SIGS = {
  gunslinger: { name: 'Gunslinger', desc: 'Takes deep shots. Big plays, a few more picks.', mods: { deep: 0.12, airYards: 2, intRisk: 0.01 }, stats: { str: 6 } },
  scrambler: { name: 'Scrambler', desc: 'Escapes pressure and takes off running.', mods: { scramble: 0.4 }, stats: { spd: 10 } },
  pocket: { name: 'Pocket Passer', desc: 'Stands tall under pressure. Accuracy holds.', mods: { pocket: 0.45 }, stats: { iq: 6 } },
  workhorse: { name: 'Workhorse', desc: 'Steady yards every carry. Rarely fumbles.', mods: { ypc: 0.5, secure: 0.35 }, stats: { tgh: 6 } },
  breakaway: { name: 'Breakaway', desc: 'One cut and he is gone.', mods: { breakaway: 0.035 }, stats: { spd: 8 } },
  bruiser: { name: 'Bruiser', desc: 'Falls forward. Extra yards after contact.', mods: { breakTackle: 1.1 }, stats: { str: 8 } },
  deepthreat: { name: 'Deep Threat', desc: 'Gets targeted deep.', mods: { deep: 0.15 }, stats: { spd: 7 } },
  possession: { name: 'Possession', desc: 'Reliable hands. The 3rd-down target.', mods: { target: 0.3, thirdDown: 0.6, catch: 0.05 }, stats: { hnd: 7 } },
  yac: { name: 'YAC Monster', desc: 'Makes the first man miss after the catch.', mods: { yac: 2 }, stats: { spd: 4, str: 4 } },
  anchor: { name: 'Anchor', desc: 'Pass protection specialist.', mods: { passPro: 6 }, stats: { tgh: 6 } },
  mauler: { name: 'Mauler', desc: 'Run blocking specialist.', mods: { runBlock: 6 }, stats: { str: 6 } },
  passrusher: { name: 'Pass Rusher', desc: 'Lives in the backfield on passing downs.', mods: { rush: 7 }, stats: { spd: 6 } },
  runstuffer: { name: 'Run Stuffer', desc: 'Plugs gaps. Tackles for loss.', mods: { tfl: 0.03, runStop: 5 }, stats: { str: 6 } },
  thumper: { name: 'Thumper', desc: 'Big hits. Knocks the ball loose.', mods: { forceFumble: 0.6, runStop: 3 }, stats: { tgh: 6 } },
  shutdown: { name: 'Shutdown', desc: 'Erases his man in coverage.', mods: { cover: 7 }, stats: { spd: 5 } },
  hawk: { name: 'Ball Hawk', desc: 'Jumps routes for interceptions.', mods: { hawk: 0.6 }, stats: { hnd: 7 } },
  leader: { name: 'Team Captain', desc: 'Whole team +4 IQ (more at higher stars).', mods: { leader: 4 }, stats: { iq: 6 } },
};
export const SIG_SCALE = [0, 1, 1.5, 2.2];

// [id, name, pos, tier, origin, style, sig]
const RAW = [
  // Tier 1
  ['hale', 'Tucker Hale', 'QB', 1, 'smalltown', 'airraid', 'pocket'],
  ['pruitt', 'Dewayne Pruitt', 'RB', 1, 'farmstrong', 'groundpound', 'workhorse'],
  ['ortega', 'Luis Ortega', 'RB', 1, 'cityprep', 'playmaker', 'breakaway'],
  ['jenkins', 'Cole Jenkins', 'WR', 1, 'smalltown', 'airraid', 'possession'],
  ['wiley', 'DeShawn Wiley', 'WR', 1, 'cityprep', 'playmaker', 'deepthreat'],
  ['grimes', 'Hunter Grimes', 'TE', 1, 'farmstrong', 'groundpound', 'bruiser'],
  ['duncan', 'Bo Duncan', 'OL', 1, 'farmstrong', 'trench', 'mauler'],
  ['kowalski', 'Marty Kowalski', 'OL', 1, 'cityprep', 'groundpound', 'anchor'],
  ['pike', 'Rusty Pike', 'DL', 1, 'smalltown', 'trench', 'runstuffer'],
  ['hollis', 'Tremaine Hollis', 'DL', 1, 'cityprep', 'blitz', 'passrusher'],
  ['mercer', 'Clay Mercer', 'LB', 1, 'smalltown', 'lockdown', 'thumper'],
  ['pryor', 'Nate Pryor', 'LB', 1, 'coachskid', 'blitz', 'runstuffer'],
  ['moss', 'Kendrick Moss', 'DB', 1, 'cityprep', 'lockdown', 'shutdown'],
  ['sutton', 'Eli Sutton', 'DB', 1, 'smalltown', 'ballhawk', 'hawk'],
  // Tier 2
  ['brooks', 'Jaylen Brooks', 'QB', 2, 'cityprep', 'playmaker', 'scrambler'],
  ['holloway', 'Tank Holloway', 'RB', 2, 'smalltown', 'groundpound', 'bruiser'],
  ['moreland', 'Ty Moreland', 'WR', 2, 'multisport', 'airraid', 'deepthreat'],
  ['alvarez', 'Rico Alvarez', 'WR', 2, 'transfer', 'playmaker', 'yac'],
  ['coleman', 'Wyatt Coleman', 'TE', 2, 'smalltown', 'airraid', 'possession'],
  ['ramsey', 'Jesse Ramsey', 'OL', 2, 'smalltown', 'trench', 'anchor'],
  ['lindqvist', 'Gus Lindqvist', 'DL', 2, 'farmstrong', 'trench', 'runstuffer'],
  ['gaines', 'Rodney Gaines', 'LB', 2, 'transfer', 'ballhawk', 'thumper'],
  ['bishop', 'Cody Bishop', 'LB', 2, 'farmstrong', 'blitz', 'passrusher'],
  ['pace', 'Jordan Pace', 'DB', 2, 'multisport', 'playmaker', 'hawk'],
  // Tier 3
  ['whitfield', 'Cade Whitfield', 'QB', 3, 'coachskid', 'airraid', 'leader'],
  ['mims', 'Andre Mims', 'RB', 3, 'transfer', 'playmaker', 'breakaway'],
  ['shaw', 'Brennan Shaw', 'WR', 3, 'coachskid', 'airraid', 'possession'],
  ['patterson', 'Big Lou Patterson', 'TE', 3, 'farmstrong', 'trench', 'mauler'],
  ['boone', 'Hank "Tractor" Boone', 'OL', 3, 'farmstrong', 'groundpound', 'mauler'],
  ['cole', 'Darius Cole', 'DL', 3, 'transfer', 'blitz', 'passrusher'],
  ['whitley', 'Jamal Whitley', 'LB', 3, 'multisport', 'lockdown', 'leader'],
  ['bonner', 'Trey Bonner', 'DB', 3, 'transfer', 'lockdown', 'shutdown'],
  ['stroud', 'Micah Stroud', 'DB', 3, 'coachskid', 'ballhawk', 'hawk'],
  // Tier 4
  ['reed', 'Marcus "Sonic" Reed', 'QB', 4, 'multisport', 'playmaker', 'scrambler'],
  ['banks', 'Reggie Banks', 'RB', 4, 'transfer', 'groundpound', 'bruiser'],
  ['freeman', 'Malik Freeman', 'WR', 4, 'cityprep', 'airraid', 'deepthreat'],
  ['dalton', 'Zeke Dalton', 'WR', 4, 'multisport', 'playmaker', 'yac'],
  ['ellison', 'Grant Ellison', 'TE', 4, 'transfer', 'airraid', 'possession'],
  ['hartley', 'Mason Hartley', 'OL', 4, 'coachskid', 'trench', 'anchor'],
  ['whitaker', 'Boone Whitaker', 'DL', 4, 'farmstrong', 'blitz', 'passrusher'],
  ['harrington', 'Colt Harrington', 'LB', 4, 'coachskid', 'ballhawk', 'thumper'],
  ['rush', 'Devonte Rush', 'DB', 4, 'multisport', 'lockdown', 'shutdown'],
  // Tier 5
  ['kincaid', 'Brady Kincaid', 'QB', 5, 'fivestar', 'airraid', 'gunslinger'],
  ['carter', 'Isaiah "Jet" Carter', 'RB', 5, 'fivestar', 'groundpound', 'breakaway'],
  ['price', 'Jalen "Showtime" Price', 'WR', 5, 'fivestar', 'playmaker', 'deepthreat'],
  ['oyelaran', 'Titus Oyelaran', 'OL', 5, 'fivestar', 'trench', 'anchor'],
  ['king', 'Xavier "X" King', 'DL', 5, 'fivestar', 'blitz', 'passrusher'],
  ['tolliver', 'Bryce Tolliver', 'LB', 5, 'fivestar', 'lockdown', 'thumper'],
  ['vaughn', 'Amari Vaughn', 'DB', 5, 'fivestar', 'ballhawk', 'hawk'],
];

function jersey(pos, i) {
  const ranges = { QB: [1, 19], RB: [20, 39], WR: [1, 19], TE: [80, 89], OL: [50, 79], DL: [90, 99], LB: [40, 59], DB: [20, 39] };
  const [a, b] = ranges[pos];
  return a + ((i * 7 + 3) % (b - a + 1));
}

export const CARDS = {};
RAW.forEach(([id, name, pos, tier, origin, style, sig], i) => {
  const stats = {};
  for (const s of Object.keys(TEMPLATE[pos])) {
    stats[s] = TEMPLATE[pos][s] + TIER_BONUS[tier] + (SIGS[sig].stats[s] || 0);
  }
  CARDS[id] = { id, name, pos, tier, cost: tier, traits: [origin, style], sig, stats, num: jersey(pos, i) };
});

export const CARD_LIST = Object.values(CARDS);

// Copies of each card in the shared recruiting pool, by tier.
export const POOL_SIZE = [0, 18, 15, 12, 10, 8];

export const WALKON_STATS = { spd: 38, str: 38, hnd: 34, iq: 34, tgh: 38 };
