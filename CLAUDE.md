# Frequency — contributor & agent guide

A peer-to-peer *Wavelength*-style party game. Static site (GitHub Pages), zero
backend. This file documents the non-obvious decisions so they aren't reverted.

## Run / test

```bash
npm run dev        # vite dev (also on LAN for phone testing)
npm run build      # tsc --noEmit + vite build  (must stay green)
npm test           # vitest unit suite
npm run test:e2e   # playwright; auto-starts a local PeerJS broker
```

CI = `.github/workflows/ci.yml` (build + unit + e2e), separate from
`deploy.yml` so a flaky network never blocks the Pages deploy. Keep both green.

## Architecture

- **True P2P over PeerJS.** The host's browser owns the canonical `RoomState`
  (`src/game/types.ts`) and is the only writer. Peers send intents
  (`src/net/protocol.ts`); the host runs them through one reducer
  (`src/game/reducer.ts`) and broadcasts. Net code never touches the DOM — it
  reads/writes zustand stores (`gameStore`, `netStore`).
- **Room code → peer id is deterministic:** `freqv1-<CODE>-g<generation>`
  (`src/net/roomCode.ts`). No directory service.
- **Silent host migration.** If the host drops, the most-senior connected
  player (lowest `joinedAt`) deterministically becomes host at
  `generation+1`; others reconnect up a small generation ladder
  (`src/net/migration.ts`, `src/net/net.ts`). This is intentionally **not
  explained in the UI** — it just works. Don't add UI copy for it.
- **Reconnection.** `tryConnect` recreates the Peer if it's destroyed *or*
  `disconnected` from the broker (and `peer.on('disconnected')` auto
  `reconnect()`s); a `peer-unavailable` error fails a dead generation
  *instantly* so the long per-try window (~5 s) is spent only on the live
  host finishing its WebRTC handshake. Don't shorten these blindly — a 1 s
  timeout was the "can't reconnect" bug.
- **Kick / idle-drop.** Host-only `KICK` intent removes a player and adds
  them to `RoomState.banned` (host refuses their HELLO, boots the conn).
  The host also auto-drops players gone > `IDLE_DROP_MS` (~2.5 min). A
  removed player's in-flight clue is voided by `tick` (missing owner).
  `removePlayer` reassigns the crown if needed.

## Game flow (do not reintroduce per-round psychics or options)

`LOBBY → [INTRO] → CLUE → (GUESS → REVEAL)×players → SCOREBOARD → … → FINAL_RECAP → LOBBY`

- **The whole game is dealt up front.** `START_GAME`/`BEGIN_PLAY` generates
  ALL sets at once (`makeSets`); `state.sets` + `state.setIndex`. There is
  **one** `CLUE` phase with **no timer** — every player writes *all* their
  clues (one per set) back-to-back, then waits. Guessing starts when every
  connected player has written all of theirs (`allCluesIn`). After that the
  game cycles each set's clues; `SCOREBOARD` between sets advances
  `setIndex` (it never returns to `CLUE`). Don't reintroduce a per-set clue
  phase or a clue timer.
- **The final clue has no snap reveal.** `toReveal` detects the last clue
  of the last set and jumps straight to `FINAL_RECAP` (skipping that card's
  `REVEAL` screen *and* the end `SCOREBOARD`) so the slow recap unveils the
  result with no spoiler. Earlier clues still snap-reveal normally. The
  `NEXT_ROUND → FINAL_RECAP` branch is now effectively dead (kept as a
  harmless safety) since the last set never shows a scoreboard.
- **No game options.** Length is auto-sized inversely to group size:
  `setsTargetFor()` → 3 / 2 / 1 clues per person (≤4 / ≤8 / 9+).
- **INTRO** is an optional how-to before the first set; host toggles it in
  the lobby (`intro` in `RoomState`, default off). Default off keeps
  tests/e2e flow unchanged. It and the menu's "How to play" share one
  animated component (`HowToPlay.tsx`) that demos the real `Dial` — the
  menu opens it in-app (no GitHub link). `onClose` = menu modal,
  `onDone`/`doneLabel` = intro CTA, `note` = non-host waiting line.
