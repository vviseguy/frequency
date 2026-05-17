import { describe, expect, it } from 'vitest';
import { promptsForPacks } from '../../src/game/prompts';
import { freshRoom, joinPlayer, reduce, type Ctx } from '../../src/game/reducer';
import type { Prompt } from '../../src/game/types';

const P: Prompt[] = [
  { id: 'a:0', left: 'x', right: 'y', pack: 'a' },
  { id: 'a:1', left: 'x', right: 'y', pack: 'a' },
  { id: 'b:0', left: 'x', right: 'y', pack: 'b' },
  { id: 'c:0', left: 'x', right: 'y', pack: 'c' },
];

describe('promptsForPacks', () => {
  it('empty selection means all topics', () => {
    expect(promptsForPacks(P, [])).toHaveLength(4);
  });
  it('filters to the chosen packs', () => {
    expect(promptsForPacks(P, ['a']).map((p) => p.id)).toEqual(['a:0', 'a:1']);
    expect(promptsForPacks(P, ['b', 'c'])).toHaveLength(2);
  });
  it('falls back to all if a selection matches nothing', () => {
    expect(promptsForPacks(P, ['zzz'])).toHaveLength(4);
  });
});

describe('SET_PACKS intent', () => {
  const ctx = (): Ctx => ({ prompts: P, now: 1 });
  function room() {
    let s = freshRoom('T', 'host');
    s = joinPlayer(s, 'host', 'Host');
    s = joinPlayer(s, 'p2', 'Two');
    return s;
  }
  it('only the host can set topics, only in the lobby', () => {
    expect(reduce(room(), 'host', { t: 'SET_PACKS', packs: ['a'] }, ctx()).packs).toEqual(['a']);
    expect(reduce(room(), 'p2', { t: 'SET_PACKS', packs: ['a'] }, ctx()).packs).toEqual([]);
  });
  it('dedupes the selection', () => {
    const s = reduce(room(), 'host', { t: 'SET_PACKS', packs: ['a', 'a', 'b'] }, ctx());
    expect(s.packs).toEqual(['a', 'b']);
  });
});
