// The shared game model. The host owns `RoomState` and broadcasts it; every
// peer renders from its last received copy.
//
// Flow: at the start of each SET, *everyone* writes a clue at the same time
// for their own hidden target. The game then cycles through each player's
// clue, the rest guessing on a shared dial. Number of sets (= clues each
// person gives) is auto-sized by group size — no options.
import type { Points } from './scoring';

export type Phase =
  | 'LOBBY'
  | 'INTRO' // optional brief how-to-play before the first set
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
  pack?: string; // pack id this prompt came from
}

export interface PackMeta {
  id: string;
  name: string;
  emoji: string;
  count: number;
  version: number;
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
  points: Points;
}

export interface GuessResult {
  clientId: string; // a guesser
  value: number;
  points: Points;
}

/** One player's clue for the current set. */
export interface ClueCard {
  ownerClientId: string;
  prompt: Prompt;
  target: number; // 0..100, secret until this card's REVEAL
  clue: string | null;
  voided: boolean;
  dial: { value: number; draggerId: string | null }; // co-op: the shared dial
  guesses: Record<string, number>; // classic: each guesser's own guess
  ready: Record<string, boolean>;
  result: RoundResult | null; // co-op: the team result for the clue-giver
  guessResults: GuessResult[] | null; // classic: per-guesser results
  ownerBonus: number; // classic: clue-giver bonus (+2 bullseye, +1 "2-pt")
}

export interface GameSet {
  index: number; // 0-based
  cards: ClueCard[]; // one per player present at game start (shuffled order)
  guessIndex: number; // which card is being guessed now
}

export interface RoomState {
  generation: number;
  code: string;
  phase: Phase;
  players: Player[]; // append-only join order = seniority
  ownerClientId: string;
  mode: 'classic' | 'coop'; // coop = one shared score, re-approve after moves
  intro: boolean; // show the brief how-to-play before the first set
  packs: string[]; // selected topic pack ids; [] means "all topics"
  setsTarget: number; // clues each person gives — auto-sized at game start
  setsDone: number;
  // ALL clues are written up front, so every set is generated at game start.
  sets: GameSet[];
  setIndex: number; // which set is currently being guessed
  history: ClueCard[]; // every completed card, for the recap
  phaseEndsAt: number | null;
  updatedAt: number;
}

export const MIN_PLAYERS = 2;

// No user options — these are fixed, tuned values.
// (Clue writing has no timer — players write all their clues up front.)
export const GUESS_SECONDS = 60;
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

// Co-op performance tiers, low -> high.
export const COOP_TIERS = [
  'Total static 📻',
  'Faint signal',
  'Tuning in',
  'On the same wave',
  'Pure telepathy ✨',
];

/** Map a team score to one of 5 tiers (0..4). */
export function coopTier(total: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(4, Math.floor((total / max) * 5)));
}

/** Points each player earned from a completed card (mode-aware). */
export function cardPointDeltas(card: ClueCard, mode: RoomState['mode']): Record<string, number> {
  const d: Record<string, number> = {};
  if (mode === 'coop') {
    if (card.result) d[card.result.clientId] = card.result.points;
    return d;
  }
  for (const r of card.guessResults ?? []) d[r.clientId] = (d[r.clientId] ?? 0) + r.points;
  if (card.ownerBonus) d[card.ownerClientId] = (d[card.ownerClientId] ?? 0) + card.ownerBonus;
  return d;
}

export function currentSet(state: RoomState): GameSet | null {
  return state.sets[state.setIndex] ?? null;
}

export function currentCard(state: RoomState): ClueCard | null {
  const s = currentSet(state);
  if (!s) return null;
  return s.cards[s.guessIndex] ?? null;
}

/** Every card belonging to a player, across all sets, set order. */
export function cardsOwnedBy(state: RoomState, clientId: string): ClueCard[] {
  return state.sets.map((s) => s.cards.find((c) => c.ownerClientId === clientId)).filter(
    (c): c is ClueCard => !!c,
  );
}

/** Clue-writing progress: how many players have submitted ALL their clues. */
export function clueProgress(state: RoomState): { done: number; total: number } {
  const connected = state.players.filter((p) => p.connected);
  const done = connected.filter(
    (p) => cardsOwnedBy(state, p.clientId).every((c) => c.clue != null),
  ).length;
  return { done, total: connected.length };
}

/** True once every connected player has written all of their clues. */
export function allCluesIn(state: RoomState): boolean {
  const { done, total } = clueProgress(state);
  return total > 0 && done === total && state.sets.length > 0;
}

/** Connected players who guess a given card (everyone but its owner). */
export function guessersFor(state: RoomState, card: ClueCard): Player[] {
  return state.players.filter((p) => p.connected && p.clientId !== card.ownerClientId);
}
