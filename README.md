# PrepTactics

A high school football auto-battler in the style of Teamfight Tactics. Recruit players from a shop, set your formation, stack traits, gear up, and let the games play themselves. Finish top 4 in your region to make the state playoffs. Seniors graduate, everyone else comes back better, and winning state moves you up a classification.

Plain HTML, CSS and JavaScript modules. No build step, no dependencies.

## Play it

- **Locally:** `python3 -m http.server 8080` in this folder, then open http://localhost:8080. (Opening `index.html` straight from disk won't work because browsers block ES modules on `file://`.)
- **GitHub Pages:** Settings → Pages → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save. It goes live at `https://jlflux.github.io/preptactics/` in a minute or two, and every push updates it.

Saves go to the browser's localStorage, so each device keeps its own program.

## How a season works

| Round | What happens |
|---|---|
| Preseason Scrimmage, Jamboree | Exhibition games. Don't count. Signing Day before the first one. |
| Weeks 1–10 | 3 non-region games and 7 region games. Coaching hires before Weeks 1, 4 and 8. Signing Day before Weeks 3 and 7. |
| Playoffs | Top 4 in each of 4 regions → 16 teams. Region 1's #1 hosts Region 2's #4, and so on (AHSAA style). Signing Day before the first round. |
| Offseason | Seniors graduate. Everyone else moves up a class and gets +1 development. New schedule, region, season modifier and coaching staff. |

Region record decides standings (then head-to-head, overall record, point differential). You can drop a couple and still get in.

## Systems

**Shop and economy (TFT rules, retuned for a 16-round season).** $5 a week, plus interest ($1 per $10 saved, max $5), win/loss streak bonuses, +$1 for a win. Reroll is $2, 4 XP is $4. Program level (1–9) sets shop odds and how many players you can start (5 at level 1, all 15 at level 9). Empty spots are filled by walk-ons.

**Players.** 49 cards across 5 tiers and 8 positions. Each has an origin trait, a style trait and a signature skill. Three copies combine into ★★, three ★★ into ★★★. You can't start two copies of the same player.

**Formation and matchups.** 15 spots: QB, RB, 3 WR, TE, 2 OL on offense; 2 DL, 2 LB, 3 DB on defense. Your corners cover the opponent's left and right receivers, the nickel covers the slot, one linebacker takes the tight end and the other takes the running back. The Scout tab shows the opponent's exact lineup, their best target, and win odds from 40 quick sims of your current lineup.

**Traits.** 7 origins (Small Town, City Prep, Farm Strong, Coach's Kid, Transfer, Multi-Sport, Five-Star) and 7 styles (Air Raid, Ground & Pound, Trench, Blitz, Lockdown, Ballhawk, Playmaker). Breakpoints are set so every level can actually be fielded given the position limits.

**Gear.** 5 components (Cleats, Gloves, Film Study, Weight Room, Two-a-Days) combine into 15 finished items. Losses always pay a component; wins sometimes do.

**Coaching hires** (augments). 22 options: trait emblems, economy, stat boosts, trick plays, special teams, Youth Movement, Big Game Coach, Embrace the Grind, and more.

**Season modifiers.** One per fall: Rainy Season, Speed Kills, Recruiting Boom, Shootout Year, and others.

**RPG layer.** Starters earn XP each game and gain development levels. Player of the Game can earn a permanent perk (Clutch, Iron Will, Gamebreaker, etc.). Classes advance and seniors graduate. Prestige raises starting gold and Signing Day quality. State titles move you up from 3A toward 7A.

## The game sim

`js/engine/sim.js` simulates a full game play by play: 12-minute quarters, downs and distance, run/pass calls based on situation and scheme, pressure, sacks, scrambles, target selection by separation, completions, YAC, explosive plays, fumbles, interceptions, pick-sixes, punts, field goals, two-point tries, safeties, return touchdowns, trick plays, and Kansas-style overtime from the 10. Each team also gets a small random game-day form swing so upsets happen.

The game view (`js/ui/game.js`) animates the play list on a canvas with a following camera, scorebug, play-by-play feed, Highlights / Every play modes, 1x/2x/4x speed and skip.

## Code map

```
index.html          single page
css/style.css       all styling (dark "Friday night lights" theme, responsive down to phones)
js/main.js          app controller: screens, flow, save/load, odds sims
js/state.js         all player actions and game state (no DOM)
js/engine/
  sim.js            play-by-play simulation
  ratings.js        turns a board into effective stats, traits and modifiers
  ai.js             AI opponent lineups that scale through the season
  season.js         schedule, standings, playoffs
  economy.js        shop odds, XP, income
js/data/            cards, traits, gear, hires, modifiers, slots, names
js/ui/              hub (planning screen), game view, modals, art (SVG helmets and logos)
tools/              headless balance scripts (node)
```

## Balance tools

```
node tools/balance.mjs        # AI-vs-AI stat lines by round (scores, completion %, YPC, sacks)
node tools/curve.mjs          # win probability vs. rating gap
node tools/bot.mjs 60         # greedy bot plays 60 first seasons: playoff/title rates
node tools/multiseason.mjs    # bot plays 3 straight seasons with carryover
```

The greedy bot (no trait planning, no matchup positioning) makes the playoffs about half the time in year one and wins state rarely. A human who builds toward traits and uses the Scout tab should do noticeably better. Returning programs face AI teams that also "reloaded", so year two isn't a cakewalk.

## Art

All art is drawn in code (SVG helmets in team colors, shields, canvas field). Card portraits would be the next upgrade: write a short style guide, then generate or commission a set of player illustrations and drop them into `js/ui/art.js`.

## Ideas for next steps

- Drag and drop on desktop (tap-to-select works everywhere today)
- Sound: crowd, whistle, band
- Weekly random events (injury, academic eligibility, homecoming)
- Real 8-player lobby with friends
- Card portraits and animated tackles
