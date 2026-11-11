// Small seeded random number generator (mulberry32) so games can be replayed from a seed.
export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  const next = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = () => next();
  rng.int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  rng.pick = (arr) => arr[Math.floor(next() * arr.length)];
  rng.chance = (p) => next() < p;
  rng.normal = (mean = 0, sd = 1) => {
    let u = 0, v = 0;
    while (u === 0) u = next();
    while (v === 0) v = next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  rng.weighted = (items, weightFn) => {
    let total = 0;
    const ws = items.map((it) => { const w = Math.max(0, weightFn(it)); total += w; return w; });
    if (total <= 0) return items[0];
    let r = next() * total;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  };
  rng.shuffle = (arr) => {
    const a2 = arr.slice();
    for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; }
    return a2;
  };
  return rng;
}

export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 31) + 1;
}
