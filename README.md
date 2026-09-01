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

### Touch & Pick

A black screen. Everyone puts one finger down and gets a colored ring around
it. When nobody new has joined for a couple of seconds, the rings start
pulsing and beating out a three-beat countdown, then every ring but one
disappears. That finger goes first.

Lift your fingers and it resets for the next round.

## How it's put together

- **Splash on every launch** — a short, non-interactive animation; no tap
  needed to get past it
- **Rules on first visit only** — the "How Pickler works" screen shows once,
  then lives behind the info button on the menu
- **Landing menu** — tap a game and drop straight into it, no setup step
- **Every finger has exactly the same chance.** All randomness goes through
  `src/lib/rng.ts` so the fairness rules live in one place
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
  lib/useTouches.ts       multitouch tracking shared by every game
  lib/sound.ts            synthesized sound effects
  lib/haptics.ts          vibration (native + web fallback)
  lib/colors.ts           the ring palette
  lib/storage.ts          settings persistence
  modes/                  one component per game
  screens/                splash, rules, menu, play shell
  components/             shared UI pieces
```

Adding a game means: a new entry in `src/data/modes.ts`, a new component in
`src/modes/`, and one line in `PlayScreen.tsx`. The menu picks it up from the
registry automatically.

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
