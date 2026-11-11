// Formation slots. Your defenders cover the opponent's receivers by slot:
// DB1 covers WR1, DB2 covers WR2, DB3 covers WR3 (slot), LB1 covers the TE, LB2 covers the RB.
export const OFF_SLOTS = ['WR1', 'OL1', 'OL2', 'TE', 'WR3', 'WR2', 'QB', 'RB'];
export const DEF_SLOTS = ['DB1', 'DL1', 'DL2', 'LB1', 'LB2', 'DB3', 'DB2'];
export const ALL_SLOTS = [...OFF_SLOTS, ...DEF_SLOTS];

export const SLOT_POS = {
  QB: 'QB', RB: 'RB', WR1: 'WR', WR2: 'WR', WR3: 'WR', TE: 'TE', OL1: 'OL', OL2: 'OL',
  DL1: 'DL', DL2: 'DL', LB1: 'LB', LB2: 'LB', DB1: 'DB', DB2: 'DB', DB3: 'DB',
};

export const SLOT_LABEL = {
  QB: 'QB', RB: 'RB', WR1: 'WR · left', WR2: 'WR · right', WR3: 'WR · slot', TE: 'TE', OL1: 'OL', OL2: 'OL',
  DL1: 'DL', DL2: 'DL', LB1: 'LB · covers TE', LB2: 'LB · covers RB', DB1: 'CB · covers left WR', DB2: 'CB · covers right WR', DB3: 'Nickel · covers slot',
};

export const COVERAGE = { WR1: 'DB1', WR2: 'DB2', WR3: 'DB3', TE: 'LB1', RB: 'LB2' };

// Layout positions on the board, as % of the board (x across, y down).
// Defense on top facing down, line of scrimmage at 50%, offense below.
export const SLOT_XY = {
  DB1: [8, 10], DB2: [92, 10], DB3: [79, 25], LB2: [31, 26], LB1: [61, 26], DL1: [42, 42], DL2: [57, 42],
  WR1: [8, 59], OL1: [40, 59], OL2: [54, 59], TE: [68, 59], WR2: [92, 59], WR3: [80, 75], QB: [47, 76], RB: [47, 91],
};

// Max starters (non-walk-ons) by program level 1..9.
export const STARTER_CAP = [0, 5, 6, 7, 8, 9, 10, 12, 13, 15];
