// Gear works like TFT items: components combine in pairs into finished gear.
// A player holds up to 3 pieces. Dropping a component on a player who already holds
// a loose component combines them automatically.

export const COMPONENTS = {
  cleats: { name: 'Cleats', icon: '👟', stats: { spd: 8 }, desc: '+8 Speed' },
  gloves: { name: 'Gloves', icon: '🧤', stats: { hnd: 8 }, desc: '+8 Hands' },
  film: { name: 'Film Study', icon: '📼', stats: { iq: 8 }, desc: '+8 IQ' },
  weights: { name: 'Weight Room', icon: '🏋️', stats: { str: 8 }, desc: '+8 Strength' },
  twoadays: { name: 'Two-a-Days', icon: '☀️', stats: { tgh: 8 }, desc: '+8 Toughness' },
};
export const COMPONENT_IDS = Object.keys(COMPONENTS);

// Finished gear. key = two component ids sorted alphabetically joined by '+'.
// mods are per-player modifiers (same keys as signature skills) or team auras (team*).
const G = (a, b, name, icon, stats, mods, desc) => ({ parts: [a, b].sort(), name, icon, stats, mods, desc });
const LIST = [
  G('cleats', 'cleats', 'Turf Burners', '🔥', { spd: 22 }, { breakaway: 0.04 }, '+22 Speed. Breakaway runs and catches.'),
  G('cleats', 'gloves', 'Velcro Speed', '⚡', { spd: 12, hnd: 12 }, { yac: 2 }, '+12 Speed, +12 Hands, +2 yards after catch.'),
  G('cleats', 'film', 'Jump the Route', '🎯', { spd: 12, iq: 12 }, { hawk: 0.5, cover: 4, sep: 4 }, 'Receivers get open. Defenders jump routes.'),
  G('cleats', 'weights', 'Power Step', '🦵', { spd: 12, str: 12 }, { breakTackle: 1.2, rush: 4 }, 'Breaks tackles. Faster edge rush.'),
  G('cleats', 'twoadays', 'Motor', '🔋', { spd: 12, tgh: 12 }, { clutch: 0.12 }, '+12% stats in the 4th quarter and overtime.'),
  G('gloves', 'gloves', 'Sticky Hands', '🍯', { hnd: 24 }, { catch: 0.1, hawk: 0.3 }, 'Almost never drops it.'),
  G('film', 'gloves', 'Ball Security', '🔐', { hnd: 12, iq: 12 }, { secure: 0.7 }, 'This player rarely turns it over.'),
  G('gloves', 'weights', 'Strip Artist', '🪝', { hnd: 12, str: 12 }, { forceFumble: 0.9 }, 'Rips the ball out on tackles.'),
  G('gloves', 'twoadays', 'Lockdown Sleeves', '🧷', { hnd: 12, tgh: 12 }, { cover: 6, catch: 0.05 }, 'Better coverage and contested catches.'),
  G('film', 'film', 'Playbook Mastery', '📘', { iq: 22 }, { teamIQ: 5 }, 'Whole team +5 IQ.'),
  G('film', 'weights', 'Leverage', '⚖️', { iq: 12, str: 12 }, { passPro: 6, runBlock: 6, runStop: 6 }, 'Wins at the line of scrimmage.'),
  G('film', 'twoadays', "Captain's Patch", '🎖️', { iq: 12, tgh: 12 }, { teamTGH: 5, clutch: 0.06 }, 'Whole team +5 Toughness. Clutch.'),
  G('weights', 'weights', 'Record Bench', '💪', { str: 24 }, { runBlock: 4, breakTackle: 0.6 }, '+24 Strength. Pancakes.'),
  G('twoadays', 'weights', 'Iron Man', '🛡️', { str: 12, tgh: 12 }, { secondHalf: 0.1 }, '+10% stats in the second half.'),
  G('twoadays', 'twoadays', 'Heart of a Lion', '🦁', { tgh: 24 }, { comeback: 0.12 }, '+12% stats for the whole team when trailing (max 1 per team).'),
];

export const GEAR = {};
for (const g of LIST) {
  const id = g.parts.join('+');
  GEAR[id] = { id, ...g };
}

export function combine(a, b) {
  return GEAR[[a, b].sort().join('+')];
}

export function gearInfo(id) {
  return COMPONENTS[id] ? { id, ...COMPONENTS[id], component: true } : GEAR[id];
}
