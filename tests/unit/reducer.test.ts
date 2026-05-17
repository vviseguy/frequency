import { beforeEach, describe, expect, it } from 'vitest';
import {
  freshRoom,
  joinPlayer,
  reduce,
  setConnected,
  tick,
  type Ctx,
} from '../../src/game/reducer';
import type { Prompt, RoomState } from '../../src/game/types';

const PROMPTS: Prompt[] = [{ id: 'a', left: 'Hot', right: 'Cold', category: 'X' }];
let now = 1_000_000;
const ctx = (): Ctx => ({ prompts: PROMPTS, now });

function lobby(): RoomState {
  let s = freshRoom('TEST', 'host');
  s = joinPlayer(s, 'host', 'Host');
  s = joinPlayer(s, 'p2', 'Two');
  s = joinPlayer(s, 'p3', 'Three');
  return s;
}

/** Drive from LOBBY to GUESS with the host as psychic. */
function toGuess(): RoomState {
  let s = reduce(lobby(), 'host', { t: 'START_GAME' }, ctx());
  expect(s.phase).toBe('ROUND_INTRO');
  now += 3000;
  s = tick(s, ctx());
  expect(s.phase).toBe('CLUE');
  s = reduce(s, 'host', { t: 'SUBMIT_CLUE', clue: 'warm' }, ctx());
  expect(s.phase).toBe('GUESS');
  return s;
}

beforeEach(() => {
  now += 100_000; // keep deadlines monotonic across tests
});

describe('lobby & join', () => {
  it('appends players in join order (seniority)', () => {
    const s = lobby();
    expect(s.players.map((p) => p.clientId)).toEqual(['host', 'p2', 'p3']);
    expect(s.players[0].joinedAt).toBeLessThan(s.players[2].joinedAt);
  });

  it('re-attaching a known clientId reconnects rather than duplicating', () => {
    let s = lobby();
    s = setConnected(s, 'p2', false);
    expect(s.players.find((p) => p.clientId === 'p2')!.connected).toBe(false);
    s = joinPlayer(s, 'p2', 'Two');
    expect(s.players.filter((p) => p.clientId === 'p2')).toHaveLength(1);
    expect(s.players.find((p) => p.clientId === 'p2')!.connected).toBe(true);
  });

  it('hands the crown to the most senior player when the owner leaves', () => {
    let s = lobby();
    s = setConnected(s, 'host', false);
    expect(s.ownerClientId).toBe('p2');
  });
});

describe('START_GAME guards', () => {
  it('rejects non-owners', () => {
    const s = lobby();
    expect(reduce(s, 'p2', { t: 'START_GAME' }, ctx()).phase).toBe('LOBBY');
  });
  it('requires at least 2 connected players', () => {
    let s = freshRoom('T', 'host');
    s = joinPlayer(s, 'host', 'Solo');
    expect(reduce(s, 'host', { t: 'START_GAME' }, ctx()).phase).toBe('LOBBY');
  });
  it('starts with the most senior player as psychic', () => {
    const s = reduce(lobby(), 'host', { t: 'START_GAME' }, ctx());
    expect(s.phase).toBe('ROUND_INTRO');
    expect(s.round?.psychicClientId).toBe('host');
  });
});

describe('clue & dial', () => {
  it('only the psychic can submit the clue', () => {
    let s = reduce(lobby(), 'host', { t: 'START_GAME' }, ctx());
    now += 3000;
    s = tick(s, ctx());
    const blocked = reduce(s, 'p2', { t: 'SUBMIT_CLUE', clue: 'nope' }, ctx());
    expect(blocked.phase).toBe('CLUE');
  });

  it('a guesser can grab and move the dial; the psychic cannot', () => {
    let s = toGuess();
    s = reduce(s, 'p2', { t: 'DIAL_MOVE', value: 73 }, ctx());
    expect(s.round!.dial).toEqual({ value: 73, draggerId: 'p2' });
    // psychic move is ignored
    s = reduce(s, 'host', { t: 'DIAL_MOVE', value: 5 }, ctx());
    expect(s.round!.dial.value).toBe(73);
  });

  it('a second player cannot steal the dial mid-drag', () => {
    let s = toGuess();
    s = reduce(s, 'p2', { t: 'DIAL_GRAB' }, ctx());
    s = reduce(s, 'p3', { t: 'DIAL_MOVE', value: 10 }, ctx());
    expect(s.round!.dial.draggerId).toBe('p2');
    expect(s.round!.dial.value).not.toBe(10);
  });

  it('clamps dial values to 0..100', () => {
    let s = toGuess();
    s = reduce(s, 'p2', { t: 'DIAL_MOVE', value: 999 }, ctx());
    expect(s.round!.dial.value).toBe(100);
  });
});

