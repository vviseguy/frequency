// The single authoritative game reducer. Runs ONLY on the host.
import type { C2H } from '../net/protocol';
import { colorFor } from '../lib/identity';
import { allReadyForCard, makeSets } from './rounds';
import { scoreFor } from './scoring';
import {
  allCluesIn,
  BANDS,
  currentCard,
  currentSet,
  GUESS_SECONDS,
  guessersFor,
  MIN_PLAYERS,
  REVEAL_MS,
  setsTargetFor,
  type ClueCard,
  type Player,
  type Prompt,
  type RoomState,
} from './types';

export interface Ctx {
  prompts: Prompt[];
  now: number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function freshRoom(code: string, ownerClientId: string): RoomState {
  return {
    generation: 0,
    code,
    phase: 'LOBBY',
    players: [],
    ownerClientId,
    mode: 'classic',
    intro: false,
    banned: [],
    packs: [],
    setsTarget: 3,
    setsDone: 0,
    sets: [],
    setIndex: 0,
    history: [],
    phaseEndsAt: null,
    updatedAt: Date.now(),
  };
}

let joinCounter = 1;

export function joinPlayer(state: RoomState, clientId: string, name: string): RoomState {
  const players = [...state.players];
  const existing = players.find((p) => p.clientId === clientId);
  if (existing) {
    existing.connected = true;
    existing.name = name || existing.name;
    return { ...state, players, updatedAt: Date.now() };
  }
  const p: Player = {
    clientId,
    name: name || 'Player',
    color: colorFor(clientId),
    emoji: name.match(/\p{Emoji}/u)?.[0] ?? '🎈',
    joinedAt: joinCounter++,
    connected: true,
    totalScore: 0,
  };
  return { ...state, players: [...players, p], updatedAt: Date.now() };
}

export function setConnected(state: RoomState, clientId: string, connected: boolean): RoomState {
  const players = state.players.map((p) =>
    p.clientId === clientId ? { ...p, connected } : p,
  );
  let owner = state.ownerClientId;
  if (!connected && clientId === owner) {
    const senior = [...players]
      .filter((p) => p.connected)
      .sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (senior) owner = senior.clientId;
  }
  return { ...state, players, ownerClientId: owner, updatedAt: Date.now() };
}

/** Drop a player entirely (host kick / idle timeout). Reassigns the crown
 *  if needed; their in-flight card is voided by tick (missing owner). */
export function removePlayer(state: RoomState, clientId: string, now = Date.now()): RoomState {
  if (!state.players.some((p) => p.clientId === clientId)) return state;
  const players = state.players.filter((p) => p.clientId !== clientId);
  let owner = state.ownerClientId;
  if (clientId === owner) {
    const senior = [...players]
      .filter((p) => p.connected)
      .sort((a, b) => a.joinedAt - b.joinedAt)[0];
    owner = senior?.clientId ?? players[0]?.clientId ?? owner;
  }
  return { ...state, players, ownerClientId: owner, updatedAt: now };
}

/** Deal the WHOLE game up front — every set, ready for simultaneous cluing. */
function dealGame(state: RoomState, ctx: Ctx): RoomState {
  return {
    ...state,
    phase: 'CLUE',
    sets: makeSets(state, ctx.prompts, state.setsTarget),
    setIndex: 0,
    phaseEndsAt: null, // no clue timer — players write all their clues, then wait
    updatedAt: ctx.now,
  };
}

function beginGuessing(state: RoomState, ctx: Ctx): RoomState {
  if (!state.sets.length) return state;
  const sets = state.sets.map((set) => ({
    ...set,
    guessIndex: 0,
    cards: set.cards.map((c) => ({ ...c, clue: c.clue ?? '(no clue)' })),
  }));
  return {
    ...state,
    phase: 'GUESS',
    sets,
    setIndex: 0,
    phaseEndsAt: ctx.now + GUESS_SECONDS * 1000,
    updatedAt: ctx.now,
  };
}

/** Score a card. Returns the resolved card + per-player point deltas. */
function scoreCard(
  state: RoomState,
  card: ClueCard,
  voided: boolean,
): { card: ClueCard; deltas: Record<string, number> } {
  const deltas: Record<string, number> = {};

  if (state.mode === 'coop') {
    const points = voided ? 0 : scoreFor(card.dial.value, card.target, BANDS);
    deltas[card.ownerClientId] = points;
    return {
      card: {
        ...card,
        voided,
        result: { clientId: card.ownerClientId, delta: Math.abs(card.dial.value - card.target), points },
        guessResults: null,
        ownerBonus: 0,
      },
      deltas,
    };
  }

  // classic: each guesser scores their own guess; the clue-giver earns a
  // bonus: +2 per bullseye (4), +1 per "close-ish" guess (3 or 2).
  const guessers = guessersFor(state, card);
  const guessResults = guessers.map((g) => {
    const value = card.guesses[g.clientId] ?? 50;
    const points = voided ? 0 : scoreFor(value, card.target, BANDS);
    deltas[g.clientId] = (deltas[g.clientId] ?? 0) + points;
    return { clientId: g.clientId, value, points };
  });
  const ownerBonus = voided
    ? 0
    : guessResults.reduce((n, r) => n + (r.points === 4 ? 2 : r.points >= 2 ? 1 : 0), 0);
  deltas[card.ownerClientId] = (deltas[card.ownerClientId] ?? 0) + ownerBonus;
  return {
    card: { ...card, voided, result: null, guessResults, ownerBonus },
    deltas,
  };
}

/** Replace the card currently being guessed in the current set. */
function patchCurrentCard(state: RoomState, patch: Partial<ClueCard>): RoomState {
  const si = state.setIndex;
  const set = state.sets[si];
  if (!set) return state;
  const cards = set.cards.map((c, i) => (i === set.guessIndex ? { ...c, ...patch } : c));
  const sets = state.sets.map((s, i) => (i === si ? { ...s, cards } : s));
  return { ...state, sets };
}

function toReveal(state: RoomState, ctx: Ctx, voided = false): RoomState {
  const si = state.setIndex;
  const set = state.sets[si];
  if (!set) return state;
  const idx = set.guessIndex;
  const { card: scored, deltas } = scoreCard(state, set.cards[idx], voided);
  const cards = set.cards.map((c, i) => (i === idx ? scored : c));
  const sets = state.sets.map((s, i) => (i === si ? { ...s, cards } : s));
  const players = state.players.map((p) =>
    deltas[p.clientId] ? { ...p, totalScore: p.totalScore + deltas[p.clientId] } : p,
  );

  // The very last clue of the whole game: skip the snap score reveal AND
  // the scoreboard — go straight into the slow recap, which unveils the
  // totals at its own pace (no spoiler before the build-up).
  const lastTurn = si === state.setsTarget - 1 && idx === set.cards.length - 1;
  if (lastTurn) {
    return {
      ...state,
      phase: 'FINAL_RECAP',
      players,
      sets,
      history: [...state.history, ...cards],
      setsDone: state.setsDone + 1,
      phaseEndsAt: null,
      updatedAt: ctx.now,
    };
  }

  return {
    ...state,
    phase: 'REVEAL',
    players,
    sets,
    phaseEndsAt: ctx.now + REVEAL_MS,
    updatedAt: ctx.now,
  };
}

function afterReveal(state: RoomState, ctx: Ctx): RoomState {
  const si = state.setIndex;
  const set = state.sets[si];
  if (!set) return state;
  const next = set.guessIndex + 1;
  if (next < set.cards.length) {
    const sets = state.sets.map((s, i) => (i === si ? { ...s, guessIndex: next } : s));
    return {
      ...state,
      phase: 'GUESS',
      sets,
      phaseEndsAt: ctx.now + GUESS_SECONDS * 1000,
      updatedAt: ctx.now,
    };
  }
  // set complete -> bank cards, breather on the scoreboard
  return {
    ...state,
    phase: 'SCOREBOARD',
    history: [...state.history, ...set.cards],
    setsDone: state.setsDone + 1,
    phaseEndsAt: null,
    updatedAt: ctx.now,
  };
}

export function reduce(state: RoomState, from: string, intent: C2H, ctx: Ctx): RoomState {
  switch (intent.t) {
    case 'RENAME': {
      const players = state.players.map((p) =>
        p.clientId === from ? { ...p, name: intent.name.slice(0, 18) } : p,
      );
      return { ...state, players, updatedAt: ctx.now };
    }

    case 'KICK': {
      if (from !== state.ownerClientId || intent.clientId === state.ownerClientId) return state;
      if (!state.players.some((p) => p.clientId === intent.clientId)) return state;
      const banned = state.banned.includes(intent.clientId)
        ? state.banned
        : [...state.banned, intent.clientId];
      return removePlayer({ ...state, banned }, intent.clientId, ctx.now);
    }

    case 'SET_PACKS': {
      if (from !== state.ownerClientId || state.phase !== 'LOBBY') return state;
      return { ...state, packs: [...new Set(intent.packs)], updatedAt: ctx.now };
    }

    case 'SET_INTRO': {
      if (from !== state.ownerClientId || state.phase !== 'LOBBY') return state;
      return { ...state, intro: intent.on, updatedAt: ctx.now };
    }

    case 'SET_MODE': {
      if (from !== state.ownerClientId || state.phase !== 'LOBBY') return state;
      return { ...state, mode: intent.mode, updatedAt: ctx.now };
    }

    case 'START_GAME': {
      if (from !== state.ownerClientId || state.phase !== 'LOBBY') return state;
      const connected = state.players.filter((p) => p.connected);
      if (connected.length < MIN_PLAYERS) return state;
      const reset: RoomState = {
        ...state,
        history: [],
        setsDone: 0,
        setIndex: 0,
        setsTarget: setsTargetFor(connected.length),
        players: state.players.map((p) => ({ ...p, totalScore: 0 })),
      };
      if (state.intro) {
        return { ...reset, phase: 'INTRO', sets: [], phaseEndsAt: null, updatedAt: ctx.now };
      }
      return dealGame(reset, ctx);
    }

    case 'BEGIN_PLAY': {
      if (from !== state.ownerClientId || state.phase !== 'INTRO') return state;
      return dealGame(state, ctx);
    }

    case 'SUBMIT_CLUE': {
      if (state.phase !== 'CLUE') return state;
      // fill the sender's NEXT un-written clue (lowest set index)
      let filled = false;
      const sets = state.sets.map((set) => ({
        ...set,
        cards: set.cards.map((c) => {
          if (!filled && c.ownerClientId === from && c.clue == null) {
            filled = true;
            return { ...c, clue: intent.clue.slice(0, 60) || '(no clue)' };
          }
          return c;
        }),
      }));
      if (!filled) return state;
      const next = { ...state, sets, updatedAt: ctx.now };
      return allCluesIn(next) ? beginGuessing(next, ctx) : next;
    }

    case 'DIAL_GRAB': {
      const card = currentCard(state);
      if (state.phase !== 'GUESS' || !card || from === card.ownerClientId) return state;
      if (state.mode !== 'coop') return state; // classic: no shared steering
      if (card.dial.draggerId && card.dial.draggerId !== from) return state;
      return patchCurrentCard(state, { dial: { ...card.dial, draggerId: from } });
    }
    case 'DIAL_MOVE': {
      const card = currentCard(state);
      if (state.phase !== 'GUESS' || !card || from === card.ownerClientId) return state;
      const value = clamp(intent.value);
      if (state.mode === 'coop') {
        if (card.dial.draggerId && card.dial.draggerId !== from) return state;
        // moving the shared dial un-readies everyone (they re-approve)
        const ready = value !== card.dial.value ? {} : card.ready;
        return patchCurrentCard(state, { dial: { value, draggerId: from }, ready });
      }
      // classic: each guesser owns their guess; changing it un-readies them
      return patchCurrentCard(state, {
        guesses: { ...card.guesses, [from]: value },
        ready: { ...card.ready, [from]: false },
      });
    }
    case 'DIAL_RELEASE': {
      const card = currentCard(state);
      if (!card || state.mode !== 'coop' || card.dial.draggerId !== from) return state;
      return patchCurrentCard(state, { dial: { ...card.dial, draggerId: null } });
    }

    case 'SET_READY': {
      const card = currentCard(state);
      if (state.phase !== 'GUESS' || !card || from === card.ownerClientId) return state;
      const withReady = patchCurrentCard(state, { ready: { ...card.ready, [from]: intent.ready } });
      return allReadyForCard(withReady, currentCard(withReady)!)
        ? toReveal(withReady, ctx)
        : { ...withReady, updatedAt: ctx.now };
    }

    case 'NEXT_ROUND': {
      if (from !== state.ownerClientId || state.phase !== 'SCOREBOARD') return state;
      if (state.setsDone >= state.setsTarget) {
        return { ...state, phase: 'FINAL_RECAP', phaseEndsAt: null, updatedAt: ctx.now };
      }
      const si = state.setsDone; // next set to guess
      const sets = state.sets.map((s, i) => (i === si ? { ...s, guessIndex: 0 } : s));
      return {
        ...state,
        phase: 'GUESS',
        setIndex: si,
        sets,
        phaseEndsAt: ctx.now + GUESS_SECONDS * 1000,
        updatedAt: ctx.now,
      };
    }

    case 'PLAY_AGAIN': {
      if (from !== state.ownerClientId || state.phase !== 'FINAL_RECAP') return state;
      return {
        ...state,
        phase: 'LOBBY',
        sets: [],
        setIndex: 0,
        history: [],
        setsDone: 0,
        phaseEndsAt: null,
        players: state.players.map((p) => ({ ...p, totalScore: 0 })),
        updatedAt: ctx.now,
      };
    }

    default:
      return state;
  }
}

export function tick(state: RoomState, ctx: Ctx): RoomState {
  const due = state.phaseEndsAt != null && ctx.now >= state.phaseEndsAt;

  if (state.phase === 'GUESS' && currentSet(state)) {
    const card = currentCard(state);
    const owner = card && state.players.find((p) => p.clientId === card.ownerClientId);
    // owner gone (disconnected, kicked, or timed-out) -> skip their clue
    if (card && (!owner || !owner.connected)) return toReveal(state, ctx, true);
  }

  switch (state.phase) {
    case 'CLUE':
      // no timer — start guessing as soon as everyone's clues are in
      return allCluesIn(state) ? beginGuessing(state, ctx) : state;
    case 'GUESS':
      return due ? toReveal(state, ctx) : state;
    case 'REVEAL':
      return due ? afterReveal(state, ctx) : state;
    default:
      return state;
  }
}
