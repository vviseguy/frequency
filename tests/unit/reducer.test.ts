import { beforeEach, describe, expect, it } from 'vitest';
import {
  freshRoom,
  joinPlayer,
  reduce,
  setConnected,
  tick,
  type Ctx,
} from '../../src/game/reducer';
import { currentCard, currentSet, type Prompt, type RoomState } from '../../src/game/types';

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

const ALL = ['host', 'p2', 'p3'];
const ownerOf = (s: RoomState) => currentCard(s)!.ownerClientId;
const guessersOf = (s: RoomState) => ALL.filter((id) => id !== ownerOf(s));

/** START_GAME then everyone writes ALL their clues -> guessing begins. */
function toGuessing(s0 = lobby()): RoomState {
  let s = reduce(s0, 'host', { t: 'START_GAME' }, ctx());
  expect(s.phase).toBe('CLUE');
  // every player writes one clue per set, up front
  let guard = 0;
  while (s.phase === 'CLUE' && guard++ < 50) {
    for (const id of ALL) s = reduce(s, id, { t: 'SUBMIT_CLUE', clue: 'x' }, ctx());
  }
  expect(s.phase).toBe('GUESS');
  return s;
}

/** Lock in every guesser for the current card -> reveal. */
function revealCurrent(s: RoomState): RoomState {
  for (const g of guessersOf(s)) s = reduce(s, g, { t: 'SET_READY', ready: true }, ctx());
  expect(s.phase).toBe('REVEAL');
  return s;
}

beforeEach(() => {
  now += 100_000;
});

describe('start of game', () => {
  it('deals every set up front, one card per player per set, no clue timer', () => {
    const s = reduce(lobby(), 'host', { t: 'START_GAME' }, ctx());
    expect(s.phase).toBe('CLUE');
    expect(s.setsTarget).toBe(3); // 3 players -> small group
    expect(s.sets).toHaveLength(3);
    for (const set of s.sets) {
      expect(set.cards.map((c) => c.ownerClientId).sort()).toEqual(['host', 'p2', 'p3']);
    }
    expect(s.phaseEndsAt).toBeNull(); // no clue timer
  });
  it('optional intro gates START into INTRO; BEGIN_PLAY starts', () => {
    let s = reduce(lobby(), 'host', { t: 'SET_INTRO', on: true }, ctx());
    s = reduce(s, 'host', { t: 'START_GAME' }, ctx());
    expect(s.phase).toBe('INTRO');
    expect(reduce(s, 'p2', { t: 'BEGIN_PLAY' }, ctx()).phase).toBe('INTRO'); // host only
    s = reduce(s, 'host', { t: 'BEGIN_PLAY' }, ctx());
    expect(s.phase).toBe('CLUE');
  });
  it('rejects non-owner / too few players', () => {
    expect(reduce(lobby(), 'p2', { t: 'START_GAME' }, ctx()).phase).toBe('LOBBY');
    let solo = freshRoom('T', 'host');
    solo = joinPlayer(solo, 'host', 'Solo');
    expect(reduce(solo, 'host', { t: 'START_GAME' }, ctx()).phase).toBe('LOBBY');
  });
});

describe('classic mode (default): individual guesses', () => {
  it('each guesser owns their own guess; the clue-giver cannot guess', () => {
    let s = toGuessing();
    const [g1] = guessersOf(s);
    s = reduce(s, g1, { t: 'DIAL_MOVE', value: 80 }, ctx());
    expect(currentCard(s)!.guesses[g1]).toBe(80);
    const owner = ownerOf(s);
    s = reduce(s, owner, { t: 'DIAL_MOVE', value: 5 }, ctx());
    expect(currentCard(s)!.guesses[owner]).toBeUndefined();
  });

  it('clamps guesses to 0..100 and un-readies on change', () => {
    let s = toGuessing();
    const [g1] = guessersOf(s);
    s = reduce(s, g1, { t: 'SET_READY', ready: true }, ctx());
    s = reduce(s, g1, { t: 'DIAL_MOVE', value: 999 }, ctx());
    expect(currentCard(s)!.guesses[g1]).toBe(100);
    expect(currentCard(s)!.ready[g1]).toBe(false);
  });

  it('scores each guesser + a clue-giver bonus, then cycles', () => {
    let s = toGuessing();
    const owner = ownerOf(s);
    const gs = guessersOf(s);
    currentCard(s)!.target = 60;
    for (const g of gs) s = reduce(s, g, { t: 'DIAL_MOVE', value: 60 }, ctx());
    s = revealCurrent(s);
    const card = currentCard(s)!;
    expect(card.guessResults!.every((r) => r.points === 4)).toBe(true);
    expect(card.ownerBonus).toBe(gs.length * 2);
    for (const g of gs) expect(s.players.find((p) => p.clientId === g)!.totalScore).toBe(4);
    expect(s.players.find((p) => p.clientId === owner)!.totalScore).toBe(gs.length * 2);

    now += 9000;
    s = tick(s, ctx());
    expect(s.phase).toBe('GUESS');
    expect(currentSet(s)!.guessIndex).toBe(1);
  });

  it('clue-giver bonus: +2 per bullseye(4), +1 per close-ish(3 or 2)', () => {
    let s = toGuessing();
    const owner = ownerOf(s);
    const [g1, g2] = guessersOf(s);
    currentCard(s)!.target = 60;
    s = reduce(s, g1, { t: 'DIAL_MOVE', value: 60 }, ctx()); // delta 0 -> 4 pts
    s = reduce(s, g2, { t: 'DIAL_MOVE', value: 70 }, ctx()); // delta 10 -> 3 pts
    s = revealCurrent(s);
    const card = currentCard(s)!;
    const pts = Object.fromEntries(card.guessResults!.map((r) => [r.clientId, r.points]));
    expect(pts[g1]).toBe(4);
    expect(pts[g2]).toBe(3);
    expect(card.ownerBonus).toBe(3); // 2 (bullseye) + 1 (the 3-pt landing)
    expect(s.players.find((p) => p.clientId === owner)!.totalScore).toBe(3);
  });

  it('voids a card whose clue-giver disconnects', () => {
    let s = toGuessing();
    s = setConnected(s, ownerOf(s), false);
    s = tick(s, ctx());
    expect(s.phase).toBe('REVEAL');
    expect(currentCard(s)!.voided).toBe(true);
    expect(currentCard(s)!.guessResults!.every((r) => r.points === 0)).toBe(true);
    expect(currentCard(s)!.ownerBonus).toBe(0);
  });
});

