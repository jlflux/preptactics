// Headless balance checks: node tools/balance.mjs
import { buildSide, overall } from '../js/engine/ratings.js';
import { simulateGame } from '../js/engine/sim.js';
import { aiLineup } from '../js/engine/ai.js';

const mk = (id, quality, style, origin) => ({ id, name: id, short: id, seed: id.length * 97 + quality * 1000, quality, style, origin });
const teams = [mk('Alpha', 1.0, 'airraid', 'cityprep'), mk('Bravo', 1.0, 'groundpound', 'farmstrong'), mk('Charlie', 0.8, 'blitz', 'smalltown'), mk('Delta', 1.2, 'lockdown', 'transfer')];

function agg(a, b, round, n = 300) {
  let wins = 0, pts = [0, 0], plays = 0, ot = 0, stats = { pa: 0, pc: 0, py: 0, int: 0, ra: 0, ry: 0, sk: 0, fum: 0, td: 0 };
  for (let i = 0; i < n; i++) {
    const A = buildSide(aiLineup(a, round), { home: true });
    const B = buildSide(aiLineup(b, round), {});
    const g = simulateGame(A, B, { seed: 1000 + i * 13 + round });
    if (g.winner === 0) wins++;
    pts[0] += g.score[0]; pts[1] += g.score[1];
    plays += g.plays.filter((p) => ['run', 'pass', 'inc', 'sack', 'scramble'].includes(p.type) || p.td).length;
    if (g.ot) ot++;
    for (const l of Object.values(g.box[0])) { stats.pa += l.pa; stats.pc += l.pc; stats.py += l.py; stats.int += l.int; stats.ra += l.ra; stats.ry += l.ry; }
    for (const l of Object.values(g.box[1])) { stats.sk += l.sk; }
    stats.fum += g.plays.filter((p) => p.type === 'fumble' && p.off === 0).length;
  }
  return { winA: (wins / n).toFixed(2), ptsA: (pts[0] / n).toFixed(1), ptsB: (pts[1] / n).toFixed(1), playsPerGame: (plays / n).toFixed(0), otRate: (ot / n).toFixed(2),
    compPct: (stats.pc / stats.pa).toFixed(2), passYds: (stats.py / n).toFixed(0), att: (stats.pa / n).toFixed(1), ints: (stats.int / n).toFixed(2), ypc: (stats.ry / stats.ra).toFixed(2), rushAtt: (stats.ra / n).toFixed(1), sacks: (stats.sk / n).toFixed(2), fum: (stats.fum / n).toFixed(2) };
}

for (const r of [0, 5, 11, 15]) {
  console.log('round', r, 'ovr', overall(buildSide(aiLineup(teams[0], r))), overall(buildSide(aiLineup(teams[2], r))), overall(buildSide(aiLineup(teams[3], r))));
  console.log(' A vs B', agg(teams[0], teams[1], r));
  console.log(' A vs C(weak)', agg(teams[0], teams[2], r, 200));
  console.log(' A vs D(strong)', agg(teams[0], teams[3], r, 200));
}
