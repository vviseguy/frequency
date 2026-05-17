import { describe, expect, it } from 'vitest';
import { freshRoom, joinPlayer } from '../../src/game/reducer';
import { allReady, guessers, makeRound, nextPsychic } from '../../src/game/rounds';
import type { Prompt } from '../../src/game/types';

const PROMPTS: Prompt[] = [
  { id: 'a', left: 'L', right: 'R', category: 'C' },
  { id: 'b', left: 'L2', right: 'R2', category: 'C' },
];

function room() {
  let s = freshRoom('TEST', 'host');
  s = joinPlayer(s, 'host', 'Host');
  s = joinPlayer(s, 'p2', 'Two');
  s = joinPlayer(s, 'p3', 'Three');
  return s;
}

describe('nextPsychic', () => {
  it('starts with the most senior player', () => {
    expect(nextPsychic(room(), null)).toBe('host');
  });
  it('rotates round-robin by seniority', () => {
    const s = room();
    expect(nextPsychic(s, 'host')).toBe('p2');
    expect(nextPsychic(s, 'p2')).toBe('p3');
    expect(nextPsychic(s, 'p3')).toBe('host'); // wraps
  });
  it('skips disconnected players', () => {
    let s = room();
    s = { ...s, players: s.players.map((p) => (p.clientId === 'p2' ? { ...p, connected: false } : p)) };
    expect(nextPsychic(s, 'host')).toBe('p3');
  });
});

describe('makeRound', () => {
  it('keeps the target off the extreme edges and resets dial', () => {
    for (let i = 0; i < 100; i++) {
      const r = makeRound(room(), PROMPTS, 0, 'host');
      expect(r.target).toBeGreaterThanOrEqual(8);
      expect(r.target).toBeLessThanOrEqual(92);
      expect(r.dial).toEqual({ value: 50, draggerId: null });
      expect(r.voided).toBe(false);
    }
  });
});

describe('guessers / allReady', () => {
  it('guessers exclude the psychic and disconnected players', () => {
    let s = room();
    s = { ...s, round: makeRound(s, PROMPTS, 0, 'host') };
    expect(guessers(s).map((p) => p.clientId).sort()).toEqual(['p2', 'p3']);
  });
  it('allReady only when every guesser is ready', () => {
    let s = room();
    s = { ...s, round: makeRound(s, PROMPTS, 0, 'host') };
    expect(allReady(s)).toBe(false);
    s.round!.ready = { p2: true };
    expect(allReady(s)).toBe(false);
    s.round!.ready = { p2: true, p3: true };
    expect(allReady(s)).toBe(true);
  });
});
