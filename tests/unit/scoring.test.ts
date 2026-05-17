import { describe, expect, it } from 'vitest';
import { scoreFor, scoreLabel } from '../../src/game/scoring';

const bands = { bullseye: 5, close: 12, somewhat: 22 };

describe('scoreFor', () => {
  it('awards 4 for a bullseye', () => {
    expect(scoreFor(50, 50, bands)).toBe(4);
    expect(scoreFor(50, 55, bands)).toBe(4); // exactly on the edge
  });
  it('awards 3 when close', () => {
    expect(scoreFor(50, 40, bands)).toBe(3);
    expect(scoreFor(50, 62, bands)).toBe(3);
  });
  it('awards 2 when somewhat close', () => {
    expect(scoreFor(50, 30, bands)).toBe(2);
    expect(scoreFor(50, 72, bands)).toBe(2);
  });
  it('awards 0 when way off', () => {
    expect(scoreFor(50, 10, bands)).toBe(0);
    expect(scoreFor(0, 100, bands)).toBe(0);
  });
  it('is symmetric and clamps distance', () => {
    expect(scoreFor(80, 75, bands)).toBe(scoreFor(75, 80, bands));
  });
});

describe('scoreLabel', () => {
  it('maps points to a human label', () => {
    expect(scoreLabel(4)).toMatch(/BULLSEYE/i);
    expect(scoreLabel(0)).toMatch(/off/i);
  });
});
