# Pickler — by MyCrew

Somebody has to go first. Somebody has to say the prayer. Everybody puts a
finger on the screen, the phone picks one, and nobody gets to argue with a
phone. Built with React + TypeScript + Vite, wrapped for iOS/Android with
[Capacitor](https://capacitorjs.com/).

## Where it runs

The web build is published free on GitHub Pages:

```
https://evenstephen85.github.io/Pickler/
```

The same code is set up to be wrapped as real native iOS and Android apps —
see [Native builds](#native-builds-ios--android) below.

## Games

Five ways to pick, all from the same black screen: everyone puts a finger
down, the field settles, and the app decides. Lift your fingers to go again.

| Game | What happens |
| --- | --- |
| **Touch & Pick** | The rings pulse out a three-beat countdown, then the pick is revealed. |
| **Short Straw** | Everyone draws a straw from the bundle in the middle; they come out in fits and starts, and the short one is the pick. |
| **Spinner** | A needle sweeps out from the middle, slows like a roulette wheel, and stops on someone. |
| **Hot Potato** | A glowing potato flies finger to finger, faster and faster, until it stops on one. |
| **Bumper Rings** | After a 3-2-1, your ring stays on your finger and you drive it — slide into someone and you might knock them out, or might not. |
| **Corner Bounce** | After a 3-2-1, everyone's logo takes off around the walls like the old DVD screensaver — hands off, and first to nail a corner is the pick. |
| **Dice Roll** | A die tumbles out of every finger. Highest roll goes first. |
| **Keno Board** | Claim a number on a 40-number board, then watch a highlight run over the grid and stop on the one that's drawn. |

**Keno Board is the one game you don't hold a finger down for**: you tap your
number and take your hand back, the way you'd mark a keno card, and tap it
again to give it up. That's why it drives the draw off its own claims
(`lib/useDraw.ts`) rather than through the held-finger round engine. The board
is 4 numbers across on a portrait phone and the usual 10 across on a wide
screen.

Several games do something extra when the outcome is **teams**: Spinner sends
out one needle per member of the smaller team, Hot Potato flies one potato per
team in that team's color, Short Straw re-ties the straws into one knot per
team, and Corner Bounce sends each team to its own corner — two teams take
opposite corners, so it reads as a side of the screen each.

**Bumper Rings on a desktop** has nothing to drive with: a held key has a
fixed spot on screen, so nobody could ever reach anybody. When every player is
on a key the rings drive themselves instead, drifting and bouncing off the
walls.

## What a round hands back

A switch on the menu decides what you get out of a round — every game honors
all three:

- **Pick one** — one finger, everybody else's ring disappears
- **Turn order** — every ring is numbered 1st, 2nd, 3rd… for board game turn order
- **Split teams** — the fingers are dealt into 2–4 teams and recolored

**Lifting a finger never costs you your place.** While players are still
gathering, a finger that comes off keeps its spot for a moment and a finger
that comes straight back down nearby is treated as the same player — real
hands on real glass flicker, and every one of those used to restart the "has
everybody joined" wait. Once a round is under way a lift doesn't remove
anybody at all: the ring simply stays where the finger last was.

**A result stays on screen until somebody taps "Go again."** Lifting your
fingers doesn't clear it — the field is snapshotted the moment the result
lands, so everyone can take their hands away and still read the turn order.

## Playing on a computer

A desktop browser only ever has one pointer, so there's nothing to pick
between. On anything that isn't a touchscreen, **everybody holds down their
own key instead** — one key each, held down, exactly like a finger. Let go to
drop out. The on-screen prompt switches to match.

Each ring shows the key that's holding it, and the rings are laid out in
roughly the **same arrangement as the keys on the keyboard** — the people on
Q, W and E get three rings across the top, in that order — so nobody has to
remember which color they are. See `src/lib/keyboard.ts`.

## Fairness

Every game draws its result up front, uniformly, with a Fisher-Yates shuffle
in `src/lib/rng.ts` — and then animates *towards* that result. The spinner's
needle is aimed at its target from the first frame; Short Straw assigns the
straw lengths from the draw rather than measuring them off the screen; Dice
Roll hands out the faces by place, so there is never a tie at the top; Corner
Bounce plans genuine constant-speed flights whose corners simply arrive in
draw order (see `src/lib/dvd.ts`).

This matters most in Bumper Rings, where deciding each crash on the spot would
**not** be fair: a player who charges around meets more rings than one who
sits still, so hustle would leak into the odds. (Eliminating both rings in a
collision only trades one bias for another.) Instead a crash that lands knocks
out whichever of the two rings the draw already placed lower — the driving and
the crashing are real, the result underneath them is even.

Verified empirically as well as by construction: over 600,000 six-player
rounds, the who-wins distribution gives χ² = 1.13 on 5 degrees of freedom
(p < 0.05 would need 11.07), and no player-by-position cell deviates from
expectation by more than 0.83%.

## How it's put together

- **Splash on every launch** — a short, non-interactive animation; no tap
  needed to get past it
- **Rules on first visit only** — the "How Pickler works" screen shows once,
  then lives behind the info button on the menu
- **Landing menu** — tap a game and drop straight into it, no setup step
- **Neutral wording** — "You're up" reads the same whether the pick is a prize
  or a chore
- **Sounds are synthesized in-browser** with the Web Audio API
  (`src/lib/sound.ts`) — no audio files to ship, and a single sound toggle on
  the menu
- **Haptics** go through `src/lib/haptics.ts`, which uses Capacitor's Haptics
  plugin in a native build and `navigator.vibrate` on the web. Note that
  **iOS Safari has no web vibration API at all** — on an iPhone playing the
  hosted site, the sounds and the on-screen pulse carry the alert. That gap
  closes in the native build
- **No emoji icons** — small inline SVGs in `src/components/icons.tsx`
- Respects `prefers-reduced-motion`

## Project layout

```
src/
  data/modes.ts           the game registry: name, tagline, rules text
  lib/rng.ts              all randomness (fairness lives here)
  lib/usePlayers.ts       player tracking — fingers and held keyboard keys
  lib/keyboard.ts         where each key sits, for the desktop layout
  lib/dvd.ts              the bouncing maths behind Corner Bounce
  lib/useSettle.ts        the "wait until nobody else is joining" timer
  lib/useDraw.ts          the draw itself: ranking, phase, frozen result
  lib/useRound.ts         useDraw + held fingers, for the games that use them
  lib/outcome.ts          pick one / turn order / teams
  lib/reveal.ts           turns a ranking into what each ring looks like
  lib/sound.ts            synthesized sound effects
  lib/haptics.ts          vibration (native + web fallback)
  lib/colors.ts           the ring palette
  lib/storage.ts          settings persistence
  modes/                  one component per game
  screens/                splash, rules, menu, play shell
  components/             shared UI pieces
```

**Every game does one job: produce a ranking.** `useDraw` holds the draw and
the phase; `useRound` adds held-finger collection on top of it for the games
that work that way (Keno brings its own); the game animates the result; `reveal.ts` turns that one list into a single pick, a turn order,
or teams. So a new game never reimplements input, fairness, or any of the
three outcomes.

Adding one means: an entry in `src/data/modes.ts`, a component in
`src/modes/`, and a line in the `MODE_COMPONENTS` map in `PlayScreen.tsx`.
The menu picks it up from the registry automatically.

## Local development

```bash
npm install
npm run dev
npm run lint
```

Multitouch needs real fingers, so test on a phone: `npm run dev -- --host`
and open the printed network address on a device on the same wifi.

## Deploying the website (GitHub Pages)

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every
push to `main`. No pull request needed — pushing to `main` publishes.

One-time setup: in the repo's **Settings → Pages**, set "Source" to
**GitHub Actions**.

The production build uses the repo name as its base path (`vite.config.ts`).
If you ever rename the repo, update `repoBase` there to match.

## Native builds (iOS / Android)

The Capacitor config is in place but the native platform projects have not
been generated yet — they're one command each, whenever you want them:

```bash
npx cap add ios
npx cap add android
```

After that:

```bash
npm run cap:sync      # build with root-relative paths, copy into the native projects
npm run cap:android   # ...and open Android Studio
npm run cap:ios       # ...and open Xcode (Mac only)
```

Native builds need a **root-relative** asset path, unlike the GitHub Pages
build which lives under a subpath — that's what the `:native` scripts and the
`CAP_BUILD` switch in `vite.config.ts` handle.

### Before you publish to a store

- **Bundle ID**: `capacitor.config.ts` uses `com.mycrew.pickler`. It can't be
  changed after publishing to either store, so set it before you ship.
- **App icon / splash art**: not yet drawn — `public/favicon.svg` is a
  placeholder. Generate the native assets with
  [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets) once
  the real artwork exists.
