// Season structure: 4 regions of 8, a 10-week schedule (3 non-region + 7 region games),
// region standings, and a 16-team playoff where the top 4 in each region make it.
// Seeding is AHSAA style: region 1's #1 hosts region 2's #4, and so on.
import { makeRng } from '../rng.js';
import { SCHOOLS, TEAM_COLORS, SEASON_MODS, FIRST_NAMES, LAST_NAMES } from '../data/content.js';
import { aiPersonality } from './ai.js';

export const PRESEASON_ROUNDS = 2;
export const REG_WEEKS = 10;
export const PLAYOFF_ROUNDS = 4;
export const TOTAL_ROUNDS = PRESEASON_ROUNDS + REG_WEEKS + PLAYOFF_ROUNDS; // 16
export const PLAYOFF_NAMES = ['First Round', 'Quarterfinals', 'Semifinals', 'State Championship'];
export const SIGNING_ROUNDS = [0, 4, 8, 12];
export const HIRE_ROUNDS = [2, 5, 9];

export function roundLabel(round) {
  if (round === 0) return 'Preseason Scrimmage';
  if (round === 1) return 'Jamboree';
  if (round < PRESEASON_ROUNDS + REG_WEEKS) return `Week ${round - PRESEASON_ROUNDS + 1}`;
  return PLAYOFF_NAMES[round - PRESEASON_ROUNDS - REG_WEEKS];
}
export const isPreseason = (r) => r < PRESEASON_ROUNDS;
export const isRegular = (r) => r >= PRESEASON_ROUNDS && r < PRESEASON_ROUNDS + REG_WEEKS;
export const isPlayoff = (r) => r >= PRESEASON_ROUNDS + REG_WEEKS;

export function createSeason(program, seed, year) {
  const rng = makeRng(seed);
  const schools = rng.shuffle(SCHOOLS).slice(0, 31);
  const teams = [];
  const user = {
    id: 'U', name: program.name, mascot: program.mascot, short: program.short || program.name, colors: program.colors,
    region: 0, user: true, quality: 1,
  };
  teams.push(user);
  const usedColors = new Set([program.colors.name]);
  schools.forEach(([name, mascot], i) => {
    let color = rng.pick(TEAM_COLORS);
    if (usedColors.has(color.name) && rng.chance(0.6)) color = rng.pick(TEAM_COLORS);
    const pers = aiPersonality(rng);
    teams.push({
      id: `T${i}`, name, mascot, short: name, colors: color,
      region: Math.floor((i + 1) / 8),
      quality: Math.round((0.84 + rng() * 0.3) * 100) / 100,
      seed: rng.int(1, 1e9), style: pers.style, origin: pers.origin,
      coach: `Coach ${rng.pick(LAST_NAMES)}`,
    });
  });
  // Make sure user's region has a spread: one clear favorite, one doormat.
  const myRegion = teams.filter((t) => t.region === 0 && !t.user);
  myRegion.sort((a, b) => b.quality - a.quality);
  myRegion[0].quality = Math.max(myRegion[0].quality, 1.12);
  myRegion[myRegion.length - 1].quality = Math.min(myRegion[myRegion.length - 1].quality, 0.86);

  const rival = rng.pick(myRegion.slice(1, 6));
  const mod = rng.pick(SEASON_MODS);
  const schedule = buildSchedule(teams, rng);
  const preseason = [rng.pick(teams.filter((t) => t.region === 1)).id, rng.pick(teams.filter((t) => t.region === 2)).id];

  return {
    year, seed, mod: mod.id, teams, schedule, preseason, rivalId: rival.id,
    results: [], // {round, home, away, score:[h,a], region:boolean, ot}
    playoff: null,
    round: 0,
  };
}

function roundRobin(ids) {
  // circle method, 8 teams -> 7 rounds of 4 games
  const arr = ids.slice();
  const rounds = [];
  for (let r = 0; r < arr.length - 1; r++) {
    const games = [];
    for (let i = 0; i < arr.length / 2; i++) {
      const a = arr[i], b = arr[arr.length - 1 - i];
      games.push((r + i) % 2 ? [a, b] : [b, a]);
    }
    rounds.push(games);
    arr.splice(1, 0, arr.pop());
  }
  return rounds;
}

function buildSchedule(teams, rng) {
  const byRegion = [0, 1, 2, 3].map((r) => rng.shuffle(teams.filter((t) => t.region === r).map((t) => t.id)));
  const weeks = [];
  const pairings = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
  for (let w = 0; w < 3; w++) {
    const games = [];
    for (const [ra, rb] of pairings[w]) {
      const A = rng.shuffle(byRegion[ra]), B = rng.shuffle(byRegion[rb]);
      for (let i = 0; i < 8; i++) games.push(i % 2 ? [A[i], B[i]] : [B[i], A[i]]);
    }
    weeks.push(games.map(([h, a]) => ({ home: h, away: a, region: false })));
  }
  const rr = byRegion.map((ids) => roundRobin(ids));
  for (let w = 0; w < 7; w++) {
    const games = [];
    for (let r = 0; r < 4; r++) for (const [h, a] of rr[r][w]) games.push({ home: h, away: a, region: true });
    weeks.push(games);
  }
  // Mix it up: shuffle so region play starts in week 3 or 4 sometimes.
  const nonRegion = weeks.slice(0, 3), region = weeks.slice(3);
  return [nonRegion[0], nonRegion[1], region[0], nonRegion[2], ...region.slice(1)];
}