- **Modes** (`mode`, default `classic`):
  - `classic` = **individual guesses**: each guesser owns `card.guesses[id]`
    (their own pointer; moving un-readies just them). At reveal everyone
    scores their own band (4/3/2/0); the clue-giver earns a bonus of +2 per
    bullseye guesser and +1 per "2-point" guesser. Individual standings.
  - `coop` = one **shared** `card.dial`; moving it un-readies everyone
    (re-approve). Clue-giver scored by the shared dial; Scoreboard/Recap
    show a thick 5-tier `CoopMeter` (0..clues×4), not a ranking.
- Guess order within a set is **shuffled** each set (don't assume seniority
  order in tests — derive the owner from `currentCard`).
- Timers use absolute deadlines so they survive a host handoff.
- **Toasts**: `toast(msg, kind)` (see `useToast`) — used for errors like a
  dead room code. `<Toaster/>` renders top-right in app style.
- **No URL persistence.** The app never writes `?room=` to the URL, so a
  refresh/cold load always lands on Home (the default). Share links
  (`?room=CODE`) still pre-fill the join code — but joining is an explicit
  tap, never automatic. In-app, `PLAY_AGAIN` returns to the lobby (still
  hosting) and the menu's Leave returns Home; neither needs the URL.
  Manually rejoining a code we *hosted* (`wasHostOf`) that's now gone spins
  up a fresh waiting room instead of erroring.

## Prompts

Versioned topic packs in `public/prompts/`: `index.json` lists pack ids;
`<id>.json` is `{ name, emoji, version, prompts:[{left,right}] }`. IDs are
derived (`pack:index`) — editing is just appending a line. Host picks active
packs in the lobby (`RoomState.packs`, `SET_PACKS`; `[]` = all).

## UI conventions

- **Memphis design**, mobile-first. Shared classes in `index.css`
  (`card-pop`, `btn-*`, `chip`, `input-pop`) are theme-aware via CSS vars;
  dark mode toggles `.dark` on `<html>`. Prefer these over raw colors.
- **Icons:** use `lucide-react` for UI chrome. **Emoji are intentionally
  limited** to two places only: auto-generated player name suggestions
  (`src/lib/identity.ts`) and the bottom-of-screen reaction bar. Don't sprinkle
  decorative emoji elsewhere. Topic-pack `emoji` is pack identity (allowed).
- **Names:** `randomName()` gives a varied default (critters/snacks/
  characters, `🎈` generic fallback); Home has a shuffle button. Identity is
  the localStorage `clientId`, *not* the name — so players can rename anytime
  via the menu (`RENAME` intent, refreshes their emoji) without losing their
  slot. Cross-device "same name = same slot" is intentionally NOT done (no
  server; name-based identity would let anyone hijack a slot).
- **Scrolling:** the document never scrolls (`body{overflow:hidden}`); an
  inner container in `Stage` scrolls, so the fixed background never jumps on
  mobile. Content is vertically centred. A sticky header row holds the menu
  (left) + room-code/copy button (right) at equal height with safe-area top.
- **URL:** the app does not put room state in the URL. Default load = Home.
  A share link's `?room=CODE` only pre-fills the join code (explicit tap to
  join). See the "No URL persistence" note above.
- **Calm > busy:** few large cards per screen, minimal explanatory microcopy.
  The background drifts lazily (frozen in focused play), is laid out on a
  jittered grid (no overlaps / kind clumps), and is seeded per client
  (`freq.bgseed`) so it's stable across reloads. A blurred scrim always sits
  between background and content.
- **Reactions:** unlimited to send; the *screen* just spawns fewer copies per
  click in bigger rooms (`reactionBudget(setsTarget)` → 3/2/1).

## Deploy

Push to `main` → GitHub Actions builds and publishes to
`https://vviseguy.github.io/frequency/`. Vite `base` is `/frequency/`; routing
keys off `?room=` so deep links survive a hard refresh.