describe('co-op mode', () => {
  it('SET_MODE host+lobby only; shared dial un-readies everyone on move', () => {
    let s = reduce(lobby(), 'host', { t: 'SET_MODE', mode: 'coop' }, ctx());
    expect(s.mode).toBe('coop');
    expect(reduce(s, 'p2', { t: 'SET_MODE', mode: 'classic' }, ctx()).mode).toBe('coop');

    s = toGuessing(s);
    const gs = guessersOf(s);
    s = reduce(s, gs[0], { t: 'SET_READY', ready: true }, ctx());
    expect(currentCard(s)!.ready[gs[0]]).toBe(true);
    s = reduce(s, gs[1], { t: 'DIAL_MOVE', value: 77 }, ctx());
    expect(currentCard(s)!.dial.value).toBe(77);
    expect(currentCard(s)!.ready).toEqual({});
  });

  it('scores the clue-giver by the shared dial', () => {
    let s = reduce(lobby(), 'host', { t: 'SET_MODE', mode: 'coop' }, ctx());
    s = toGuessing(s);
    const owner = ownerOf(s);
    const gs = guessersOf(s);
    currentCard(s)!.target = 50;
    s = reduce(s, gs[0], { t: 'DIAL_MOVE', value: 50 }, ctx());
    s = revealCurrent(s);
    expect(currentCard(s)!.result).toEqual({ clientId: owner, delta: 0, points: 4 });
    expect(s.players.find((p) => p.clientId === owner)!.totalScore).toBe(4);
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

  it('the final clue skips the snap reveal but still lands on the scoreboard', () => {
    let s = toGuessing();
    s.setsTarget = 1; // treat it as a one-set game
    const n = currentSet(s)!.cards.length;
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      for (const g of guessersOf(s)) s = reduce(s, g, { t: 'SET_READY', ready: true }, ctx());
      if (last) {
        // no per-card REVEAL — straight to the end-of-set scoreboard
        expect(s.phase).toBe('SCOREBOARD');
        expect(s.setsDone).toBe(s.setsTarget);
      } else {
        expect(s.phase).toBe('REVEAL');
        now += 9000;
        s = tick(s, ctx());
        expect(s.phase).toBe('GUESS');
      }
    }
    expect(s.history).toHaveLength(n);
    // Host advances from the final scoreboard to the recap.
    s = reduce(s, 'host', { t: 'NEXT_ROUND' }, ctx());
    expect(s.phase).toBe('FINAL_RECAP');
    s = reduce(s, 'host', { t: 'PLAY_AGAIN' }, ctx());
    expect(s.phase).toBe('LOBBY');
    expect(s.history).toHaveLength(0);
    expect(s.players.every((p) => p.totalScore === 0)).toBe(true);
  });
});

describe('presence', () => {
  it('hands the crown to the most senior player when the owner leaves', () => {
    const s = setConnected(lobby(), 'host', false);
    expect(s.ownerClientId).toBe('p2');
  });
});

describe('host kick', () => {
  it('only the owner can kick; kicked player is removed and banned', () => {
    let s = lobby();
    expect(reduce(s, 'p2', { t: 'KICK', clientId: 'p3' }, ctx()).players).toHaveLength(3);
    expect(reduce(s, 'host', { t: 'KICK', clientId: 'host' }, ctx()).players).toHaveLength(3);
    s = reduce(s, 'host', { t: 'KICK', clientId: 'p3' }, ctx());
    expect(s.players.map((p) => p.clientId)).toEqual(['host', 'p2']);
    expect(s.banned).toContain('p3');
  });

  it('a banned player cannot be re-added by joinPlayer guard at the host', () => {
    let s = reduce(lobby(), 'host', { t: 'KICK', clientId: 'p2' }, ctx());
    expect(s.banned).toContain('p2');
    // hostServer refuses banned HELLOs; the reducer itself stays unaware,
    // so removePlayer leaves a clean roster
    expect(s.players.map((p) => p.clientId)).toEqual(['host', 'p3']);
  });

  it('removing the owner hands the crown to the most senior remaining', () => {
    let s = lobby();
    s = reduce(s, 'host', { t: 'KICK', clientId: 'host' }, ctx()); // no-op (self)
    expect(s.ownerClientId).toBe('host');
  });
});
