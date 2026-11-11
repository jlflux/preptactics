// Coaching hires (TFT augments), season modifiers, and name lists.

// fx keys read by state/ratings:
//   traitPlus  trait id  -> counts as +1 toward that trait (needs at least 1 starter with it)
//   gold       per-week income       goldNow  one-time gold
//   teamStats  added to all starters  tierStats {tier, stats}
//   mods       team engine mods       xp  extra XP per week
//   shopSlots  extra shop cards       freeReroll  free rerolls per week
//   components n components now       signingComponent  extra component at each Signing Day
//   walkon     walk-on stat override  classStats {classes:[..], stats}
//   lossBonus  gold on a loss         bigGame  % stats in playoffs and rivalry games
//   devMult    development multiplier
export const HIRES = {
  spreadguru: { name: 'Spread Guru', icon: '✈️', desc: 'Counts as +1 Air Raid. Completions +3%.', fx: { traitPlus: 'airraid', mods: { passComp: 0.03 } } },
  oldschool: { name: 'Old-School OC', icon: '🦬', desc: 'Counts as +1 Ground & Pound. +0.4 yards per carry.', fx: { traitPlus: 'groundpound', mods: { runYpc: 0.4 } } },
  dlinewhisperer: { name: 'O-Line Guru', icon: '⛏️', desc: 'Counts as +1 Trench. Line +4.', fx: { traitPlus: 'trench', mods: { lineO: 4, lineD: 4 } } },
  blitzhappy: { name: 'Blitz-Happy DC', icon: '⚡', desc: 'Counts as +1 Blitz. Pressure +3%.', fx: { traitPlus: 'blitz', mods: { pressure: 0.03 } } },
  cover2prof: { name: 'Cover 2 Professor', icon: '🔒', desc: 'Counts as +1 Lockdown.', fx: { traitPlus: 'lockdown', mods: { oppComp: 0.02 } } },
  turnoverchain: { name: 'Turnover Chain', icon: '🦅', desc: 'Counts as +1 Ballhawk.', fx: { traitPlus: 'ballhawk', mods: { takeaway: 0.15 } } },
  boosterclub: { name: 'Booster Club President', icon: '💰', desc: '+$3 every week.', fx: { gold: 3 } },
  tailgate: { name: 'Tailgate Fundraiser', icon: '🌭', desc: 'Get $14 right now.', fx: { goldNow: 14 } },
  recruitingcoord: { name: 'Recruiting Coordinator', icon: '📇', desc: 'Shop shows 6 players. First reroll each week is free.', fx: { shopSlots: 1, freeReroll: 1 } },
  strengthcoach: { name: 'Strength & Conditioning', icon: '🏋️', desc: 'All starters +5 Strength and +5 Toughness.', fx: { teamStats: { str: 5, tgh: 5 } } },
  speedcoach: { name: 'Speed Coach', icon: '⏱️', desc: 'All starters +6 Speed.', fx: { teamStats: { spd: 6 } } },
  filmjunkie: { name: 'Film Room Junkie', icon: '📼', desc: 'All starters +6 IQ.', fx: { teamStats: { iq: 6 } } },
  twoadayscamp: { name: 'Summer Camp', icon: '⛺', desc: '+3 Program XP every week.', fx: { xp: 3 } },
  equipmanager: { name: 'Equipment Manager', icon: '🧰', desc: '2 gear components now, plus 1 extra at every Signing Day.', fx: { components: 2, signingComponent: 1 } },
  hometownhero: { name: 'Hometown Heroes', icon: '🏡', desc: 'Your 1-cost players get +12 all stats.', fx: { tierStats: { tier: 1, stats: { spd: 12, str: 12, hnd: 12, iq: 12, tgh: 12 } } } },
  trickplays: { name: 'Trick Play Specialist', icon: '🎩', desc: 'Two trick plays per game that usually go for big yards.', fx: { mods: { trick: 2 } } },
  specialteams: { name: 'Special Teams Ace', icon: '🦶', desc: 'Better field position and longer field goals.', fx: { mods: { fieldPos: 7, kickRange: 8 } } },
  youthmovement: { name: 'Youth Movement', icon: '🌱', desc: 'Freshmen and sophomores +8 all stats. Players develop twice as fast.', fx: { classStats: { classes: [0, 1], stats: { spd: 8, str: 8, hnd: 8, iq: 8, tgh: 8 } }, devMult: 2 } },
  seniornight: { name: 'Senior Leadership', icon: '🎓', desc: 'Juniors and seniors +7 all stats.', fx: { classStats: { classes: [2, 3], stats: { spd: 7, str: 7, hnd: 7, iq: 7, tgh: 7 } } } },
  biggame: { name: 'Big Game Coach', icon: '🏆', desc: '+12% all stats in playoff and rivalry games.', fx: { bigGame: 0.12 } },
  embracethegrind: { name: 'Embrace the Grind', icon: '🔨', desc: 'Every loss pays $5 and a gear component.', fx: { lossBonus: 5 } },
  walkonprogram: { name: 'Walk-On Program', icon: '🚶', desc: 'Walk-ons are much better (50s instead of high 30s).', fx: { walkon: 50 } },
};
export const HIRE_IDS = Object.keys(HIRES);

