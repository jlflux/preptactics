// Play-by-play football simulation. Takes two sides from buildSide() and returns
// a list of plays (for animation and the play-by-play feed), the score and box stats.
// High school rules: 12-minute quarters, Kansas-style overtime from the 10.
import { makeRng } from '../rng.js';
import { COVERAGE } from '../data/slots.js';

const QUARTER = 720;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const avg = (arr) => arr.reduce((s, x) => s + x, 0) / arr.length;

function lastName(p) {
  if (p.walkon) return `the ${p.pos} walk-on`;
  const parts = p.name.replace(/".*?"\s*/, '').split(' ');
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

export function simulateGame(sideA, sideB, opts = {}) {
  const rng = makeRng(opts.seed || 1);
  const sides = [sideA, sideB];
  const score = [0, 0];
  const plays = [];
  const box = [{}, {}];
  const trickUsed = [0, 0];
  const st = { q: 1, clock: QUARTER, off: 0, yl: 25, down: 1, dist: 10, ot: false, otRound: 0 };

  const statLine = (si, p) => {
    const k = p.slot;
    if (!box[si][k]) box[si][k] = { slot: p.slot, name: p.name, pos: p.pos, walkon: p.walkon, uid: p.uid, pa: 0, pc: 0, py: 0, ptd: 0, int: 0, ra: 0, ry: 0, rtd: 0, rec: 0, recy: 0, rectd: 0, tkl: 0, sk: 0, dint: 0, ff: 0, dtd: 0 };
    return box[si][k];
  };

  // Effective stat with situational boosts.
  // Game-day form: some nights a team just has it. Keeps upsets possible.
  const form = [1 + clamp(rng.normal(0, 0.06), -0.14, 0.14), 1 + clamp(rng.normal(0, 0.06), -0.14, 0.14)];
  const factor = (si, p) => {
    const side = sides[si];
    let f = form[si];
    if (st.q >= 4 && p.mods.clutch) f += p.mods.clutch;
    if (st.q >= 3 && p.mods.secondHalf) f += p.mods.secondHalf;
    if (side.comeback && score[si] < score[1 - si]) f += side.comeback;
    if (side.bigGame) f += side.bigGame;
    if (side.home) f += 0.025 + (side.mods.homeBoost || 0);
    return f;
  };
  const S = (si, slot, stat) => {
    const p = sides[si].players[slot];
    return p.stats[stat] * factor(si, p);
  };
  const P = (si, slot) => sides[si].players[slot];
  const M = (si, key) => sides[si].mods[key] || 0;
  const PM = (si, slot, key) => sides[si].players[slot].mods[key] || 0;

  // ---- composite ratings ----
  const qbAcc = (o) => S(o, 'QB', 'iq') * 0.5 + S(o, 'QB', 'hnd') * 0.2 + S(o, 'QB', 'str') * 0.3;
  const passPro = (o) => avg(['OL1', 'OL2'].map((k) => S(o, k, 'str') * 0.45 + S(o, k, 'iq') * 0.25 + S(o, k, 'tgh') * 0.3)) * 0.75
    + (S(o, 'TE', 'str') * 0.6 + S(o, 'TE', 'tgh') * 0.4) * 0.15 + (S(o, 'RB', 'str') * 0.5 + S(o, 'RB', 'tgh') * 0.5) * 0.1
    + PM(o, 'OL1', 'passPro') + PM(o, 'OL2', 'passPro') + PM(o, 'TE', 'passPro') + M(o, 'lineO');
  const runBlock = (o) => avg(['OL1', 'OL2'].map((k) => S(o, k, 'str') * 0.6 + S(o, k, 'tgh') * 0.25 + S(o, k, 'iq') * 0.15)) * 0.7
    + (S(o, 'TE', 'str') * 0.7 + S(o, 'TE', 'tgh') * 0.3) * 0.2 + S(o, 'RB', 'str') * 0.1
    + PM(o, 'OL1', 'runBlock') + PM(o, 'OL2', 'runBlock') + PM(o, 'TE', 'runBlock') + M(o, 'lineO');
  const passRush = (d) => avg(['DL1', 'DL2'].map((k) => S(d, k, 'spd') * 0.45 + S(d, k, 'str') * 0.55)) * 0.75
    + avg(['LB1', 'LB2'].map((k) => S(d, k, 'spd') * 0.5 + S(d, k, 'str') * 0.5)) * 0.25
    + ['DL1', 'DL2', 'LB1', 'LB2'].reduce((s, k) => s + PM(d, k, 'rush'), 0) * 0.6 + M(d, 'lineD');
  const runStop = (d) => avg(['DL1', 'DL2'].map((k) => S(d, k, 'str') * 0.6 + S(d, k, 'tgh') * 0.4)) * 0.5
    + avg(['LB1', 'LB2'].map((k) => S(d, k, 'tgh') * 0.45 + S(d, k, 'str') * 0.3 + S(d, k, 'iq') * 0.25)) * 0.4
    + avg(['DB1', 'DB2', 'DB3'].map((k) => S(d, k, 'tgh') * 0.5 + S(d, k, 'spd') * 0.5)) * 0.1
    + ['DL1', 'DL2', 'LB1', 'LB2'].reduce((s, k) => s + PM(d, k, 'runStop'), 0) * 0.6 + M(d, 'lineD');
  const route = (o, k) => S(o, k, 'spd') * 0.45 + S(o, k, 'hnd') * 0.25 + S(o, k, 'iq') * 0.3 + PM(o, k, 'sep');
  const coverR = (d, k) => S(d, k, 'spd') * 0.45 + S(d, k, 'iq') * 0.35 + S(d, k, 'hnd') * 0.2 + PM(d, k, 'cover');

  const seasonMods = opts.seasonMod?.mods || {};
  const takeawayMult = (d, o) => (1 + M(d, 'takeaway')) * (1 - M(o, 'ballSecurity'));

  const pickTackler = (d, kind) => {
    const pool = kind === 'run'
      ? [['DL1', 0.22], ['DL2', 0.22], ['LB1', 0.38], ['LB2', 0.38], ['DB1', 0.08], ['DB2', 0.08], ['DB3', 0.12]]
      : [['LB1', 0.2], ['LB2', 0.2], ['DB1', 0.25], ['DB2', 0.25], ['DB3', 0.25], ['DL1', 0.05], ['DL2', 0.05]];
    return rng.weighted(pool, ([k, w]) => w * (S(d, k, 'tgh') + 20))[0];
  };

  const fieldText = (yl) => {
    if (yl === 50) return 'midfield';
    return yl < 50 ? `own ${yl}` : `opp ${100 - yl}`;
  };
  const clockStr = () => {
    if (st.ot) return `OT${st.otRound > 1 ? st.otRound : ''}`;
    const m = Math.floor(st.clock / 60), s = Math.floor(st.clock % 60);
    return `Q${st.q} ${m}:${String(s).padStart(2, '0')}`;
  };

  let pre = { down: 1, dist: 10 };
  const push = (play) => {
    plays.push({ q: st.q, clock: clockStr(), ot: st.ot, score: [...score], down: pre.down, dist: pre.dist, ...play });
  };

  const tick = (sec) => {
    if (st.ot) return;
    st.clock -= sec;
  };

  // Points after touchdown.
  const pat = (o) => {
    const d = 1 - o;
    const margin = score[o] - score[d];
    const goTwo = st.q >= 4 && [-2, -5, -10, 1].includes(margin) && !st.ot;
    if (goTwo || (st.ot && st.otRound >= 3)) {
      const p = clamp(0.44 + (runBlock(o) - runStop(d)) / 200, 0.25, 0.65);
      const good = rng.chance(p);
      if (good) score[o] += 2;
      push({ type: 'pat', off: o, text: good ? 'Two-point try is GOOD.' : 'Two-point try fails.', yl: 97, endYl: good ? 100 : 97 });
    } else {
      const good = rng.chance(0.92);
      if (good) score[o] += 1;
      push({ type: 'pat', off: o, text: good ? 'Extra point is good.' : 'Extra point NO GOOD.', yl: 97, endYl: 97, kick: true });
    }
  };

  let scorer = 0;
  const touchdown = (o, text, extra = {}) => {
    score[o] += 6;
    scorer = o;
    push({ type: extra.type || 'td', off: o, text: `${text} TOUCHDOWN ${sides[o].short}!`, big: true, td: true, ...extra });
    pat(o);
  };

  const kickoff = (kicking) => {
    const r = 1 - kicking;
    if (rng.chance(0.012 + (M(r, 'explosive') + (seasonMods.explosive || 0)) / 4)) {
      const ret = P(r, rng.pick(['WR1', 'WR2', 'RB', 'DB1']));
      statLine(r, ret);
      push({ type: 'kickoff', off: r, yl: 5, endYl: 100, text: `${lastName(ret)} takes the kickoff all the way!` });
      touchdown(r, 'Kick return', { type: 'return', yl: 5, endYl: 100 });
      return kickoff(r);
    }
    st.off = r;
    st.yl = clamp(Math.round(27 + rng.normal(0, 5) + M(r, 'fieldPos')), 15, 45);
    st.down = 1; st.dist = 10;
    push({ type: 'kickoff', off: r, yl: st.yl, endYl: st.yl, text: `${sides[kicking].short} kicks off. ${sides[r].short} starts at the ${fieldText(st.yl)}.` });
    tick(6);
  };

  const turnover = (newOff, spotYl) => {
    st.off = newOff;
    st.yl = clamp(Math.round(spotYl), 1, 99);
    st.down = 1; st.dist = Math.min(10, 100 - st.yl);
  };

  // Returns: 'continue' | 'score' | 'change'
  const runPlay = () => {
    const o = st.off, d = 1 - o;
    const startYl = st.yl;
    pre = { down: st.down, dist: st.dist };
    const lateTrail = st.q >= 4 && st.clock < 360 && score[o] < score[d];

    // ----- 4th down decisions -----
    if (st.down === 4) {
      const fgDist = 100 - st.yl + 17;
      const maxFG = 42 + M(o, 'kickRange');
      const goForIt = (st.dist <= 2 && st.yl >= 45) || (st.dist <= 1 && st.yl >= 30) || (lateTrail && (score[d] - score[o] > 3 || fgDist > maxFG))
        || (st.ot && (score[d] - score[o] > 3 || (fgDist > maxFG)));
      if (!goForIt && fgDist <= maxFG && !(st.ot && score[d] - score[o] > 3)) {
        const pct = clamp(0.98 - (fgDist - 20) * 0.022 + M(o, 'kickRange') * 0.006, 0.12, 0.97);
        const good = rng.chance(pct);
        tick(5);
        if (good) {
          score[o] += 3;
          scorer = o;
          push({ type: 'fg', off: o, yl: startYl, endYl: 100, big: true, text: `${fgDist}-yard field goal is GOOD.` });
          return 'score';
        }
        push({ type: 'fg', off: o, yl: startYl, endYl: startYl, big: true, miss: true, text: `${fgDist}-yard field goal is NO GOOD.` });
        if (st.ot) return 'change';
        turnover(d, Math.max(20, 100 - startYl - 7));
        return 'change';
      }
      if (!goForIt) {
        if (st.ot) return 'change';
        const net = Math.round(36 + rng.normal(0, 6) + M(o, 'fieldPos') * 0.5);
        let land = startYl + net;
        tick(8);
        if (rng.chance(0.01)) {
          const ret = P(d, rng.pick(['WR1', 'DB1', 'DB2']));
          push({ type: 'punt', off: o, yl: startYl, endYl: Math.min(95, land), text: `Punt... and ${lastName(ret)} breaks it!` });
          st.off = d;
          touchdown(d, 'Punt return', { type: 'return', yl: Math.max(5, 100 - land), endYl: 100 });
          return 'score';
        }
        if (land >= 100) land = 80;
        push({ type: 'punt', off: o, yl: startYl, endYl: land, text: `${sides[o].short} punts ${land >= 80 ? 'into the end zone. Touchback.' : `to the ${fieldText(100 - land)} of ${sides[d].short}.`}` });
        turnover(d, 100 - land);
        return 'change';
      }
    }

    // ----- trick play -----
    if (M(o, 'trick') > trickUsed[o] && st.yl >= 25 && st.yl <= 75 && st.down <= 2 && rng.chance(0.14)) {
      trickUsed[o]++;
      const r = rng();
      const names = ['Flea flicker', 'Hook and ladder', 'Double pass', 'Fake punt'];
      const nm = rng.pick(names);
      tick(10);
      if (r < 0.55) {
        const gain = rng.int(22, 48);
        const end = Math.min(100, st.yl + gain);
        if (end >= 100) { touchdown(o, `${nm}!`, { type: 'trick', yl: startYl, endYl: 100 }); return 'score'; }
        push({ type: 'trick', off: o, yl: startYl, endYl: end, big: true, text: `${nm}! ${gain}-yard gain.` });
        st.yl = end; st.down = 1; st.dist = Math.min(10, 100 - st.yl);
        return 'continue';
      } else if (r < 0.8) {
        push({ type: 'trick', off: o, yl: startYl, endYl: startYl, text: `${nm} is sniffed out. Incomplete.` });
        st.down++;
        return st.down > 4 ? (turnover(d, 100 - startYl), 'change') : 'continue';
      } else {
        push({ type: 'int', off: o, yl: startYl, endYl: startYl + 10, big: true, turnover: true, text: `${nm} backfires. INTERCEPTED.` });
        turnover(d, 100 - (startYl + 10));
        return 'change';
      }
    }

    // ----- play call -----
    const rbQ = S(o, 'RB', 'spd') * 0.5 + S(o, 'RB', 'str') * 0.5;
    let passRate = 0.47 + M(o, 'passRate') - M(o, 'runRate') + (seasonMods.passRate || 0) - (seasonMods.runRate || 0) + (qbAcc(o) - rbQ) / 300;
    if (st.down >= 3 && st.dist >= 7) passRate += 0.3;
    else if (st.down >= 2 && st.dist >= 8) passRate += 0.12;
    if (st.dist <= 2) passRate -= 0.25;
    if (lateTrail && score[d] - score[o] > 8) passRate += 0.25;
    if (st.q >= 4 && st.clock < 300 && score[o] > score[d]) passRate -= 0.25;
    passRate = clamp(passRate, 0.12, 0.92);

    let gained = 0, text = '', type = 'run', extra = {};

    if (!rng.chance(passRate)) {
      // ===== RUN =====
      const qbRun = PM(o, 'QB', 'scramble') > 0 && rng.chance(0.18);
      const cKey = qbRun ? 'QB' : 'RB';
      const c = P(o, cKey);
      const diff = runBlock(o) - runStop(d);
      const lbStr = avg(['LB1', 'LB2'].map((k) => S(d, k, 'str')));
      const lbSpd = avg(['LB1', 'LB2', 'DB3'].map((k) => S(d, k, 'spd')));
      const ypc = 3.6 + clamp(diff, -40, 40) / 14 + (S(o, cKey, 'str') - lbStr) / 40 + (S(o, cKey, 'spd') - lbSpd) / 45 + M(o, 'runYpc') + (seasonMods.runYpc || 0) + PM(o, cKey, 'ypc');
      const tflP = clamp(0.07 - diff / 400 + ['DL1', 'DL2', 'LB1', 'LB2'].reduce((s, k) => s + PM(d, k, 'tfl'), 0), 0.02, 0.22);
      if (rng.chance(tflP)) gained = -rng.int(1, 4);
      else {
        gained = Math.round(rng.normal(ypc, 2.7));
        if (gained < -2) gained = -2;
        if (gained >= 2) gained += Math.round(PM(o, cKey, 'breakTackle') * rng() * 2.2);
        const expP = 0.03 + (S(o, cKey, 'spd') - avg(['DB1', 'DB2', 'DB3'].map((k) => S(d, k, 'spd')))) / 700 + M(o, 'explosive') + (seasonMods.explosive || 0) + PM(o, cKey, 'breakaway');
        if (rng.chance(clamp(expP, 0.005, 0.2))) { gained += Math.round(8 + rng() * rng() * 50); extra.big = true; }
      }
      const tk = pickTackler(d, 'run');
      const line = statLine(o, c); line.ra++;
      type = 'run';
      extra.carrier = cKey;
      // fumble
      const ffP = 0.011 * (1 + (seasonMods.fumbleRate || 0)) * takeawayMult(d, o) * (1 - PM(o, cKey, 'secure')) * (1 + PM(d, tk, 'forceFumble'))
        * (1 + (S(d, tk, 'tgh') - S(o, cKey, 'hnd')) / 150);
      const end = st.yl + gained;
      if (end < 100 && rng.chance(clamp(ffP, 0.002, 0.06))) {
        line.ry += gained;
        statLine(d, P(d, tk)).ff++;
        statLine(d, P(d, tk)).tkl++;
        tick(rng.int(6, 12));
        push({ type: 'fumble', off: o, yl: startYl, endYl: clamp(end, 1, 99), big: true, turnover: true, carrier: cKey, text: `${lastName(c)} runs for ${gained} and FUMBLES! ${lastName(P(d, tk))} forces it, ${sides[d].short} recovers.` });
        turnover(d, 100 - clamp(end, 1, 99));
        return 'change';
      }
      if (end >= 100) {
        gained = 100 - st.yl;
        line.ry += gained; line.rtd++;
        tick(rng.int(5, 10));
        touchdown(o, `${lastName(c)} ${gained}-yard run.`, { type: 'run', yl: startYl, endYl: 100, carrier: cKey });
        return 'score';
      }
      line.ry += gained;
      if (gained <= 0 && end > 0) statLine(d, P(d, tk)).tkl++; else statLine(d, P(d, tk)).tkl++;
      text = gained > 0 ? `${lastName(c)} runs for ${gained}${extra.big ? '! Big gain' : ''}.` : gained === 0 ? `${lastName(c)} stuffed for no gain.` : `${lastName(c)} dropped for a loss of ${-gained} by ${lastName(P(d, tk))}.`;
      tick(rng.int(30, 40) + M(o, 'clockBurn'));
    } else {
      // ===== PASS =====
      const qb = P(o, 'QB');
      const qbLine = statLine(o, qb);
      let pressureP = clamp(0.28 + (passRush(d) - passPro(o)) / 120 + M(d, 'pressure') + (seasonMods.pressure || 0), 0.05, 0.65);
      const pressured = rng.chance(pressureP);
      const pocket = PM(o, 'QB', 'pocket');
      if (pressured) {
        const scr = PM(o, 'QB', 'scramble');
        if (scr && rng.chance(clamp(scr, 0, 0.8))) {
          gained = Math.round(rng.normal(5 + (S(o, 'QB', 'spd') - 55) / 8, 4));
          if (rng.chance(0.05 + M(o, 'explosive'))) { gained += rng.int(10, 40); extra.big = true; }
          qbLine.ra++;
          const end = st.yl + gained;
          if (end >= 100) {
            gained = 100 - st.yl; qbLine.ry += gained; qbLine.rtd++;
            tick(8);
            touchdown(o, `${lastName(qb)} escapes and scrambles ${gained} yards.`, { type: 'scramble', yl: startYl, endYl: 100, carrier: 'QB' });
            return 'score';
          }
          qbLine.ry += gained;
          type = 'scramble'; extra.carrier = 'QB';
          text = `${lastName(qb)} escapes pressure and scrambles for ${gained}.`;
          tick(rng.int(28, 36));
          return finishPlay(o, d, startYl, gained, type, text, extra);
        }
        const sackP = clamp(0.3 + M(d, 'sack') * 3 - pocket * 0.3 - (S(o, 'QB', 'spd') - 45) / 200, 0.08, 0.7);
        if (rng.chance(sackP)) {
          const rusher = rng.weighted(['DL1', 'DL2', 'LB1', 'LB2'], (k) => (k.startsWith('DL') ? 1.6 : 0.7) * (S(d, k, 'spd') + PM(d, k, 'rush') * 3));
          const rl = statLine(d, P(d, rusher)); rl.sk++; rl.tkl++;
          gained = -rng.int(4, 9);
          tick(rng.int(28, 36));
          if (rng.chance(0.04 + M(d, 'stripSack') * 0.4)) {
            rl.ff++;
            push({ type: 'fumble', off: o, yl: startYl, endYl: Math.max(1, startYl + gained), big: true, turnover: true, sack: true, text: `STRIP SACK by ${lastName(P(d, rusher))}! ${sides[d].short} recovers.` });
            const spot = Math.max(1, startYl + gained);
            turnover(d, 100 - spot);
            return 'change';
          }
          if (st.yl + gained <= 0) {
            score[d] += 2;
            push({ type: 'safety', off: o, yl: startYl, endYl: 0, big: true, text: `${lastName(P(d, rusher))} sacks ${lastName(qb)} in the end zone. SAFETY!` });
            // free kick
            st.off = d; st.yl = clamp(Math.round(35 + rng.normal(0, 6)), 20, 55); st.down = 1; st.dist = 10;
            push({ type: 'kickoff', off: d, yl: st.yl, endYl: st.yl, text: `Free kick. ${sides[d].short} takes over at the ${fieldText(st.yl)}.` });
            return 'change';
          }
          type = 'sack';
          text = `${lastName(qb)} SACKED by ${lastName(P(d, rusher))} for a loss of ${-gained}.`;
          extra.big = true;
          return finishPlay(o, d, startYl, gained, type, text, extra);
        }
      }

      // choose target
      const targets = ['WR1', 'WR2', 'WR3', 'TE', 'RB'].map((k) => {
        const cov = COVERAGE[k];
        const sep = route(o, k) - coverR(d, cov);
        const roleW = k.startsWith('WR') ? 1 : k === 'TE' ? 0.65 : 0.45;
        let w = Math.exp(clamp(sep, -40, 40) / 18) * roleW * (1 + PM(o, k, 'target'));
        if (st.down >= 3) w *= 1 + PM(o, k, 'thirdDown');
        return { k, cov, sep, w };
      });
      const t = rng.weighted(targets, (x) => x.w);
      const rec = P(o, t.k);
      const cov = P(d, t.cov);
      const deepP = clamp(0.16 + PM(o, 'QB', 'deep') + PM(o, t.k, 'deep') - M(d, 'oppDeep') * 0.16 + (st.dist >= 15 ? 0.1 : 0) - (t.k === 'RB' ? 0.14 : 0), 0.02, 0.6);
      const deep = rng.chance(deepP);
      const passD = avg(['DB1', 'DB2', 'DB3', 'LB1'].map((k) => S(d, k, 'iq') * 0.5 + S(d, k, 'spd') * 0.3 + S(d, k, 'hnd') * 0.2));
      let comp = 0.57 + clamp(qbAcc(o) - passD, -40, 40) / 170 + clamp(t.sep, -30, 30) / 150 + M(o, 'passComp') + (seasonMods.passComp || 0) - M(d, 'oppComp')
        - (deep ? 0.17 : 0) - (pressured ? 0.12 * (1 - pocket) : 0) + PM(o, t.k, 'catch');
      comp = clamp(comp, 0.15, 0.84);
      qbLine.pa++;
      extra.target = t.k; extra.cover = t.cov; extra.deep = deep;
      if (!rng.chance(comp)) {
        const intP = (0.06 + (S(d, t.cov, 'hnd') + S(d, t.cov, 'iq') - S(o, 'QB', 'iq') * 1.2) / 900 + PM(o, 'QB', 'intRisk') + (deep ? 0.02 : 0) + (pressured ? 0.02 : 0))
          * (1 + M(d, 'takeaway') + (seasonMods.takeaway || 0) + PM(d, t.cov, 'hawk')) * (1 - M(o, 'ballSecurity'));
        tick(rng.int(5, 8));
        if (rng.chance(clamp(intP, 0.01, 0.2))) {
          qbLine.int++;
          statLine(d, cov).dint++;
          const air = deep ? rng.int(16, 32) : rng.int(4, 12);
          const spot = clamp(startYl + air, 1, 99);
          if (rng.chance(0.05 + M(d, 'pickSix'))) {
            statLine(d, cov).dtd++;
            push({ type: 'int', off: o, yl: startYl, endYl: spot, target: t.k, cover: t.cov, deep, big: true, turnover: true, text: `${lastName(qb)} picked off by ${lastName(cov)}...` });
            st.off = d;
            touchdown(d, `${lastName(cov)} returns it all the way! Pick-six.`, { type: 'return', yl: 100 - spot, endYl: 100 });
            return 'score';
          }
          push({ type: 'int', off: o, yl: startYl, endYl: spot, target: t.k, cover: t.cov, deep, big: true, turnover: true, text: `INTERCEPTED! ${lastName(cov)} jumps the route on a pass intended for ${lastName(rec)}.` });
          turnover(d, 100 - spot);
          return 'change';
        }
        type = 'inc';
        text = `${lastName(qb)} ${deep ? 'deep ' : ''}incomplete${pressured ? ' under pressure' : ''}, intended for ${lastName(rec)}.`;
        return finishPlay(o, d, startYl, 0, type, text, extra);
      }
      // complete
      let air = deep ? 15 + rng() * 22 : 3 + rng() * 9;
      air += M(o, 'airYards') + (seasonMods.airYards || 0) + PM(o, 'QB', 'airYards') * 0.5;
      if (t.k === 'RB') air = rng() * 4 - 1;
      let yac = Math.max(0, rng.normal(2.5 + clamp(S(o, t.k, 'spd') - S(d, t.cov, 'spd'), -30, 30) / 16 + PM(o, t.k, 'yac') + M(o, 'yac'), 3));
      const expP = 0.03 + M(o, 'explosive') + (seasonMods.explosive || 0) + PM(o, t.k, 'breakaway');
      if (rng.chance(clamp(expP, 0.005, 0.2))) { yac += 8 + rng() * rng() * 45; extra.big = true; }
      gained = Math.round(air + yac);
      if (deep && gained >= 20) extra.big = true;
      extra.air = Math.round(air);
      const rl = statLine(o, rec);
      const end = st.yl + gained;
      qbLine.pc++; rl.rec++;
      if (end >= 100) {
        gained = 100 - st.yl;
        qbLine.py += gained; qbLine.ptd++; rl.recy += gained; rl.rectd++;
        extra.air = Math.min(extra.air, gained);
        tick(rng.int(6, 12));
        touchdown(o, `${lastName(qb)} finds ${lastName(rec)} for ${gained} yards.`, { type: 'pass', yl: startYl, endYl: 100, ...extra });
        return 'score';
      }
      // fumble after catch
      const tk = rng.chance(0.6) ? t.cov : pickTackler(d, 'pass');
      if (rng.chance(clamp(0.006 * takeawayMult(d, o) * (1 - PM(o, t.k, 'secure')) * (1 + PM(d, tk, 'forceFumble')) * (1 + (seasonMods.fumbleRate || 0)), 0.001, 0.04))) {
        qbLine.py += gained; rl.recy += gained;
        statLine(d, P(d, tk)).ff++;
        push({ type: 'fumble', off: o, yl: startYl, endYl: clamp(end, 1, 99), big: true, turnover: true, ...extra, text: `${lastName(rec)} catches it for ${gained} but ${lastName(P(d, tk))} punches it out! Turnover.` });
        turnover(d, 100 - clamp(end, 1, 99));
        return 'change';
      }
      statLine(d, P(d, tk)).tkl++;
      qbLine.py += gained; rl.recy += gained;
      type = 'pass';
      text = `${lastName(qb)} ${deep ? 'hits' : 'to'} ${lastName(rec)} for ${gained}${extra.big ? '! Big play' : ''}.`;
      tick(rng.int(26, 34));
    }
    return finishPlay(o, d, startYl, gained, type, text, extra);
  };

  function finishPlay(o, d, startYl, gained, type, text, extra) {
    st.yl = clamp(startYl + gained, 1, 99);
    const firstDown = gained >= st.dist;
    if (firstDown) {
      st.down = 1; st.dist = Math.min(10, 100 - st.yl);
      text += ' First down.';
    } else {
      st.down++; st.dist -= gained;
    }
    push({ type, off: o, yl: startYl, endYl: st.yl, text, ...extra });
    if (st.down > 4) {
      push({ type: 'downs', off: o, yl: st.yl, endYl: st.yl, text: `Turnover on downs.`, turnover: true });
      if (st.ot) return 'change';
      turnover(d, 100 - st.yl);
      return 'change';
    }
    return 'continue';
  }

  // ---------- regulation ----------
  const firstReceiver = rng.chance(0.5) ? 0 : 1;
  kickoff(1 - firstReceiver);
  let safety = 0;
  while (st.q <= 4 && safety++ < 400) {
    const res = runPlay();
    const endOfHalf = st.clock <= 0 && (st.q === 2 || st.q === 4);
    if (res === 'score' && !endOfHalf) kickoff(scorer);
    if (st.clock <= 0) {
      if (st.q === 2) {
        push({ type: 'quarter', off: st.off, text: 'Halftime.', marker: true, yl: st.yl, endYl: st.yl });
        st.q = 3; st.clock = QUARTER;
        kickoff(firstReceiver);
        continue;
      }
      if (st.q === 4) { break; }
      push({ type: 'quarter', off: st.off, text: `End of the ${['', '1st', '2nd', '3rd'][st.q]} quarter.`, marker: true, yl: st.yl, endYl: st.yl });
      st.q++; st.clock = QUARTER;
    }
  }

  // ---------- overtime ----------
  if (score[0] === score[1]) {
    st.ot = true;
    let first = rng.chance(0.5) ? 0 : 1;
    while (score[0] === score[1] && st.otRound < 8) {
      st.otRound++;
      push({ type: 'quarter', off: first, text: st.otRound === 1 ? 'Tied at the end of regulation. OVERTIME! Each team gets the ball at the 10.' : `Still tied. Overtime period ${st.otRound}.`, marker: true, yl: 90, endYl: 90 });
      for (const o of [first, 1 - first]) {
        st.off = o; st.yl = 90; st.down = 1; st.dist = 10;
        let guard = 0;
        while (guard++ < 30) {
          const res = runPlay();
          if (res !== 'continue') break;
        }
      }
      first = 1 - first;
    }
    if (score[0] === score[1]) { score[rng.chance(0.5) ? 0 : 1] += 2; push({ type: 'pat', off: 0, text: 'Decided by a two-point shootout.', yl: 97, endYl: 97 }); }
  }

  push({ type: 'final', off: st.off, text: `FINAL${st.ot ? ' (OT)' : ''}: ${sides[0].short} ${score[0]}, ${sides[1].short} ${score[1]}`, marker: true, yl: st.yl, endYl: st.yl });

  const winner = score[0] > score[1] ? 0 : 1;
  return { plays, score: [...score], box, winner, ot: st.ot, potg: playerOfGame(box, winner), potgBySide: [playerOfGame(box, 0), playerOfGame(box, 1)] };
}

export function fantasyPoints(l) {
  return l.py / 25 + l.ptd * 4 - l.int * 2 + l.ry / 10 + l.rtd * 6 + l.recy / 10 + l.rectd * 6 + l.rec * 0.5 + l.tkl * 1 + l.sk * 3 + l.dint * 5 + l.ff * 3 + l.dtd * 6;
}

function playerOfGame(box, side) {
  let best = null, bestPts = -1;
  for (const l of Object.values(box[side])) {
    if (l.walkon) continue;
    const pts = fantasyPoints(l);
    if (pts > bestPts) { bestPts = pts; best = l; }
  }
  return best;
}

export function statSummary(l) {
  const parts = [];
  if (l.pa) parts.push(`${l.pc}/${l.pa}, ${l.py} yds${l.ptd ? `, ${l.ptd} TD` : ''}${l.int ? `, ${l.int} INT` : ''}`);
  if (l.ra) parts.push(`${l.ra} car, ${l.ry} yds${l.rtd ? `, ${l.rtd} TD` : ''}`);
  if (l.rec) parts.push(`${l.rec} rec, ${l.recy} yds${l.rectd ? `, ${l.rectd} TD` : ''}`);
  const d = [];
  if (l.tkl) d.push(`${l.tkl} tkl`);
  if (l.sk) d.push(`${l.sk} sack${l.sk > 1 ? 's' : ''}`);
  if (l.dint) d.push(`${l.dint} INT`);
  if (l.ff) d.push(`${l.ff} FF`);
  if (l.dtd) d.push(`${l.dtd} TD`);
  if (d.length) parts.push(d.join(', '));
  return parts.join(' · ');
}
