import { describe, expect, it } from 'vitest';
import { genRoomCode, hostPeerId, isValidCode, normalizeCode } from '../../src/net/roomCode';

describe('room codes', () => {
  it('generates 4 unambiguous uppercase letters', () => {
    for (let i = 0; i < 200; i++) {
      const c = genRoomCode();
      expect(c).toMatch(/^[A-Z]{4}$/);
      expect(c).not.toMatch(/[IO01]/); // ambiguity-free alphabet
      expect(isValidCode(c)).toBe(true);
    }
  });

  it('normalizes messy input', () => {
    expect(normalizeCode(' ab1c-d ')).toBe('ABCD');
    expect(normalizeCode('wxyz')).toBe('WXYZ');
    expect(normalizeCode('toolongstring')).toBe('TOOL');
  });

  it('rejects invalid codes', () => {
    expect(isValidCode('ABC')).toBe(false);
    expect(isValidCode('AB1C')).toBe(false);
    expect(isValidCode('AIOU')).toBe(false); // contains ambiguous letters
  });

  it('derives a deterministic, generation-scoped host peer id', () => {
    expect(hostPeerId('WXYZ', 0)).toBe('freqv1-WXYZ-g0');
    expect(hostPeerId('wxyz', 0)).toBe('freqv1-WXYZ-g0'); // case-insensitive
    expect(hostPeerId('WXYZ', 3)).toBe('freqv1-WXYZ-g3');
    expect(hostPeerId('WXYZ', 0)).not.toBe(hostPeerId('WXYZ', 1));
  });
});
