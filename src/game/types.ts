// The shared game model. `RoomState` is the single source of truth the host
// owns and broadcasts; every peer renders from its last received copy.

export type Phase =
  | 'LOBBY'
  | 'ROUND_INTRO'
  | 'CLUE'
  | 'GUESS'
  | 'REVEAL'
  | 'SCOREBOARD'
  | 'FINAL_RECAP';

export interface Prompt {
  id: string;
  left: string;
  right: string;
  category?: string;
}

export interface Player {
  clientId: string; // stable id from localStorage (survives refresh/migration)
  name: string;
  color: string; // assigned Memphis pastel
  emoji: string; // little avatar
  joinedAt: number; // host's monotonic counter -> seniority (lower = more senior)
  connected: boolean;
  totalScore: number;
}

export interface RoundResult {
  clientId: string; // the psychic this round
  delta: number; // |dial - target|
  points: 0 | 2 | 3 | 4;
}

export interface Round {
  index: number; // 0-based
  psychicClientId: string;
  prompt: Prompt;
  target: number; // 0..100, secret until REVEAL
  clue: string | null;
  voided: boolean; // psychic left -> round skipped
  dial: { value: number; draggerId: string | null };
  ready: Record<string, boolean>; // clientId -> ready (non-psychics)
  results: RoundResult[] | null;
}

export interface GameConfig {
  roundsTarget: number;
  clueSeconds: number;
  guessSeconds: number;
  bands: { bullseye: number; close: number; somewhat: number }; // half-widths %
}

export interface RoomState {
  generation: number; // host-migration counter
  code: string;
  phase: Phase;
  players: Player[]; // append-only join order = seniority
  ownerClientId: string; // current host (can press START / NEXT)
  config: GameConfig;
  round: Round | null;
  history: Round[]; // completed rounds, for the final recap
  phaseEndsAt: number | null; // absolute epoch ms; drives auto-transitions
  updatedAt: number;
}

export const MIN_PLAYERS = 2;

export const DEFAULT_CONFIG: GameConfig = {
  roundsTarget: 8,
  clueSeconds: 45,
  guessSeconds: 60,
  bands: { bullseye: 5, close: 12, somewhat: 22 },
};

/** Most-senior connected player (lowest joinedAt). */
export function seniorPlayer(players: Player[]): Player | undefined {
  return players
    .filter((p) => p.connected)
    .sort((a, b) => a.joinedAt - b.joinedAt)[0];
}

export function playerById(state: RoomState, id: string): Player | undefined {
  return state.players.find((p) => p.clientId === id);
}
