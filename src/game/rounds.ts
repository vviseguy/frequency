import { promptsForPacks } from './prompts';
import {
  guessersFor,
  type ClueCard,
  type GameSet,
  type Prompt,
  type RoomState,
} from './types';

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeCard(ownerClientId: string, prompt: Prompt): ClueCard {
  return {
    ownerClientId,
    prompt,
    target: 8 + Math.floor(Math.random() * 85), // 8..92, off the edges
    clue: null,
    voided: false,
    dial: { value: 50, draggerId: null },
    guesses: {},
    ready: {},
    result: null,
    guessResults: null,
    ownerBonus: 0,
  };
}

/**
 * Generate ALL sets up front (one card per connected player per set). Clues
 * are written before any guessing, so the whole game is dealt at once.
 * Prompts are unique across the entire game where possible; the guess order
 * within each set is shuffled.
 */
export function makeSets(state: RoomState, prompts: Prompt[], setCount: number): GameSet[] {
  const players = state.players.filter((p) => p.connected);
  const pool = shuffle(promptsForPacks(prompts, state.packs ?? []).slice());
  const need = players.length * setCount;
  let cursor = 0;
  const sets: GameSet[] = [];
  for (let s = 0; s < setCount; s++) {
    const order = shuffle(players.slice());
    sets.push({
      index: s,
      guessIndex: 0,
      cards: order.map((p) => {
        const prompt = pool[need <= pool.length ? cursor++ : Math.floor(Math.random() * pool.length)];
        return makeCard(p.clientId, prompt);
      }),
    });
  }
  return sets;
}

export function allReadyForCard(state: RoomState, card: ClueCard): boolean {
  const g = guessersFor(state, card);
  return g.length > 0 && g.every((p) => card.ready[p.clientId]);
}

export function readyCountFor(state: RoomState, card: ClueCard): { done: number; total: number } {
  const g = guessersFor(state, card);
  return { done: g.filter((p) => card.ready[p.clientId]).length, total: g.length };
}
