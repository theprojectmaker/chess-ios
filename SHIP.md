# Shipping Chess Buddy to TestFlight

Chess Buddy is a standalone Expo SDK 57 app. iOS builds run **free** on a GitHub Actions
macOS runner (`eas build --local` + `eas submit`), mirroring the other apps
(see the `github-actions-ios-builds` memory). A brand-new app needs **one
interactive setup** by you before GitHub can build it.

## Already done (by Claude, 2026-11-04)
- Full app: play vs a 5-level bot ladder (Pip the Pawn → King Magnus Jr.), a 26-puzzle
  tactics practice mode, daily streak/XP tracking, game record, and a post-game review
  screen. chess.com-style board (clean unicode pieces, move/legal-move highlighting,
  check/last-move highlighting) with a Duolingo-style friendly practice UI.
- Bot engine: time-boxed iterative-deepening minimax with alpha-beta pruning,
  capture-first move ordering, and piece-square-table evaluation (`lib/bot.ts`). Each
  level gets a depth/time budget so the hardest bot never freezes the UI — verified by
  benchmarking the search against several real positions.
- All 26 puzzles are programmatically validated against chess.js (`scripts/validate-puzzles.cjs`
  — run it any time puzzles are added or edited) so every solution is a fully legal,
  correct line, not just plausible-looking.
- Verified live in the Expo web preview: played real moves against the bot (legal play,
  reasonable opening moves), solved a mate-in-1 puzzle end-to-end (solved banner, streak
  +1, XP +10, puzzle list checkmark), all persisted via AsyncStorage.
- `app.json` (bundle `com.solyapps.chess`, no bundle id collision with any other app in
  `tests/`), `eas.json`, `.github/workflows/ios-testflight.yml`, `scripts/check-sdk.cjs`.
- `npx tsc --noEmit` passes clean; `node scripts/check-sdk.cjs` confirms no cross-SDK
  `expo-*` package mismatch.
- **EAS project created**: `@solomonsasson/chess`, projectId `d45db850-2a67-4f78-81a9-62297d63861e`
  (in `app.json`). EAS Update configured (`updates.url`, `runtimeVersion` policy).
- **GitHub repo created + pushed**: PUBLIC [`theprojectmaker/chess-ios`](https://github.com/theprojectmaker/chess-ios),
  workflow file in place (not yet run — needs the token below).

## What's left — needs YOUR logins (I can't do these)
These two require your Apple ID (with 2FA) and your Expo token, which I can't enter.

### Fastest path — one interactive command does it all
From `tests/chess`, in your own terminal:
```
npx eas-cli@latest build --platform ios --profile production --auto-submit
```
Log in to Apple when prompted (2FA). This creates the signing credentials, builds
Chess Buddy in the EAS cloud, and submits it to TestFlight — creating the App Store
Connect app. After it finishes, copy the new `ascAppId` it reports into `eas.json`
(`submit.production.ios.ascAppId`, currently `REPLACE_WITH_ASC_APP_ID`), then commit + push.

### To use the FREE GitHub builds afterward
Set the Expo token secret once (run in PowerShell, paste your token):
```
powershell -ExecutionPolicy Bypass -File tests/set-expo-token-chess.ps1
```
Make a token at https://expo.dev/accounts/solomonsasson/settings/access-tokens.
After that, every build is free on GitHub:

## Every build after that
```
"C:/Program Files/GitHub CLI/gh.exe" workflow run ios-testflight.yml -R theprojectmaker/chess-ios -f submit=true
```
Push the tree before running — the runner builds the pushed commit, not local edits.

## Notes
- No accounts, no backend — fully local/offline. Progress (streak, XP, puzzles solved,
  game record) lives in AsyncStorage on-device only.
- The app icon/splash currently use the generic Expo template icon (not a custom chess
  icon) — swap `assets/images/icon.png`, `adaptive-icon.png`, `splash-icon.png`, and
  `favicon.png` for real artwork whenever you'd like; no image-generation tool was
  available in this environment to produce one.
- The bot's hardest level (King Magnus Jr.) can take up to ~3.2s to move in a busy
  middlegame — it shows "King Magnus Jr. is thinking…" while it searches. This is a
  deliberate time budget, not a bug; lower levels reply in well under a second.