describe('reveal & scoring', () => {
  it('reveals and scores the psychic when all guessers lock in', () => {
    let s = toGuess();
    s.round!.target = 70;
    s = reduce(s, 'p2', { t: 'DIAL_MOVE', value: 70 }, ctx()); // bullseye
    s = reduce(s, 'p2', { t: 'SET_READY', ready: true }, ctx());
    expect(s.phase).toBe('GUESS');
    s = reduce(s, 'p3', { t: 'SET_READY', ready: true }, ctx());
    expect(s.phase).toBe('REVEAL');
    expect(s.round!.results).toEqual([{ clientId: 'host', delta: 0, points: 4 }]);
    expect(s.players.find((p) => p.clientId === 'host')!.totalScore).toBe(4);
  });

  it('voids the round if the psychic disconnects mid-round', () => {
    let s = toGuess();
    s = setConnected(s, 'host', false);
    s = tick(s, ctx());
    expect(s.phase).toBe('REVEAL');
    expect(s.round!.voided).toBe(true);
    expect(s.round!.results![0].points).toBe(0);
  });

  it('falls back to a reveal when the guess timer expires', () => {
    let s = toGuess();
    now += 10 * 60 * 1000;
    s = tick(s, ctx());
    expect(s.phase).toBe('REVEAL');
  });
});

describe('round progression', () => {
  it('rotates the psychic and ends after the configured rounds', () => {
    let s = toGuess();
    s.config.roundsTarget = 2;
    s.round!.target = 50;
    s = reduce(s, 'p2', { t: 'SET_READY', ready: true }, ctx());
    s = reduce(s, 'p3', { t: 'SET_READY', ready: true }, ctx());
    expect(s.phase).toBe('REVEAL');

    // host advances -> round 2, psychic rotates host -> p2
    s = reduce(s, 'host', { t: 'NEXT_ROUND' }, ctx());
    expect(s.phase).toBe('ROUND_INTRO');
    expect(s.history).toHaveLength(1);
    expect(s.round!.psychicClientId).toBe('p2');

    // play round 2 to completion
    now += 3000;
    s = tick(s, ctx());
    s = reduce(s, 'p2', { t: 'SUBMIT_CLUE', clue: 'go' }, ctx());
    s = reduce(s, 'host', { t: 'SET_READY', ready: true }, ctx());
    s = reduce(s, 'p3', { t: 'SET_READY', ready: true }, ctx());
    expect(s.phase).toBe('REVEAL');

    // only the owner may advance, and now the game ends
    expect(reduce(s, 'p2', { t: 'NEXT_ROUND' }, ctx()).phase).toBe('REVEAL');
    s = reduce(s, 'host', { t: 'NEXT_ROUND' }, ctx());
    expect(s.phase).toBe('FINAL_RECAP');
    expect(s.history).toHaveLength(2);
  });

  it('PLAY_AGAIN returns to a fresh lobby with scores cleared', () => {
    let s = toGuess();
    s.config.roundsTarget = 1;
    s.round!.target = 50;
    s = reduce(s, 'p2', { t: 'SET_READY', ready: true }, ctx());
    s = reduce(s, 'p3', { t: 'SET_READY', ready: true }, ctx());
    s = reduce(s, 'host', { t: 'NEXT_ROUND' }, ctx());
    expect(s.phase).toBe('FINAL_RECAP');
    s = reduce(s, 'host', { t: 'PLAY_AGAIN' }, ctx());
    expect(s.phase).toBe('LOBBY');
    expect(s.history).toHaveLength(0);
    expect(s.players.every((p) => p.totalScore === 0)).toBe(true);
  });
});
