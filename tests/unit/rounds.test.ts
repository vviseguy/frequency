import { describe, expect, it } from 'vitest';
import { freshRoom, joinPlayer } from '../../src/game/reducer';
import { allReadyForCard, makeSets } from '../../src/game/rounds';
import {
  allCluesIn,
  clueProgress,
  reactionBudget,
  setsTargetFor,
  type Prompt,
  type RoomState,
} from '../../src/game/types';

const PROMPTS: Prompt[] = Array.from({ length: 20 }, (_, i) => ({
  id: `p${i}`,
  left: `L${i}`,
  right: `R${i}`,
  category: 'C',
}));

function room(n = 3) {
  let s = freshRoom('TEST', 'host');
  s = joinPlayer(s, 'host', 'Host');
  for (let i = 2; i <= n; i++) s = joinPlayer(s, `p${i}`, `P${i}`);
  return s;
}

function dealt(n = 3, setCount = 3): RoomState {
  const s = room(n);
  return { ...s, setsTarget: setCount, sets: makeSets(s, PROMPTS, setCount), phase: 'CLUE' };
}

describe('setsTargetFor (inverse to group size)', () => {
  it('small groups get 3, medium 2, large 1', () => {
    expect(setsTargetFor(2)).toBe(3);
    expect(setsTargetFor(4)).toBe(3);
    expect(setsTargetFor(5)).toBe(2);
    expect(setsTargetFor(8)).toBe(2);
    expect(setsTargetFor(9)).toBe(1);
    expect(setsTargetFor(20)).toBe(1);
  });
  it('reaction budget matches clues-per-person', () => {
    expect(reactionBudget(setsTargetFor(3))).toBe(3);
    expect(reactionBudget(setsTargetFor(12))).toBe(1);
  });
});

describe('makeSets (whole game dealt up front)', () => {
  it('makes setCount sets, one card per player each, prompts unique', () => {
    const sets = makeSets(room(3), PROMPTS, 3);
    expect(sets).toHaveLength(3);
    for (const set of sets) {
      expect(set.cards.map((c) => c.ownerClientId).sort()).toEqual(['host', 'p2', 'p3']);
      for (const c of set.cards) {
        expect(c.target).toBeGreaterThanOrEqual(1);
        expect(c.target).toBeLessThanOrEqual(99);
        expect(c.clue).toBeNull();
      }
    }
    const allIds = sets.flatMap((s) => s.cards.map((c) => c.prompt.id));
    expect(new Set(allIds).size).toBe(allIds.length); // unique across the game
  });
});

describe('clue progress / readiness', () => {
  it('allCluesIn only once every connected player wrote ALL clues', () => {
    const s = dealt(3, 3);
    expect(allCluesIn(s)).toBe(false);
    expect(clueProgress(s)).toEqual({ done: 0, total: 3 });
    // host finishes all of theirs first
    s.sets.forEach((set) =>
      set.cards.filter((c) => c.ownerClientId === 'host').forEach((c) => (c.clue = 'x')),
    );
    expect(clueProgress(s)).toEqual({ done: 1, total: 3 });
    expect(allCluesIn(s)).toBe(false);
    s.sets.forEach((set) => set.cards.forEach((c) => (c.clue = 'x')));
    expect(allCluesIn(s)).toBe(true);
    expect(clueProgress(s)).toEqual({ done: 3, total: 3 });
  });

  it('a card is ready only when all non-owner players locked in', () => {
    const s = dealt(3, 1);
    const card = s.sets[0].cards[0];
    const guessers = ['host', 'p2', 'p3'].filter((id) => id !== card.ownerClientId);
    expect(allReadyForCard(s, card)).toBe(false);
    card.ready = { [guessers[0]]: true };
    expect(allReadyForCard(s, card)).toBe(false);
    card.ready = { [guessers[0]]: true, [guessers[1]]: true };
    expect(allReadyForCard(s, card)).toBe(true);
  });
});
