# 📡 Frequency

A peer-to-peer party game in the spirit of *Wavelength*. One player (the **Psychic**)
sees a hidden target on a spectrum between two odd extremes — "Hot ↔ Cold",
"Culturally significant ↔ insignificant" — gives a short clue, and the team drags a
**live shared dial** to guess it. Closer = more points. Psychic rotates every round.
Big celebratory finale. Then back to the lobby.

**No server. No database. No accounts. No setup.** Just open the page and play.

🎮 **Play:** https://vviseguy.github.io/frequency/

## How to play

1. One person taps **Host a new game** → gets a 4-letter room code + QR + share link.
2. Everyone else opens the link (or enters the code) on their phone.
3. The host picks rounds/timers and taps **Start**.
4. Each round: the Psychic gives a short clue → the team drags the dial → everyone
   taps **Lock it in** → the hidden target is revealed with the score.
5. After all rounds: an animated recap builds to the champion, then back to the lobby.

- **Hosting auto-falls-back:** if the host closes their tab/loses signal, the most
  *senior* player (earliest to join) seamlessly becomes the new host and the game
  continues. Keep the host on a device that won't sleep for the smoothest ride.
- **Reactions** (😂🎉🔥) pop a sound and rain that emoji across everyone's screen.

## Editing the prompts

All spectrum pairs live in [`public/prompts.json`](public/prompts.json). Edit that
file **directly on GitHub** (pencil icon → commit to `main`) and the site
auto-redeploys in ~1 minute. Each entry:

```json
{ "id": "unique-id", "left": "One extreme", "right": "Other extreme", "category": "Optional" }
```

Keep every `id` unique. That's the only rule.

## Local development

```bash
npm install
npm run dev      # http://localhost:5173/frequency/  (also exposed on your LAN for phone testing)
npm run build    # typecheck + production build into dist/
npm run preview  # serve the production build locally
```

To test multiplayer locally, open the dev URL in several browser tabs/devices —
create a room in one, join with the code in the others.

## Tests

```bash
npm test          # Vitest unit suite (scoring, reducer/state machine, rounds, room codes, migration)
npm run test:e2e  # Playwright: real multi-peer WebRTC e2e against a local PeerJS broker
```

The e2e suite spins up its own local PeerJS server (no public broker, fully
deterministic) and drives three isolated browser contexts through: a complete
2-round game (host → join → clue → guess → reveal → recap → lobby) and a
host-migration scenario (kill the host mid-lobby; assert the most-senior player
takes over and can keep running the game). CI runs both via
[`.github/workflows/ci.yml`](.github/workflows/ci.yml), separate from the Pages
deploy so a flaky network never blocks shipping.

## Networking notes (optional)

P2P uses [PeerJS](https://peerjs.com)'s free public broker for *signaling only*;
gameplay traffic is direct WebRTC between devices. Two situational env vars (create
a `.env` file) help on hostile networks:

| Var | Purpose |
|---|---|
| `VITE_TURN_URL` / `VITE_TURN_USER` / `VITE_TURN_CRED` | A TURN relay for strict/cellular NATs where direct WebRTC fails. |
| `VITE_PEER_HOST` / `VITE_PEER_PORT` / `VITE_PEER_PATH` | Point signaling at your own self-hosted PeerServer instead of the public broker. |

Neither is needed for normal play (same Wi-Fi / typical home networks).

## Deployment

Push to `main` → GitHub Actions builds and publishes to GitHub Pages
(`.github/workflows/deploy.yml`). Vite `base` is `/frequency/`; routing keys off the
`?room=` query so deep links survive a hard refresh.

Built with React + TypeScript + Vite + Tailwind + Framer Motion + PeerJS.