// One per season, chosen at random. Applies to every team.
export const SEASON_MODS = [
  { id: 'normal', name: 'Classic Fall', icon: '🍂', desc: 'Nothing unusual this year.', mods: {} },
  { id: 'rain', name: 'Rainy Season', icon: '🌧️', desc: 'Wet balls: completions -6% for everyone, more fumbles.', mods: { passComp: -0.06, fumbleRate: 0.35 } },
  { id: 'speed', name: 'Speed Kills', icon: '💨', desc: 'All starters +5 Speed. Explosive plays +2%.', teamStats: { spd: 5 }, mods: { explosive: 0.02 } },
  { id: 'boom', name: 'Recruiting Boom', icon: '📈', desc: 'Rerolls cost $1.', reroll: 1, mods: {} },
  { id: 'booster', name: 'Booster Money', icon: '💵', desc: '+$1 every week.', gold: 1, mods: {} },
  { id: 'defense', name: 'Defense Wins Championships', icon: '🧱', desc: 'Pressure +4% and takeaways +25% for everyone.', mods: { pressure: 0.04, takeaway: 0.25 } },
  { id: 'shootout', name: 'Shootout Year', icon: '🎆', desc: 'Completions +4% and +1 air yard for everyone.', mods: { passComp: 0.04, airYards: 1 } },
  { id: 'oldschool', name: 'Old-School Region', icon: '📻', desc: 'Everyone runs more and gains +0.5 yards per carry.', mods: { runRate: 0.06, runYpc: 0.5 } },
];

export const CLASS_NAMES = ['FR', 'SO', 'JR', 'SR'];
export const CLASS_LONG = ['Freshman', 'Sophomore', 'Junior', 'Senior'];

export const CLASSIFICATIONS = ['1A', '2A', '3A', '4A', '5A', '6A', '7A'];

// Fictional schools.
export const SCHOOLS = [
  ['Pine Hollow', 'Panthers'], ['Red Clay', 'Rams'], ['Iron Ridge', 'Miners'], ['Copper Creek', 'Cougars'],
  ['Mill Valley', 'Mustangs'], ['Stillwater', 'Storm'], ['Harlan Crossing', 'Hawks'], ['Briar Point', 'Bulldogs'],
  ['Lake Marrow', 'Lakers'], ['Fox Run', 'Foxes'], ['Sable Hill', 'Spartans'], ['Oak Bend', 'Owls'],
  ['Grady County', 'Generals'], ['Shady Grove', 'Wildcats'], ['Cotton Gin', 'Gins'], ['Bluewater', 'Pirates'],
  ['Ashby', 'Aggies'], ['Crescent Bay', 'Sharks'], ['Willow Springs', 'Warriors'], ['Haddon', 'Hornets'],
  ['East Lowell', 'Eagles'], ['North Tallow', 'Titans'], ['Pickett', 'Patriots'], ['Gainesboro', 'Gators'],
  ['Rocky Ford', 'Rebels'], ['Summit Lake', 'Saints'], ['Thorne', 'Thunder'], ['Valley Forge', 'Vikings'],
  ['Wren County', 'Wolves'], ['Bellmont', 'Bears'], ['Cane Creek', 'Cardinals'], ['Dove Hill', 'Dragons'],
  ['Elkton', 'Elks'], ['Flint River', 'Falcons'], ['Kingsbury', 'Knights'], ['Laurel Gap', 'Lions'],
];

