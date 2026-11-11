import { buildSide, overall } from '../js/engine/ratings.js';
import { simulateGame } from '../js/engine/sim.js';
import { aiLineup } from '../js/engine/ai.js';
import { makeRng } from '../js/rng.js';
const rng = makeRng(5);
const buckets = {};
for (let i = 0; i < 1500; i++) {
  const r = rng.int(2, 15);
  const a = { id: 'a' + i, name: 'A', short: 'A', seed: rng.int(1, 1e6), quality: 0.85 + rng() * 0.3, style: 'airraid', origin: 'cityprep' };
  const b = { id: 'b' + i, name: 'B', short: 'B', seed: rng.int(1, 1e6), quality: 0.85 + rng() * 0.3, style: 'blitz', origin: 'smalltown' };
  const A = buildSide(aiLineup(a, r)), B = buildSide(aiLineup(b, r));
  const gap = overall(A).ovr - overall(B).ovr;
  const g = simulateGame(A, B, { seed: i + 1 });
  const k = Math.max(-5, Math.min(5, Math.round(gap / 3)));
  buckets[k] = buckets[k] || [0, 0];
  buckets[k][0]++; if (g.winner === 0) buckets[k][1]++;
}
for (const k of Object.keys(buckets).map(Number).sort((x, y) => x - y)) console.log('ovr gap ~', k * 3, 'n', buckets[k][0], 'win', (buckets[k][1] / buckets[k][0]).toFixed(2));
