// The shared game model. The host owns `RoomState` and broadcasts it; every
// peer renders from its last received copy.
//
// Flow: at the start of each SET, *everyone* writes a clue at the same time
// for their own hidden target. The game then cycles through each player's
// clue, the rest guessing on a shared dial. Number of sets (= clues each
// person gives) is auto-sized by group size — no options.

export type Phase =
  | 'LOBBY'
  | 'CLUE' // everyone writes their clue simultaneously
  | 'GUESS' // the group guesses the current player's clue
  | 'REVEAL' // target + score for the current clue
  | 'SCOREBOARD' // between sets
  | 'FINAL_RECAP';

export interface Prompt {
  id: string;
  left: string;
  right: string;
  category?: string;
}

export interface Player {
  clientId: string;
  name: string;
  color: string;
  emoji: string;
  joinedAt: number; // host monotonic counter -> seniority (lower = senior)
  connected: boolean;
  totalScore: number;
}

export interface RoundResult {
  clientId: string; // the clue-giver
  delta: number;
  points: 0 | 2 | 3 | 4;
}

/** One player's clue for the current set. */
export interface ClueCard {
  ownerClientId: string;
  prompt: Prompt;
  target: number; // 0..100, secret until this card's REVEAL
  clue: string | null;
  voided: boolean;
  dial: { value: number; draggerId: string | null };
  ready: Record<string, boolean>;
  result: RoundResult | null;
}

export interface GameSet {
  index: number; // 0-based
  cards: ClueCard[]; // one per player present at clue time, seniority order
  guessIndex: number; // which card is being guessed now
}

export interface RoomState {
  generation: number;
  code: string;
  phase: Phase;
  players: Player[]; // append-only join order = seniority
  ownerClientId: string;
  setsTarget: number; // clues each person gives — auto-sized at game start
  setsDone: number;
  set: GameSet | null;
  history: ClueCard[]; // every completed card, for the recap
  phaseEndsAt: number | null;
  updatedAt: number;
}

export const MIN_PLAYERS = 2;

// No user options — these are fixed, tuned values.
export const CLUE_SECONDS = 70; // everyone thinks at once, give them room
export const GUESS_SECONDS = 40;
export const REVEAL_MS = 6500;
export const BANDS = { bullseye: 5, close: 12, somewhat: 22 };

/** Rounds-per-person, inversely proportional to group size. */
export function setsTargetFor(connectedCount: number): number {
  if (connectedCount <= 4) return 3; // small group
  if (connectedCount <= 8) return 2; // medium group
  return 1; // very large group
}

/** Reaction allowance per guess-turn — same as clues each person gives. */
export function reactionBudget(setsTarget: number): number {
  return setsTarget;
}

export function seniorPlayer(players: Player[]): Player | undefined {
  return players.filter((p) => p.connected).sort((a, b) => a.joinedAt - b.joinedAt)[0];
}

export function playerById(state: RoomState, id: string): Player | undefined {
  return state.players.find((p) => p.clientId === id);
}

export function currentCard(state: RoomState): ClueCard | null {
  const s = state.set;
  if (!s) return null;
  return s.cards[s.guessIndex] ?? null;
}

/** Connected players who guess a given card (everyone but its owner). */
export function guessersFor(state: RoomState, card: ClueCard): Player[] {
  return state.players.filter((p) => p.connected && p.clientId !== card.ownerClientId);
}