export function teamById(season, id) {
  return season.teams.find((t) => t.id === id);
}

export function records(season) {
  const rec = {};
  for (const t of season.teams) rec[t.id] = { id: t.id, w: 0, l: 0, rw: 0, rl: 0, pf: 0, pa: 0, streak: 0, results: [] };
  for (const g of season.results) {
    if (g.playoff || g.preseason) continue;
    const [hs, as] = g.score;
    const H = rec[g.home], A = rec[g.away];
    H.pf += hs; H.pa += as; A.pf += as; A.pa += hs;
    const hw = hs > as;
    const win = hw ? H : A, loss = hw ? A : H;
    win.w++; loss.l++;
    if (g.region) { win.rw++; loss.rl++; }
    win.streak = win.streak > 0 ? win.streak + 1 : 1;
    loss.streak = loss.streak < 0 ? loss.streak - 1 : -1;
    H.results.push({ opp: g.away, won: hw, score: [hs, as], round: g.round });
    A.results.push({ opp: g.home, won: !hw, score: [as, hs], round: g.round });
  }
  return rec;
}

function h2h(season, a, b) {
  let aw = 0, bw = 0;
  for (const g of season.results) {
    if (g.playoff || g.preseason) continue;
    if ((g.home === a && g.away === b) || (g.home === b && g.away === a)) {
      const winner = g.score[0] > g.score[1] ? g.home : g.away;
      if (winner === a) aw++; else bw++;
    }
  }
  return aw - bw;
}

export function regionStandings(season, region) {
  const rec = records(season);
  const list = season.teams.filter((t) => t.region === region).map((t) => ({ team: t, ...rec[t.id] }));
  list.sort((x, y) => {
    const rx = x.rw / Math.max(1, x.rw + x.rl), ry = y.rw / Math.max(1, y.rw + y.rl);
    if (y.rw - y.rl !== x.rw - x.rl) return (y.rw - y.rl) - (x.rw - x.rl);
    if (ry !== rx) return ry - rx;
    const hh = h2h(season, x.id, y.id);
    if (hh) return -hh;
    if (y.w - y.l !== x.w - x.l) return (y.w - y.l) - (x.w - x.l);
    const pd = (y.pf - y.pa) - (x.pf - x.pa);
    if (pd) return pd;
    return (x.team.seed || 0) - (y.team.seed || 0);
  });
  return list;
}

export function gamesForRound(season, round) {
  if (isPreseason(round)) return [{ home: 'U', away: season.preseason[round], preseason: true }];
  if (isRegular(round)) return season.schedule[round - PRESEASON_ROUNDS];
  return playoffGames(season, round);
}

// ----- playoffs -----
export function seedPlayoffs(season) {
  const seeds = [0, 1, 2, 3].map((r) => regionStandings(season, r).slice(0, 4).map((x) => x.id));
  const S = (r, s) => ({ id: seeds[r][s], seed: s + 1, region: r });
  const slots = [
    S(0, 0), S(1, 3), S(1, 1), S(0, 2), S(1, 0), S(0, 3), S(0, 1), S(1, 2),
    S(2, 0), S(3, 3), S(3, 1), S(2, 2), S(3, 0), S(2, 3), S(2, 1), S(3, 2),
  ];
  season.playoff = { rounds: [slots], champion: null };
  return season.playoff;
}

export function playoffGames(season, round) {
  const pr = round - PRESEASON_ROUNDS - REG_WEEKS;
  const field = season.playoff?.rounds[pr];
  if (!field) return [];
  const games = [];
  for (let i = 0; i < field.length; i += 2) {
    const a = field[i], b = field[i + 1];
    // better seed hosts; final is at a neutral site (listed home = better seed)
    const aHome = a.seed < b.seed || (a.seed === b.seed && i % 4 === 0);
    games.push({ home: aHome ? a.id : b.id, away: aHome ? b.id : a.id, playoff: true, neutral: pr === 3, slotA: a, slotB: b });
  }
  return games;
}

export function advancePlayoffs(season, round, results) {
  const pr = round - PRESEASON_ROUNDS - REG_WEEKS;
  const field = season.playoff.rounds[pr];
  const next = [];
  for (let i = 0; i < field.length; i += 2) {
    const a = field[i], b = field[i + 1];
    const g = results.find((r) => (r.home === a.id && r.away === b.id) || (r.home === b.id && r.away === a.id));
    const winnerId = g.score[0] > g.score[1] ? g.home : g.away;
    next.push(winnerId === a.id ? a : b);
  }
  if (next.length === 1) season.playoff.champion = next[0].id;
  else season.playoff.rounds.push(next);
}

export function userAlive(season) {
  if (!season.playoff) return true;
  const last = season.playoff.rounds[season.playoff.rounds.length - 1];
  return last.some((s) => s.id === 'U') && !season.playoff.champion;
}

export function seasonModById(id) {
  return SEASON_MODS.find((m) => m.id === id) || SEASON_MODS[0];
}
