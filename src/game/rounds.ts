import {
  guessersFor,
  type ClueCard,
  type GameSet,
  type Prompt,
  type RoomState,
} from './types';

function pickPrompts(prompts: Prompt[], avoid: Set<string>, count: number): Prompt[] {
  const fresh = prompts.filter((p) => !avoid.has(p.id));
  const pool = (fresh.length >= count ? fresh : prompts).slice();
  // shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function makeCard(ownerClientId: string, prompt: Prompt): ClueCard {
  return {
    ownerClientId,
    prompt,
    target: 8 + Math.floor(Math.random() * 85), // 8..92, off the edges
    clue: null,
    voided: false,
    dial: { value: 50, draggerId: null },
    ready: {},
    result: null,
  };
}

/** Build a fresh set: one clue card per connected player, unique prompts. */
export function makeSet(state: RoomState, prompts: Prompt[], index: number): GameSet {
  const players = state.players
    .filter((p) => p.connected)
    .sort((a, b) => a.joinedAt - b.joinedAt);
  const recent = new Set(state.history.slice(-prompts.length).map((c) => c.prompt.id));
  const chosen = pickPrompts(prompts, recent, players.length);
  return {
    index,
    guessIndex: 0,
    cards: players.map((p, i) => makeCard(p.clientId, chosen[i])),
  };
}

export function allCluesIn(state: RoomState): boolean {
  const s = state.set;
  if (!s) return false;
  const connected = new Set(state.players.filter((p) => p.connected).map((p) => p.clientId));
  const live = s.cards.filter((c) => connected.has(c.ownerClientId));
  return live.length > 0 && live.every((c) => c.clue != null);
}

export function clueProgress(state: RoomState): { done: number; total: number } {
  const s = state.set;
  if (!s) return { done: 0, total: 0 };
  const connected = new Set(state.players.filter((p) => p.connected).map((p) => p.clientId));
  const live = s.cards.filter((c) => connected.has(c.ownerClientId));
  return { done: live.filter((c) => c.clue != null).length, total: live.length };
}

export function allReadyForCard(state: RoomState, card: ClueCard): boolean {
  const g = guessersFor(state, card);
  return g.length > 0 && g.every((p) => card.ready[p.clientId]);
}

export function readyCountFor(state: RoomState, card: ClueCard): { done: number; total: number } {
  const g = guessersFor(state, card);
  return { done: g.filter((p) => card.ready[p.clientId]).length, total: g.length };
}
