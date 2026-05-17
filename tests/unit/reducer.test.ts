import { beforeEach, describe, expect, it } from 'vitest';
import {
  freshRoom,
  joinPlayer,
  reduce,
  setConnected,
  tick,
  type Ctx,
} from '../../src/game/reducer';
import { currentCard, type Prompt, type RoomState } from '../../src/game/types';

const PROMPTS: Prompt[] = Array.from({ length: 10 }, (_, i) => ({
  id: `p${i}`,
  left: 'Hot',
  right: 'Cold',
  category: 'X',
}));
let now = 1_000_000;
const ctx = (): Ctx => ({ prompts: PROMPTS, now });

function lobby(): RoomState {
  let s = freshRoom('TEST', 'host');
  s = joinPlayer(s, 'host', 'Host');
  s = joinPlayer(s, 'p2', 'Two');
  s = joinPlayer(s, 'p3', 'Three');
  return s;
}

/** START_GAME, then everyone submits a clue -> first card is being guessed. */
function toGuessing(): RoomState {
  let s = reduce(lobby(), 'host', { t: 'START_GAME' }, ctx());
  expect(s.phase).toBe('CLUE');
  s = reduce(s, 'host', { t: 'SUBMIT_CLUE', clue: 'a' }, ctx());
  s = reduce(s, 'p2', { t: 'SUBMIT_CLUE', clue: 'b' }, ctx());
  expect(s.phase).toBe('CLUE'); // not everyone yet
  s = reduce(s, 'p3', { t: 'SUBMIT_CLUE', clue: 'c' }, ctx());
  expect(s.phase).toBe('GUESS');
  return s;
}

/** Lock in both guessers for the current card and reveal it. */
function revealCurrent(s: RoomState, target = 50): RoomState {
  const card = currentCard(s)!;
  card.target = target;
  const guessers = ['host', 'p2', 'p3'].filter((id) => id !== card.ownerClientId);
  for (const g of guessers) s = reduce(s, g, { t: 'SET_READY', ready: true }, ctx());
  expect(s.phase).toBe('REVEAL');
  return s;
}

beforeEach(() => {
  now += 100_000;
});

describe('start of game', () => {
  it('deals one clue card per connected player and auto-sizes sets', () => {
    const s = reduce(lobby(), 'host', { t: 'START_GAME' }, ctx());
    expect(s.phase).toBe('CLUE');
    expect(s.set?.cards.map((c) => c.ownerClientId)).toEqual(['host', 'p2', 'p3']);
    expect(s.setsTarget).toBe(3); // 3 players -> small group -> 3 clues each
  });
  it('optional intro: SET_INTRO gates START into an INTRO phase, BEGIN_PLAY starts', () => {
    let s = reduce(lobby(), 'host', { t: 'SET_INTRO', on: true }, ctx());
    expect(s.intro).toBe(true);
    expect(reduce(s, 'p2', { t: 'SET_INTRO', on: false }, ctx()).intro).toBe(true); // host only
    s = reduce(s, 'host', { t: 'START_GAME' }, ctx());
    expect(s.phase).toBe('INTRO');
    expect(s.set).toBeNull();
    expect(reduce(s, 'p2', { t: 'BEGIN_PLAY' }, ctx()).phase).toBe('INTRO'); // host only
    s = reduce(s, 'host', { t: 'BEGIN_PLAY' }, ctx());
    expect(s.phase).toBe('CLUE');
    expect(s.set?.cards).toHaveLength(3);
  });

  it('rejects non-owner / too few players', () => {
    expect(reduce(lobby(), 'p2', { t: 'START_GAME' }, ctx()).phase).toBe('LOBBY');
    let solo = freshRoom('T', 'host');
    solo = joinPlayer(solo, 'host', 'Solo');
    expect(reduce(solo, 'host', { t: 'START_GAME' }, ctx()).phase).toBe('LOBBY');
  });
});

describe('simultaneous clues', () => {
  it('each player writes their own card; guessing starts when all are in', () => {
    const s = toGuessing();
    expect(s.set?.guessIndex).toBe(0);
    expect(currentCard(s)?.ownerClientId).toBe('host');
    expect(s.set?.cards.map((c) => c.clue)).toEqual(['a', 'b', 'c']);
  });
  it('the clue timer expiring forces guessing with placeholders', () => {
    let s = reduce(lobby(), 'host', { t: 'START_GAME' }, ctx());
    s = reduce(s, 'host', { t: 'SUBMIT_CLUE', clue: 'only me' }, ctx());
    now += 10 * 60 * 1000;
    s = tick(s, ctx());
    expect(s.phase).toBe('GUESS');
    expect(s.set?.cards.find((c) => c.ownerClientId === 'p2')?.clue).toBe('(out of time!)');
  });
});

