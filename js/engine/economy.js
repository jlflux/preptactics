// Shop odds, leveling and income. Numbers are tuned for a ~16-round season.
export const SHOP_ODDS = [
  null,
  [100, 0, 0, 0, 0],
  [100, 0, 0, 0, 0],
  [75, 25, 0, 0, 0],
  [55, 30, 15, 0, 0],
  [45, 33, 20, 2, 0],
  [30, 40, 25, 5, 0],
  [19, 30, 35, 15, 1],
  [16, 22, 32, 25, 5],
  [10, 18, 25, 33, 14],
];

// XP needed to go from level L to L+1.
export const XP_NEEDED = [0, 2, 4, 6, 10, 16, 24, 32, 40, 0];
export const MAX_LEVEL = 9;
export const PASSIVE_XP = 2;
export const XP_COST = 4;
export const XP_BUY = 4;
export const REROLL_COST = 2;
export const BENCH_SIZE = 8;
export const SHOP_SIZE = 5;
export const BASE_INCOME = 5;

export function interest(gold) {
  return Math.min(5, Math.floor(gold / 10));
}

export function streakBonus(streak) {
  const n = Math.abs(streak);
  if (n >= 5) return 3;
  if (n >= 3) return 2;
  if (n >= 2) return 1;
  return 0;
}

export function sellValue(unit, tier) {
  if (unit.star === 1) return tier;
  if (unit.star === 2) return tier * 3 - 1;
  return tier * 9 - 2;
}