export const TEAM_COLORS = [
  { name: 'Crimson', main: '#b3122e', alt: '#f4f1ea' },
  { name: 'Royal', main: '#1f4fd1', alt: '#ffffff' },
  { name: 'Forest', main: '#1d6b3a', alt: '#f2d16b' },
  { name: 'Orange', main: '#e8641b', alt: '#1b1b2a' },
  { name: 'Purple', main: '#5b2ca0', alt: '#f2c94c' },
  { name: 'Navy', main: '#17264d', alt: '#c9a227' },
  { name: 'Black', main: '#18181f', alt: '#e9b949' },
  { name: 'Maroon', main: '#6d1a2b', alt: '#e8e2d0' },
  { name: 'Teal', main: '#0f7c80', alt: '#f6f2e9' },
  { name: 'Gold', main: '#c99a1a', alt: '#1a1a24' },
  { name: 'Columbia', main: '#5aa6e0', alt: '#14213d' },
  { name: 'Kelly', main: '#2f9e44', alt: '#ffffff' },
];

export const FIRST_NAMES = ['Aaron', 'Blake', 'Caleb', 'Dalton', 'Elijah', 'Gavin', 'Hayden', 'Jace', 'Kaden', 'Landon', 'Mason', 'Noah', 'Owen', 'Parker', 'Quinn', 'Reid', 'Silas', 'Tate', 'Wade', 'Xavier', 'Zane', 'Jamari', 'Kobe', 'Tavion', 'Demarcus', 'Keon', 'Marquis', 'Jalen', 'Tyrese', 'Carlos', 'Mateo', 'Bryson', 'Colby', 'Drew', 'Easton', 'Grayson', 'Holt', 'Jett', 'Knox', 'Luke'];
export const LAST_NAMES = ['Adams', 'Baker', 'Carver', 'Dixon', 'Ellis', 'Foster', 'Gibson', 'Harper', 'Ingram', 'Jackson', 'Keller', 'Lowery', 'Mabry', 'Nolan', 'Owens', 'Patton', 'Quarles', 'Riley', 'Sims', 'Thornton', 'Upton', 'Vance', 'Walker', 'Yates', 'Zeigler', 'Bell', 'Crum', 'Dorsey', 'Ferrell', 'Greer', 'Hollins', 'Jemison', 'Lackey', 'McCall', 'Nix', 'Pugh', 'Rountree', 'Stokes', 'Tubbs', 'Whatley'];

export const COACH_STYLES = ['airraid', 'groundpound', 'trench', 'blitz', 'lockdown', 'ballhawk', 'playmaker'];

// Perks players can earn by winning Player of the Game (RPG layer). One per player.
export const PERKS = {
  clutch: { name: 'Clutch', icon: '🧊', desc: '+10% stats in the 4th quarter.', mods: { clutch: 0.1 } },
  ironman: { name: 'Iron Will', icon: '🪨', desc: '+7 Toughness, +5% stats in the second half.', stats: { tgh: 7 }, mods: { secondHalf: 0.05 } },
  gamebreaker: { name: 'Gamebreaker', icon: '💥', desc: 'More breakaway plays.', mods: { breakaway: 0.025 } },
  surehands: { name: 'Sure Hands', icon: '✋', desc: '+6 Hands. Rarely drops or fumbles.', stats: { hnd: 6 }, mods: { catch: 0.04, secure: 0.3 } },
  filmrat: { name: 'Film Rat', icon: '🎞️', desc: '+8 IQ.', stats: { iq: 8 } },
  workout: { name: 'Workout Warrior', icon: '🏃', desc: '+5 Strength, +5 Speed.', stats: { str: 5, spd: 5 } },
};
export const PERK_IDS = Object.keys(PERKS);
