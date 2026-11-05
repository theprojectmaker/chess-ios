# Shipping Chess Buddy to TestFlight

Standalone Expo SDK 57 app, bundle `com.solyapps.chess`, EAS project `@solomonsasson/chess`,
App Store Connect app `6830886986`, public repo `theprojectmaker/chess-ios`.

## State
- Signing credentials and the App Store Connect app exist (created by your interactive
  build on 2026-11-04). That first TestFlight build has the old UI.
- The redesign below needs a new build to reach your phone.

## Build the current code
**Free, on GitHub.** Set the Expo token once, then run the workflow:
```bash
powershell -ExecutionPolicy Bypass -File tests/set-expo-token-chess.ps1
```
```bash
"C:/Program Files/GitHub CLI/gh.exe" workflow run ios-testflight.yml -R theprojectmaker/chess-ios -f submit=true
```
Make a token at https://expo.dev/accounts/solomonsasson/settings/access-tokens.
The runner builds the pushed commit, not local edits.

**Or on EAS cloud** (uses your Expo build quota, no token needed), from `tests/chess`:
```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

## Checks before a build
```bash
npm run test:engine
```
```bash
npx tsc --noEmit
```
```bash
node scripts/check-sdk.cjs
```

## How things are made
- `lib/engine.ts`: own 0x88 engine. `scripts/test-engine.mjs` checks it against published perft
  counts and against chess.js legal moves. chess.js stays the rules authority in the UI.
- `scripts/ladder.mjs`: plays each bot against the next level. Re-run after changing `lib/bots.ts`.
- `lib/puzzles.json`: generated, not hand-written. `scripts/gen-puzzles.mjs` finds positions in
  engine games, `scripts/merge-puzzles.mjs` re-searches each one and drops any whose solution is
  not clearly the only good move.
- `assets/sounds`: synthesized by `scripts/gen-sounds.mjs`.

## Not verified yet
- Nothing here has run on a real device. All testing was the Expo web build plus an iOS bundle
  export. Check drag feel, sound, haptics, and how long the top bots take to move on a phone. Their
  think time is capped, so a slower phone means weaker play from Vera, Ivan and Atlas, not longer waits.

## Offline
The whole app runs without internet: engine, puzzles, teachers, fonts and sounds are all bundled, and no
app code makes a network request. `updates.checkAutomatically` is `ON_ERROR_RECOVERY`, so launch never waits
on a network check. Run `npm run test:labels` after changing `lib/classify.ts`, and
`node scripts/audit-puzzles.mjs` after changing puzzles.

## Elo ratings: how far to trust them
- Player and puzzle ratings use the standard Elo formula (K 40 for the first 20 rated games, then 20, then 10 from 2000).
- Bot ratings in `lib/bots.ts` came from `scripts/calibrate.mjs` and `scripts/fit-elo.mjs`: matches against Stockfish 19 lite at
  fixed UCI_Elo settings (Stockfish was a temporary dev tool and is not in the app or repo), plus bot-vs-bot matches for bots too
  weak for Stockfish's 1320 floor. Values were then rounded by hand, and low-end gaps shrunk because self-play exaggerates them.
- Treat them as estimates. Only 16 games per pairing (about +/-100 to 175). Stockfish had 100ms a move, far below the time controls
  UCI_Elo was calibrated for, so upper ratings are probably optimistic. Bots ran at 1/12 time to imitate a phone, but no phone
  was measured. They are not FIDE or chess.com ratings, and Atlas (2400 here) is far below real Stockfish.
- Puzzle ratings are estimates from search depth, line length, piece count and a per-theme adjustment, not from real solvers.
  Few puzzles rate above 1700, so the top of the range is thin.
