import { describe, expect, it } from 'vitest';
import { freshRoom, joinPlayer } from '../../src/game/reducer';
import { allCluesIn, allReadyForCard, clueProgress, makeSet } from '../../src/game/rounds';
import { reactionBudget, setsTargetFor, type Prompt } from '../../src/game/types';

const PROMPTS: Prompt[] = Array.from({ length: 8 }, (_, i) => ({
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

describe('makeSet', () => {
  it('makes one unique-prompt card per connected player in seniority order', () => {
    const s = room(3);
    const set = makeSet(s, PROMPTS, 0);
    expect(set.cards.map((c) => c.ownerClientId)).toEqual(['host', 'p2', 'p3']);
    expect(new Set(set.cards.map((c) => c.prompt.id)).size).toBe(3);
    for (const c of set.cards) {
      expect(c.target).toBeGreaterThanOrEqual(8);
      expect(c.target).toBeLessThanOrEqual(92);
      expect(c.clue).toBeNull();
    }
  });
});

describe('clue progress / readiness', () => {
  it('allCluesIn only when every connected player submitted', () => {
    let s = room(3);
    s = { ...s, set: makeSet(s, PROMPTS, 0) };
    expect(allCluesIn(s)).toBe(false);
    s.set!.cards.forEach((c) => (c.clue = 'x'));
    expect(allCluesIn(s)).toBe(true);
    expect(clueProgress(s)).toEqual({ done: 3, total: 3 });
  });

  it('a card is ready only when all non-owner players locked in', () => {
    let s = room(3);
    s = { ...s, set: makeSet(s, PROMPTS, 0) };
    const card = s.set!.cards[0]; // owner = host -> guessers p2, p3
    expect(allReadyForCard(s, card)).toBe(false);
    card.ready = { p2: true };
    expect(allReadyForCard(s, card)).toBe(false);
    card.ready = { p2: true, p3: true };
    expect(allReadyForCard(s, card)).toBe(true);
  });
});
