import * as S from '../js/state.js';
import { planning } from './botlib.mjs';
globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const out = [[], [], []];
for (let i = 0; i < 20; i++) {
  const st = S.newGame({ name: 'Bot', mascot: 'Bots', colors: { name: 'Royal', main: '#1f4fd1', alt: '#fff' } });
  st.rngCounter = 900 + i * 13; S.startSeason(st);
  for (let s = 0; s < 3; s++) {
    while (st.phase !== 'seasonEnd') { planning(st); S.playRound(st); }
    const sum = S.finishSeason(st);
    out[s].push(`${sum.w}-${sum.l} ${sum.result.replace('Lost in the ', '')}`);
  }
}
out.forEach((o, i) => console.log('season', i + 1, o.join(' | ')));
