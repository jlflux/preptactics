// Game day: animates the simulated play list on a canvas field with a scorebug and play-by-play.
import { shield, esc } from './art.js';

const FORMATION_OFF = { WR1: [0, 4], OL1: [0, 24], OL2: [0, 29.3], TE: [0, 34], WR3: [-1.5, 41], WR2: [0, 49.3], QB: [-5, 26.6], RB: [-8, 26.6] };
const FORMATION_DEF = { DL1: [1.2, 24], DL2: [1.2, 29.3], LB2: [5, 21], LB1: [5, 33], DB1: [7, 4], DB2: [7, 49.3], DB3: [6, 41] };
const COVER = { WR1: 'DB1', WR2: 'DB2', WR3: 'DB3', TE: 'LB1', RB: 'LB2' };
const FIELD_W = 53.3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

export function playGame(app, ug, onDone) {
  const { sim, sides } = ug;
  const root = document.createElement('div');
  root.className = 'game';
  const [H, A] = sides;
  root.innerHTML = `
  <div class="scorebug">
    <div class="sb-team home" data-i="0"><span class="stripe" style="background:${H.colors.main}"></span>${shield(H.colors, H.name, 30)}<div><div class="sbn">${esc(H.short)}</div><div class="sbr">${esc(H.mascot || '')}</div></div><span class="poss"></span><span class="sbs" id="s0">0</span></div>
    <div class="sb-mid"><span class="clk" id="clk">Q1 12:00</span><span class="dd" id="dd">Kickoff</span></div>
    <div class="sb-team away" data-i="1"><span class="stripe" style="background:${A.colors.main}"></span><span class="sbs" id="s1">0</span><span class="poss"></span><div><div class="sbn">${esc(A.short)}</div><div class="sbr">${esc(A.mascot || '')}</div></div>${shield(A.colors, A.name, 30)}</div>
  </div>
  <div class="game-main">
    <div class="field-wrap"><canvas id="field"></canvas><div class="banner" id="banner"></div></div>
    <div class="pbp"><div class="pbp-list" id="pbp"></div>
      <div class="game-controls">
        <button class="btn small" data-g="mode">Highlights</button>
        <button class="btn small" data-g="speed">Speed 1x</button>
        <button class="btn small primary" data-g="skip">Skip to final</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';

  const canvas = root.querySelector('#field');
  const ctx = canvas.getContext('2d');
  const pbp = root.querySelector('#pbp');
  const banner = root.querySelector('#banner');
  const ctl = { mode: app.prefs.gameMode || 'highlights', speed: app.prefs.gameSpeed || 1, skip: false, done: false };
  const modeBtn = root.querySelector('[data-g=mode]');
  const speedBtn = root.querySelector('[data-g=speed]');
  const syncBtns = () => {
    modeBtn.textContent = ctl.mode === 'highlights' ? 'Mode: Highlights' : 'Mode: Every play';
    speedBtn.textContent = `Speed ${ctl.speed}x`;
  };
  syncBtns();
  root.querySelector('.game-controls').addEventListener('click', (e) => {
    const b = e.target.closest('[data-g]');
    if (!b) return;
    if (b.dataset.g === 'mode') { ctl.mode = ctl.mode === 'highlights' ? 'all' : 'highlights'; app.prefs.gameMode = ctl.mode; app.savePrefs(); }
    if (b.dataset.g === 'speed') { ctl.speed = ctl.speed === 1 ? 2 : ctl.speed === 2 ? 4 : 1; app.prefs.gameSpeed = ctl.speed; app.savePrefs(); }
    if (b.dataset.g === 'skip') {
      if (ctl.done) { finish(); return; }
      ctl.skip = true;
    }
    syncBtns();
  });

  // ---------- field geometry ----------
  let W = 0, Hh = 0, V = 120, camX = 60, dpr = 1;
  const resize = () => {
    const wrap = canvas.parentElement;
    const maxW = wrap.clientWidth - 12;
    const mobile = window.matchMedia('(max-width: 1100px), (max-height: 720px)').matches;
    const maxH = mobile ? Math.round(window.innerHeight * 0.42) : (wrap.clientHeight - 12 || 9999);
    V = maxW < 640 ? 55 : 80;
    let w = maxW;
    let h = (w / V) * FIELD_W;
    if (h > maxH && maxH > 120) { h = maxH; w = (h / FIELD_W) * V; }
    W = Math.floor(w); Hh = Math.floor(h);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = Hh * dpr;
    canvas.style.width = `${W}px`; canvas.style.height = `${Hh}px`;
  };
  resize();
  const onResize = () => { resize(); draw(scene); };
  window.addEventListener('resize', onResize);

  // field x in yards: 0..120 (end zones 0-10 and 110-120). Side 0 attacks right.
  const absX = (off, yl) => (off === 0 ? 10 + yl : 110 - yl);
  const px = (x) => (x - (camX - V / 2)) * (W / V);
  const py = (y) => (y / FIELD_W) * Hh;

  function drawField(los, firstDown) {
    const s = W / V;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#1d6a34';
    ctx.fillRect(0, 0, W, Hh);
    for (let x = 10; x < 110; x += 5) {
      ctx.fillStyle = (x / 5) % 2 ? '#22773c' : '#1f6f37';
      ctx.fillRect(px(x), 0, s * 5 + 1, Hh);
    }
    // end zones
    const ez = (x0, side) => {
      ctx.fillStyle = sides[side].colors.main;
      ctx.fillRect(px(x0), 0, s * 10, Hh);
      ctx.save();
      ctx.translate(px(x0 + 5), Hh / 2);
      ctx.rotate(side === 0 ? -Math.PI / 2 : Math.PI / 2);
      ctx.fillStyle = sides[side].colors.alt;
      ctx.globalAlpha = 0.9;
      ctx.font = `${Math.max(12, s * 4.2)}px "Bebas Neue", Impact, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(sides[side].mascot || sides[side].short).toUpperCase(), 0, 0);
      ctx.restore();
    };
    ez(0, 0); // side 0 attacks right, so it defends the left end zone
    ez(110, 1);
    // yard lines
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    for (let x = 10; x <= 110; x += 5) {
      ctx.lineWidth = x === 10 || x === 110 ? 3 : (x % 10 === 0 ? 1.6 : 1);
      ctx.beginPath(); ctx.moveTo(px(x), 0); ctx.lineTo(px(x), Hh); ctx.stroke();
    }
    // hashes
    ctx.lineWidth = 1;
    for (let x = 11; x < 110; x++) {
      for (const hy of [0.6, FIELD_W * 0.36, FIELD_W * 0.64, FIELD_W - 0.6]) {
        ctx.beginPath(); ctx.moveTo(px(x), py(hy) - s * 0.35); ctx.lineTo(px(x), py(hy) + s * 0.35); ctx.stroke();
      }
    }
    // numbers
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = `${Math.max(10, s * 2.6)}px "Bebas Neue", Impact, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let x = 20; x <= 100; x += 10) {
      const n = x <= 60 ? x - 10 : 110 - x;
      ctx.fillText(String(n), px(x), py(FIELD_W * 0.15));
      ctx.fillText(String(n), px(x), py(FIELD_W * 0.85));
    }
    // LOS and first down
    if (los != null) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(80,160,255,.95)';
      ctx.beginPath(); ctx.moveTo(px(los), 0); ctx.lineTo(px(los), Hh); ctx.stroke();
    }
    if (firstDown != null && firstDown > 10 && firstDown < 110) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,214,0,.95)';
      ctx.beginPath(); ctx.moveTo(px(firstDown), 0); ctx.lineTo(px(firstDown), Hh); ctx.stroke();
    }
    // posts
    ctx.fillStyle = '#ffd400';
    for (const gx of [0.4, 119.6]) {
      ctx.fillRect(px(gx) - 2, py(FIELD_W / 2 - 3.1), 4, py(6.2));
    }
    ctx.restore();
  }

  function drawPlayer(x, y, colors, num, hl) {
    const s = W / V;
    const r = Math.max(6, s * 1.05);
    ctx.beginPath();
    ctx.arc(px(x), py(y), r, 0, Math.PI * 2);
    ctx.fillStyle = colors.main;
    ctx.fill();
    ctx.lineWidth = hl ? 3 : 2;
    ctx.strokeStyle = hl ? '#ffd34d' : colors.alt;
    ctx.stroke();
    if (r >= 8 && num) {
      ctx.fillStyle = colors.alt;
      ctx.font = `${Math.round(r * 1.05)}px "Bebas Neue", Impact, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(num), px(x), py(y) + 1);
    }
  }

  function drawBall(x, y, z = 0) {
    const s = W / V;
    const r = Math.max(4, s * 0.65);
    // shadow
    if (z > 0.2) {
      ctx.beginPath(); ctx.ellipse(px(x), py(y), r, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
    }
    const yy = py(y) - z * s * 1.4;
    ctx.beginPath();
    ctx.ellipse(px(x), yy, r * 1.3, r * 0.85, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#8a4b22'; ctx.fill();
    ctx.strokeStyle = '#f3e9d9'; ctx.lineWidth = 1.2; ctx.stroke();
  }

  // ---------- scenes ----------
  // A scene = { los, fd, actors: [{x,y,colors,num,hl}], ball: {x,y,z} }
  let scene = null;
  function draw(sc) {
    if (!sc) { drawField(null, null); return; }
    drawField(sc.los, sc.fd);
    ctx.save(); ctx.scale(dpr, dpr);
    for (const a of sc.actors) drawPlayer(a.x, a.y, a.colors, a.num, a.hl);
    if (sc.ball) drawBall(sc.ball.x, sc.ball.y, sc.ball.z || 0);
    ctx.restore();
  }

  function formation(off, yl) {
    const d = 1 - off;
    const dir = off === 0 ? 1 : -1;
    const losX = absX(off, yl);
    const actors = {};
    for (const [k, [dx, y]] of Object.entries(FORMATION_OFF)) {
      const p = sides[off].players[k];
      actors[`o${k}`] = { x: losX + (dx - 0.8) * dir, y, colors: sides[off].colors, num: p.num || '', key: k, side: off };
    }
    for (const [k, [dx, y]] of Object.entries(FORMATION_DEF)) {
      const p = sides[d].players[k];
      actors[`d${k}`] = { x: losX + dx * dir, y, colors: sides[d].colors, num: p.num || '', key: k, side: d };
    }
    return { actors, losX, dir };
  }

  function sceneAt(f, positions, ball, los, fd) {
    return { los, fd, actors: Object.values(positions), ball };
  }

  let lastOff = 0, lastYl = 25;
  function setCamera(target, instant) {
    const half = V / 2;
    const t = Math.max(half, Math.min(120 - half, target));
    camX = instant ? t : lerp(camX, t, 0.12);
  }

  async function animate(play, dur) {
    const off = play.off;
    const f = formation(off, play.yl ?? lastYl);
    const dir = f.dir;
    const losX = f.losX;
    const endX = absX(off, play.endYl ?? play.yl);
    const fdX = play.down ? absX(off, Math.min(100, (play.yl ?? 0) + (play.dist ?? 10))) : null;
    const start = {}; const end = {};
    for (const [id, a] of Object.entries(f.actors)) { start[id] = { ...a }; end[id] = { ...a }; }
    let ballPath = (t) => ({ x: start.oQB.x, y: start.oQB.y });
    const laneY = 26.6 + ((play.yl * 7 + play.endYl * 3) % 14) - 7;
    const t = play.type;
    if (t === 'run' || (t === 'td' && play.carrier) || t === 'fumble' && play.carrier) {
      const ck = `o${play.carrier || 'RB'}`;
      end[ck] = { ...end[ck], x: endX, y: laneY };
      for (const k of ['oOL1', 'oOL2', 'oTE']) end[k].x += dir * 1.5;
      for (const k of ['oWR1', 'oWR2', 'oWR3']) end[k].x += dir * 6;
      for (const [id, a] of Object.entries(end)) if (id.startsWith('d')) { a.x = lerp(a.x, endX + dir * 0.8, 0.8); a.y = lerp(a.y, laneY, 0.65); }
      ballPath = (tt) => ({ x: lerp(start[ck].x, end[ck].x, ease(tt)), y: lerp(start[ck].y, end[ck].y, ease(tt)) });
      // carrier takes a handoff
      const rbStart = { ...start[ck] };
      const qb = start.oQB;
      ballPath = (tt) => {
        if (tt < 0.12) return { x: lerp(qb.x, rbStart.x, tt / 0.12), y: lerp(qb.y, rbStart.y, tt / 0.12) };
        const k = (tt - 0.12) / 0.88;
        return { x: lerp(rbStart.x, end[ck].x, ease(k)), y: lerp(rbStart.y, end[ck].y, ease(k)) };
      };
      start[ck].hl = end[ck].hl = true;
      start[ck]._lag = 0.12;
    } else if (t === 'scramble' || t === 'sack' || (t === 'td' && play.carrier === 'QB')) {
      end.oQB = { ...end.oQB, x: endX, y: t === 'sack' ? end.oQB.y : laneY };
      for (const [id, a] of Object.entries(end)) if (id.startsWith('dDL') || id.startsWith('dLB')) { a.x = lerp(a.x, endX, 0.9); a.y = lerp(a.y, end.oQB.y, 0.7); }
      for (const k of ['oWR1', 'oWR2', 'oWR3', 'oTE']) end[k].x += dir * 9;
      ballPath = (tt) => ({ x: lerp(start.oQB.x, end.oQB.x, ease(tt)), y: lerp(start.oQB.y, end.oQB.y, ease(tt)) });
      start.oQB.hl = end.oQB.hl = true;
    } else if (t === 'pass' || t === 'inc' || t === 'int' || (t === 'td' && play.target) || (t === 'fumble' && play.target)) {
      const rk = `o${play.target || 'WR1'}`;
      const ck = `d${play.cover || COVER[play.target] || 'DB1'}`;
      const air = play.air ?? Math.max(2, (play.endYl - play.yl) * 0.6);
      const catchX = losX + dir * Math.max(1, air);
      const catchY = Math.max(3, Math.min(FIELD_W - 3, start[rk].y + (start[rk].y < FIELD_W / 2 ? 4 : -4)));
      const mid = { x: catchX, y: catchY };
      end.oQB.x -= dir * 2.5;
      for (const k of ['oOL1', 'oOL2']) end[k].x -= dir * 1;
      for (const k of ['oWR1', 'oWR2', 'oWR3', 'oTE']) if (k !== rk) end[k].x += dir * 10;
      const finalX = t === 'pass' || t === 'td' || t === 'fumble' ? endX : catchX;
      const recPath = (tt) => {
        if (tt < 0.6) return { x: lerp(start[rk].x, mid.x, ease(tt / 0.6)), y: lerp(start[rk].y, mid.y, ease(tt / 0.6)) };
        const k = (tt - 0.6) / 0.4;
        return { x: lerp(mid.x, finalX, ease(k)), y: lerp(mid.y, mid.y + (laneY - mid.y) * 0.3, ease(k)) };
      };
      start[rk].path = recPath; start[rk].hl = true;
      // coverage defender trails the receiver
      start[ck].path = (tt) => {
        const r = recPath(Math.max(0, tt - 0.05));
        if (t === 'int' && tt > 0.6) {
          const k = (tt - 0.6) / 0.4;
          const back = mid.x - dir * 8;
          return { x: lerp(mid.x + dir * 0.5, back, ease(k)), y: mid.y };
        }
        return { x: r.x + dir * 1.2, y: r.y + 1 };
      };
      if (t === 'int') start[ck].hl = true;
      for (const [id, a] of Object.entries(end)) if (id.startsWith('d') && id !== ck) { a.x = lerp(a.x, (t === 'inc' ? catchX : finalX) + dir, 0.55); a.y = lerp(a.y, catchY, 0.4); }
      ballPath = (tt) => {
        if (tt < 0.3) return { x: start.oQB.x - dir * 2.5 * (tt / 0.3), y: start.oQB.y };
        if (tt < 0.6) {
          const k = (tt - 0.3) / 0.3;
          const fromX = start.oQB.x - dir * 2.5;
          return { x: lerp(fromX, mid.x, k), y: lerp(start.oQB.y, mid.y, k), z: Math.sin(Math.PI * k) * (1.5 + air / 8) };
        }
        if (t === 'inc') { const k = (tt - 0.6) / 0.4; return { x: mid.x + dir * 3 * k, y: mid.y + 2 * k, z: Math.max(0, 1 - k * 2) }; }
        if (t === 'int') return start[ck].path(tt);
        return recPath(tt);
      };
    } else if (t === 'punt' || t === 'fg' || t === 'pat' || t === 'kickoff' || t === 'return' || t === 'trick' || t === 'downs' || t === 'safety') {
      // simple ball flight
      const fromX = t === 'kickoff' ? endX : losX - dir * (t === 'punt' ? 12 : 7);
      const toX = t === 'fg' || t === 'pat' ? (off === 0 ? 119.5 : 0.5) : endX;
      for (const [id, a] of Object.entries(end)) a.x += dir * (t === 'punt' || t === 'return' ? 18 : 2);
      ballPath = (tt) => ({ x: lerp(fromX, toX, ease(tt)), y: lerp(FIELD_W / 2, FIELD_W / 2 + (t === 'fg' && play.miss ? 5 : 0), tt), z: t === 'kickoff' ? 0 : Math.sin(Math.PI * tt) * (t === 'punt' ? 8 : 5) });
      if (t === 'trick' || t === 'return') {
        const ck = t === 'return' ? 'dDB1' : 'oWR1';
        start[ck].path = (tt) => ({ x: lerp(start[ck].x, endX, ease(tt)), y: lerp(start[ck].y, FIELD_W / 2, tt) });
        start[ck].hl = true;
        ballPath = start[ck].path;
      }
    }

    const fd = fdX;
    const t0 = performance.now();
    setCamera(losX, Math.abs(camX - losX) > V * 0.6);
    await new Promise((resolve) => {
      const frame = (now) => {
        if (ctl.skip) { resolve(); return; }
        const tt = Math.min(1, (now - t0) / dur);
        const pos = {};
        for (const id of Object.keys(start)) {
          const s0 = start[id];
          let p;
          if (s0.path) p = s0.path(tt);
          else {
            const lag = s0._lag || 0;
            const k = tt < lag ? 0 : ease((tt - lag) / (1 - lag));
            p = { x: lerp(s0.x, end[id].x, k), y: lerp(s0.y, end[id].y, k) };
          }
          pos[id] = { ...s0, ...p };
        }
        const b = ballPath(tt);
        setCamera(b.x, false);
        scene = { los: losX, fd, actors: Object.values(pos), ball: b };
        draw(scene);
        if (tt < 1) requestAnimationFrame(frame); else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  function showFormation(off, yl, down, dist) {
    const f = formation(off, yl);
    const fdX = down ? absX(off, Math.min(100, yl + dist)) : null;
    setCamera(f.losX, true);
    scene = { los: f.losX, fd: fdX, actors: Object.values(f.actors), ball: { x: f.losX - f.dir * 0.4, y: 26.6 } };
    draw(scene);
  }

  // ---------- feed + scorebug ----------
  const s0 = root.querySelector('#s0'), s1 = root.querySelector('#s1');
  const clk = root.querySelector('#clk'), dd = root.querySelector('#dd');
  const teamEls = root.querySelectorAll('.sb-team');
  const ord = (n) => ['', '1st', '2nd', '3rd', '4th'][n] || `${n}th`;
  const spot = (yl) => (yl === 50 ? '50' : yl < 50 ? `OWN ${yl}` : `OPP ${100 - yl}`);

  function updateBug(play, next) {
    s0.textContent = play.score[0];
    s1.textContent = play.score[1];
    clk.textContent = play.clock;
    const n = next && !next.marker && next.down && ['run', 'pass', 'inc', 'sack', 'scramble', 'td', 'int', 'fumble', 'downs', 'fg', 'punt', 'trick'].includes(next.type) ? next : null;
    dd.textContent = n ? `${ord(n.down)} & ${n.yl + n.dist >= 100 ? 'Goal' : n.dist} · ${spot(n.yl)}` : (play.type === 'final' ? 'FINAL' : '');
    const possession = n ? n.off : play.off;
    teamEls.forEach((el, i) => el.classList.toggle('has-ball', i === possession && play.type !== 'final'));
  }

  function feed(play) {
    const el = document.createElement('div');
    const cls = play.marker ? 'marker' : play.td || play.type === 'fg' && !play.miss || play.type === 'safety' ? 'score' : play.turnover ? 'to' : play.big ? 'big' : '';
    el.className = `pbp-item ${cls}`;
    el.innerHTML = play.marker ? esc(play.text) : `<span class="pt">${esc(play.clock)} · ${esc(sides[play.off]?.short || '')}</span>${esc(play.text)}`;
    pbp.prepend(el);
    while (pbp.children.length > 160) pbp.removeChild(pbp.lastChild);
  }

  async function flash(text, color) {
    banner.textContent = text;
    banner.style.background = color;
    banner.classList.add('show');
    await sleep(900 / ctl.speed);
    banner.classList.remove('show');
  }

  const SCRIM = new Set(['run', 'pass', 'inc', 'sack', 'scramble', 'int', 'fumble', 'td', 'trick', 'return']);
  const isHighlight = (p) => p.td || p.turnover || p.big || p.type === 'fg' || p.type === 'safety' || p.type === 'return' || p.type === 'trick';

  // ---------- main loop ----------
  async function run() {
    const plays = sim.plays;
    showFormation(0, 25);
    await sleep(300);
    for (let i = 0; i < plays.length; i++) {
      const play = plays[i];
      const next = plays[i + 1];
      if (ctl.skip) { feed(play); updateBug(play, next); continue; }
      const animateIt = !play.marker && play.type !== 'kickoff' && play.type !== 'pat' && (ctl.mode === 'all' ? true : isHighlight(play));
      if (animateIt) {
        if (SCRIM.has(play.type) || play.type === 'fg' || play.type === 'punt') {
          showFormation(play.off, play.yl, play.down, play.dist);
          await sleep((ctl.mode === 'all' ? 250 : 450) / ctl.speed);
        }
        const dur = (isHighlight(play) ? 1500 : 800) / ctl.speed;
        await animate(play, dur);
        feed(play);
        updateBug(play, next);
        if (play.td && !ctl.skip) await flash('TOUCHDOWN', sides[play.off].colors.main);
        else if (play.type === 'int' && !ctl.skip) await flash('INTERCEPTED', sides[1 - play.off].colors.main);
        else if (play.type === 'fumble' && !ctl.skip) await flash('FUMBLE', sides[1 - play.off].colors.main);
        else if (play.type === 'fg' && !play.miss && !ctl.skip) await flash('FIELD GOAL', sides[play.off].colors.main);
        else if (play.type === 'safety' && !ctl.skip) await flash('SAFETY', sides[1 - play.off].colors.main);
        else await sleep(250 / ctl.speed);
      } else {
        feed(play);
        updateBug(play, next);
        if (play.marker && play.type !== 'final') await sleep(500 / ctl.speed);
        else await sleep((ctl.mode === 'all' ? 60 : 35) / ctl.speed);
      }
      if (play.yl != null && !play.marker) { lastOff = play.off; lastYl = play.endYl ?? play.yl; }
    }
    ctl.done = true;
    const last = plays[plays.length - 1];
    updateBug(last, null);
    const userWon = sim.winner === ug.userIdx;
    banner.textContent = userWon ? 'VICTORY' : 'FINAL';
    banner.style.background = userWon ? '#1f9d55' : '#333a4d';
    banner.classList.add('show');
    const skipBtn = root.querySelector('[data-g=skip]');
    skipBtn.textContent = 'Continue →';
  }

  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    window.removeEventListener('resize', onResize);
    root.remove();
    document.body.style.overflow = '';
    onDone();
  }

  run();
}
