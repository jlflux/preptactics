import * as S from '../js/state.js';
import { buildSide, overall } from '../js/engine/ratings.js';
import { aiLineup } from '../js/engine/ai.js';
globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const botSrc = await import('./botlib.mjs');
const rows = {};
for (let i = 0; i < 20; i++) {
  const st = S.newGame({ name: 'Bot', mascot: 'Bots', colors: { name: 'Royal', main: '#1f4fd1', alt: '#fff' } });
  st.rngCounter = 500 + i * 31; S.startSeason(st);
  while (st.phase !== 'seasonEnd') {
    botSrc.planning(st);
    const r = st.season.round;
    const me = overall(buildSide(S.userTeam(st))).ovr;
    const ai = st.season.teams.filter((t) => !t.user && t.region === 0).map((t) => overall(buildSide(aiLineup(t, r, S.difficulty(st)))).ovr);
    rows[r] = rows[r] || { me: [], ai: [], lvl: [], st: [], gold: [] };
    rows[r].me.push(me); rows[r].ai.push(ai.reduce((a, b) => a + b) / ai.length); rows[r].lvl.push(st.level); rows[r].st.push(S.starters(st)); rows[r].gold.push(st.gold);
    S.playRound(st);
  }
}
const av = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
for (const r of Object.keys(rows)) console.log('round', r, 'bot', av(rows[r].me), 'aiAvg', av(rows[r].ai), 'lvl', av(rows[r].lvl), 'starters', av(rows[r].st), 'gold', av(rows[r].gold), 'n', rows[r].me.length);