describe('guessing a card', () => {
  it('only non-owners steer the dial', () => {
    let s = toGuessing(); // card owner = host
    s = reduce(s, 'p2', { t: 'DIAL_MOVE', value: 80 }, ctx());
    expect(currentCard(s)?.dial).toEqual({ value: 80, draggerId: 'p2' });
    s = reduce(s, 'host', { t: 'DIAL_MOVE', value: 5 }, ctx()); // owner blocked
    expect(currentCard(s)?.dial.value).toBe(80);
  });
  it('scores the clue-giver and cycles to the next card', () => {
    let s = toGuessing();
    s = reduce(s, 'p2', { t: 'DIAL_MOVE', value: 50 }, ctx());
    s = revealCurrent(s, 50); // bullseye for host
    expect(currentCard(s)?.result).toEqual({ clientId: 'host', delta: 0, points: 4 });
    expect(s.players.find((p) => p.clientId === 'host')!.totalScore).toBe(4);

    now += 9000;
    s = tick(s, ctx()); // REVEAL -> next card
    expect(s.phase).toBe('GUESS');
    expect(currentCard(s)?.ownerClientId).toBe('p2');
  });
  it('voids a card whose owner disconnected', () => {
    let s = toGuessing();
    s = revealCurrent(s); // card 0 (host) done
    now += 9000;
    s = tick(s, ctx()); // REVEAL due -> card 1 (p2)
    expect(s.phase).toBe('GUESS');
    expect(currentCard(s)?.ownerClientId).toBe('p2');
    s = setConnected(s, 'p2', false);
    s = tick(s, ctx());
    expect(s.phase).toBe('REVEAL');
    expect(currentCard(s)?.voided).toBe(true);
    expect(currentCard(s)?.result?.points).toBe(0);
  });
});

describe('sets & end of game', () => {
  it('after the last card the set banks and lands on the scoreboard', () => {
    let s = toGuessing();
    for (let i = 0; i < 3; i++) {
      s = revealCurrent(s);
      now += 9000;
      s = tick(s, ctx());
    }
    expect(s.phase).toBe('SCOREBOARD');
    expect(s.history).toHaveLength(3);
    expect(s.setsDone).toBe(1);
  });

  it('NEXT_ROUND (owner only) starts a new set or ends the game', () => {
    let s = toGuessing();
    s.setsTarget = 1; // shorten for the test
    for (let i = 0; i < 3; i++) {
      s = revealCurrent(s);
      now += 9000;
      s = tick(s, ctx());
    }
    expect(s.phase).toBe('SCOREBOARD');
    expect(reduce(s, 'p2', { t: 'NEXT_ROUND' }, ctx()).phase).toBe('SCOREBOARD'); // not owner
    s = reduce(s, 'host', { t: 'NEXT_ROUND' }, ctx());
    expect(s.phase).toBe('FINAL_RECAP');

    s = reduce(s, 'host', { t: 'PLAY_AGAIN' }, ctx());
    expect(s.phase).toBe('LOBBY');
    expect(s.history).toHaveLength(0);
    expect(s.players.every((p) => p.totalScore === 0)).toBe(true);
  });
});

describe('co-op mode', () => {
  it('SET_MODE is host+lobby only; moving the dial un-readies everyone', () => {
    let s = reduce(lobby(), 'host', { t: 'SET_MODE', mode: 'coop' }, ctx());
    expect(s.mode).toBe('coop');
    expect(reduce(s, 'p2', { t: 'SET_MODE', mode: 'classic' }, ctx()).mode).toBe('coop');

    s = reduce(s, 'host', { t: 'START_GAME' }, ctx());
    for (const id of ['host', 'p2', 'p3']) s = reduce(s, id, { t: 'SUBMIT_CLUE', clue: 'x' }, ctx());
    expect(s.phase).toBe('GUESS'); // card owner = host; guessers p2, p3

    s = reduce(s, 'p2', { t: 'SET_READY', ready: true }, ctx());
    expect(currentCard(s)!.ready.p2).toBe(true);
    s = reduce(s, 'p3', { t: 'DIAL_MOVE', value: 77 }, ctx());
    expect(currentCard(s)!.dial.value).toBe(77);
    expect(currentCard(s)!.ready).toEqual({}); // p2 booted from "good to go"
  });
});

describe('presence', () => {
  it('hands the crown to the most senior player when the owner leaves', () => {
    let s = setConnected(lobby(), 'host', false);
    expect(s.ownerClientId).toBe('p2');
  });
});
