import { describe, expect, it } from 'vitest';
import { ladder, successorId } from '../../src/net/migration';
import { freshRoom, joinPlayer } from '../../src/game/reducer';

function room() {
  let s = freshRoom('TEST', 'host');
  s = joinPlayer(s, 'host', '🦊 Host');
  s = joinPlayer(s, 'p2', '🐙 Two');
  s = joinPlayer(s, 'p3', '🐢 Three');
  return s;
}

describe('successorId', () => {
  it('is the most-senior connected player who is not the dead host', () => {
    const s = room();
    expect(successorId(s, 'host')).toBe('p2');
  });

  it('skips disconnected players', () => {
    let s = room();
    s = { ...s, players: s.players.map((p) => (p.clientId === 'p2' ? { ...p, connected: false } : p)) };
    expect(successorId(s, 'host')).toBe('p3');
  });

  it('returns null when nobody else remains', () => {
    let s = freshRoom('TEST', 'host');
    s = joinPlayer(s, 'host', 'Solo');
    expect(successorId(s, 'host')).toBeNull();
  });

  it('every survivor computes the SAME successor (deterministic)', () => {
    const s = room();
    expect(successorId(s, 'host')).toBe(successorId(structuredClone(s), 'host'));
  });
});

describe('ladder', () => {
  it('probes the current generation first then upward', () => {
    expect(ladder(0)[0]).toBe(0);
    expect(ladder(2)).toEqual([2, 3, 4, 5, 6, 7]);
  });
});
