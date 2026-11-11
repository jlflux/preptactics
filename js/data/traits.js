// Traits: every player card has one ORIGIN (where he comes from) and one STYLE (how he plays).
// Only starters on the field count toward a trait, and duplicate copies of the same card count once.
//
// Effect keys (read by engine/ratings.js):
//   memberStats  {stat:+n}            added to every starter who has this trait
//   memberPct    0.10                 multiply member stats by 1 + x
//   teamStats    {stat:+n}            added to every starter
//   posStats     {pos:[..], stats}    added to starters at those positions
//   mods         {key:+n}             team-level engine modifiers (see engine/sim.js)
//   gold         n                    extra gold each week

export const TRAITS = {
  // ---------- ORIGINS ----------
  smalltown: {
    name: 'Small Town', kind: 'origin', icon: '🌾',
    blurb: 'Friday night is the only thing in town. The whole team plays tougher.',
    levels: [
      { n: 2, desc: 'All starters +4 Toughness', fx: { teamStats: { tgh: 4 } } },
      { n: 4, desc: 'All starters +8 Toughness, +3 IQ', fx: { teamStats: { tgh: 8, iq: 3 } } },
      { n: 6, desc: 'All starters +14 Toughness, +6 IQ. Home games feel like a playoff crowd.', fx: { teamStats: { tgh: 14, iq: 6 }, mods: { homeBoost: 0.04 } } },
    ],
  },
  cityprep: {
    name: 'City Prep', kind: 'origin', icon: '🏙️',
    blurb: 'Seven-on-seven circuit kids. Fast and polished.',
    levels: [
      { n: 2, desc: 'City Prep players +6 Speed', fx: { memberStats: { spd: 6 } } },
      { n: 4, desc: 'City Prep players +12 Speed, +6 Hands', fx: { memberStats: { spd: 12, hnd: 6 } } },
      { n: 6, desc: 'City Prep players +18 Speed, +10 Hands, +5% explosive plays', fx: { memberStats: { spd: 18, hnd: 10 }, mods: { explosive: 0.05 } } },
    ],
  },
  farmstrong: {
    name: 'Farm Strong', kind: 'origin', icon: '🚜',
    blurb: 'Hay bales before school. Your big men get stronger.',
    levels: [
      { n: 2, desc: 'OL, DL and TE +6 Strength', fx: { posStats: { pos: ['OL', 'DL', 'TE'], stats: { str: 6 } } } },
      { n: 4, desc: 'OL, DL and TE +12 Strength; RB and LB +6 Strength', fx: { posStats: [{ pos: ['OL', 'DL', 'TE'], stats: { str: 12 } }, { pos: ['RB', 'LB'], stats: { str: 6 } }] } },
      { n: 6, desc: 'All starters +12 Strength; OL, DL and TE +20', fx: { posStats: [{ pos: ['OL', 'DL', 'TE'], stats: { str: 20 } }, { pos: ['QB', 'RB', 'WR', 'LB', 'DB'], stats: { str: 12 } }] } },
    ],
  },
  coachskid: {
    name: "Coach's Kid", kind: 'origin', icon: '📋',
    blurb: 'Grew up in the film room. Everyone plays smarter.',
    levels: [
      { n: 2, desc: 'All starters +5 IQ', fx: { teamStats: { iq: 5 } } },
      { n: 4, desc: 'All starters +11 IQ, fewer penalties and turnovers', fx: { teamStats: { iq: 11 }, mods: { ballSecurity: 0.2 } } },
    ],
  },
  transfer: {
    name: 'Transfer', kind: 'origin', icon: '🔁',
    blurb: 'Moved into the zone over the summer. Brings boosters with him.',
    levels: [
      { n: 2, desc: '+$1 every week', fx: { gold: 1 } },
      { n: 4, desc: '+$3 every week; Transfers +6 all stats', fx: { gold: 3, memberStats: { spd: 6, str: 6, hnd: 6, iq: 6, tgh: 6 } } },
    ],
  },
  multisport: {
    name: 'Multi-Sport', kind: 'origin', icon: '🏀',
    blurb: 'Point guard in the winter, shortstop in the spring. Pure athlete.',
    levels: [
      { n: 2, desc: 'Multi-Sport players +6 Speed, +6 Hands', fx: { memberStats: { spd: 6, hnd: 6 } } },
      { n: 4, desc: 'Multi-Sport players +13 Speed, +13 Hands, +6 IQ', fx: { memberStats: { spd: 13, hnd: 13, iq: 6 } } },
    ],
  },
  fivestar: {
    name: 'Five-Star', kind: 'origin', icon: '⭐',
    blurb: 'Every college in the country is at your practices.',
    levels: [
      { n: 1, desc: 'Five-Stars +10% all stats', fx: { memberPct: 0.10 } },
      { n: 2, desc: 'Five-Stars +20% all stats', fx: { memberPct: 0.20 } },
      { n: 3, desc: 'Five-Stars +32% all stats', fx: { memberPct: 0.32 } },
    ],
  },

  // ---------- STYLES ----------
  airraid: {
    name: 'Air Raid', kind: 'style', icon: '✈️',
    blurb: 'Spread it out and sling it.',
    levels: [
      { n: 2, desc: 'Pass more; completions +4%', fx: { mods: { passRate: 0.06, passComp: 0.04 } } },
      { n: 3, desc: 'Pass more; completions +7%, +1.5 air yards', fx: { mods: { passRate: 0.10, passComp: 0.07, airYards: 1.5 } } },
      { n: 5, desc: 'Pass a lot; completions +11%, +3 air yards', fx: { mods: { passRate: 0.15, passComp: 0.11, airYards: 3 } } },
    ],
  },
  groundpound: {
    name: 'Ground & Pound', kind: 'style', icon: '🦬',
    blurb: 'Three yards and a cloud of red clay.',
    levels: [
      { n: 2, desc: 'Run more; +0.7 yards per carry', fx: { mods: { runRate: 0.08, runYpc: 0.7 } } },
      { n: 4, desc: 'Run a lot; +1.6 yards per carry, fewer fumbles, burns clock', fx: { mods: { runRate: 0.15, runYpc: 1.6, ballSecurity: 0.25, clockBurn: 6 } } },
    ],
  },
  trench: {
    name: 'Trench', kind: 'style', icon: '⛏️',
    blurb: 'Games are won up front.',
    levels: [
      { n: 2, desc: 'Offensive and defensive line +7', fx: { mods: { lineO: 7, lineD: 7 } } },
      { n: 4, desc: 'Offensive and defensive line +16', fx: { mods: { lineO: 16, lineD: 16 } } },
    ],
  },
  blitz: {
    name: 'Blitz', kind: 'style', icon: '⚡',
    blurb: 'Send everybody.',
    levels: [
      { n: 2, desc: 'Pressure +6%, sacks +3%', fx: { mods: { pressure: 0.06, sack: 0.03 } } },
      { n: 4, desc: 'Pressure +13%, sacks +7%, sack-fumbles', fx: { mods: { pressure: 0.13, sack: 0.07, stripSack: 0.25 } } },
    ],
  },
  lockdown: {
    name: 'Lockdown', kind: 'style', icon: '🔒',
    blurb: 'Press man. No easy throws.',
    levels: [
      { n: 2, desc: 'Opponent completions -5%', fx: { mods: { oppComp: 0.05 } } },
      { n: 4, desc: 'Opponent completions -11%, fewer deep shots allowed', fx: { mods: { oppComp: 0.11, oppDeep: 0.3 } } },
    ],
  },
  ballhawk: {
    name: 'Ballhawk', kind: 'style', icon: '🦅',
    blurb: 'Every loose ball is ours.',
    levels: [
      { n: 2, desc: 'Takeaways +40%', fx: { mods: { takeaway: 0.4 } } },
      { n: 4, desc: 'Takeaways +100%, return touchdowns', fx: { mods: { takeaway: 1.0, pickSix: 0.18 } } },
    ],
  },
  playmaker: {
    name: 'Playmaker', kind: 'style', icon: '💫',
    blurb: 'Anyone can go the distance.',
    levels: [
      { n: 2, desc: 'Explosive plays +4%', fx: { mods: { explosive: 0.04 } } },
      { n: 4, desc: 'Explosive plays +8%, +2 yards after catch', fx: { mods: { explosive: 0.08, yac: 2 } } },
      { n: 6, desc: 'Explosive plays +13%, +4 yards after catch', fx: { mods: { explosive: 0.13, yac: 4 } } },
    ],
  },
};

export const TRAIT_ORDER = Object.keys(TRAITS);
