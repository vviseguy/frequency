// The single authoritative game reducer. Runs ONLY on the host.
import type { C2H } from '../net/protocol';
import { colorFor } from '../lib/identity';
import { allCluesIn, allReadyForCard, makeSet } from './rounds';
import { scoreFor } from './scoring';
import {
  BANDS,
  CLUE_SECONDS,
  currentCard,
  GUESS_SECONDS,
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
    packs: [],
    setsTarget: 3,
    setsDone: 0,
    set: null,
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

function startSet(state: RoomState, ctx: Ctx, index: number): RoomState {
  return {
    ...state,
    phase: 'CLUE',
    set: makeSet(state, ctx.prompts, index),
    phaseEndsAt: ctx.now + CLUE_SECONDS * 1000,
    updatedAt: ctx.now,
  };
}

function beginGuessing(state: RoomState, ctx: Ctx): RoomState {
  if (!state.set) return state;
  const cards = state.set.cards.map((c) => ({
    ...c,
    clue: c.clue ?? '(out of time!)',
  }));
  return {
    ...state,
    phase: 'GUESS',
    set: { ...state.set, cards, guessIndex: 0 },
    phaseEndsAt: ctx.now + GUESS_SECONDS * 1000,
    updatedAt: ctx.now,
  };
}

function scoreCard(card: ClueCard, voided: boolean): ClueCard {
  const points = voided ? 0 : scoreFor(card.dial.value, card.target, BANDS);
  return {
    ...card,
    voided,
    result: {
      clientId: card.ownerClientId,
      delta: Math.abs(card.dial.value - card.target),
      points,
    },
  };
}

function toReveal(state: RoomState, ctx: Ctx, voided = false): RoomState {
  const s = state.set;
  if (!s) return state;
  const idx = s.guessIndex;
  const scored = scoreCard(s.cards[idx], voided);
  const cards = s.cards.map((c, i) => (i === idx ? scored : c));
  const players = state.players.map((p) =>
    p.clientId === scored.ownerClientId
      ? { ...p, totalScore: p.totalScore + (scored.result?.points ?? 0) }
      : p,
  );
  return {
    ...state,
    phase: 'REVEAL',
    players,
    set: { ...s, cards },
    phaseEndsAt: ctx.now + REVEAL_MS,
    updatedAt: ctx.now,
  };
}

function afterReveal(state: RoomState, ctx: Ctx): RoomState {
  const s = state.set;
  if (!s) return state;
  const next = s.guessIndex + 1;
  if (next < s.cards.length) {
    return {
      ...state,
      phase: 'GUESS',
      set: { ...s, guessIndex: next },
      phaseEndsAt: ctx.now + GUESS_SECONDS * 1000,
      updatedAt: ctx.now,
    };
  }
  // set complete -> bank cards, breather on the scoreboard
  return {
    ...state,
    phase: 'SCOREBOARD',
    history: [...state.history, ...s.cards],
    setsDone: state.setsDone + 1,
    phaseEndsAt: null,
    updatedAt: ctx.now,
  };
}

export function reduce(state: RoomState, from: string, intent: C2H, ctx: Ctx): RoomState {
  const s = state.set;
  switch (intent.t) {
    case 'RENAME': {
      const players = state.players.map((p) =>
        p.clientId === from ? { ...p, name: intent.name.slice(0, 18) } : p,
      );
      return { ...state, players, updatedAt: ctx.now };
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
        setsTarget: setsTargetFor(connected.length),
        players: state.players.map((p) => ({ ...p, totalScore: 0 })),
      };
      if (state.intro) {
        return { ...reset, phase: 'INTRO', set: null, phaseEndsAt: null, updatedAt: ctx.now };
      }
      return startSet(reset, ctx, 0);
    }

    case 'BEGIN_PLAY': {
      if (from !== state.ownerClientId || state.phase !== 'INTRO') return state;
      return startSet(state, ctx, 0);
    }

    case 'SUBMIT_CLUE': {
      if (!s || state.phase !== 'CLUE') return state;
      const cards = s.cards.map((c) =>
        c.ownerClientId === from ? { ...c, clue: intent.clue.slice(0, 60) || '(no clue)' } : c,
      );
      const next = { ...state, set: { ...s, cards }, updatedAt: ctx.now };
      return allCluesIn(next) ? beginGuessing(next, ctx) : next;
    }

    case 'DIAL_GRAB': {
      const card = currentCard(state);
      if (!s || state.phase !== 'GUESS' || !card || from === card.ownerClientId) return state;
      if (card.dial.draggerId && card.dial.draggerId !== from) return state;
      return patchCard(state, s, { dial: { ...card.dial, draggerId: from } });
    }
    case 'DIAL_MOVE': {
      const card = currentCard(state);
      if (!s || state.phase !== 'GUESS' || !card || from === card.ownerClientId) return state;
      if (card.dial.draggerId && card.dial.draggerId !== from) return state;
      const value = clamp(intent.value);
      // co-op: moving the dial un-readies everyone (they must re-approve)
      const moved = value !== card.dial.value;
      const ready = state.mode === 'coop' && moved ? {} : card.ready;
      return patchCard(state, s, { dial: { value, draggerId: from }, ready });
    }
    case 'DIAL_RELEASE': {
      const card = currentCard(state);
      if (!s || !card || card.dial.draggerId !== from) return state;
      return patchCard(state, s, { dial: { ...card.dial, draggerId: null } });
    }

    case 'SET_READY': {
      const card = currentCard(state);
      if (!s || state.phase !== 'GUESS' || !card || from === card.ownerClientId) return state;
      const withReady = patchCard(state, s, { ready: { ...card.ready, [from]: intent.ready } });
      return allReadyForCard(withReady, currentCard(withReady)!)
        ? toReveal(withReady, ctx)
        : { ...withReady, updatedAt: ctx.now };
    }

    case 'NEXT_ROUND': {
      if (from !== state.ownerClientId || state.phase !== 'SCOREBOARD') return state;
      if (state.setsDone >= state.setsTarget) {
        return { ...state, phase: 'FINAL_RECAP', set: null, phaseEndsAt: null, updatedAt: ctx.now };
      }
      return startSet(state, ctx, state.setsDone);
    }

    case 'PLAY_AGAIN': {
      if (from !== state.ownerClientId || state.phase !== 'FINAL_RECAP') return state;
      return {
        ...state,
        phase: 'LOBBY',
        set: null,
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

function patchCard(
  state: RoomState,
  s: NonNullable<RoomState['set']>,
  patch: Partial<ClueCard>,
): RoomState {
  const cards = s.cards.map((c, i) => (i === s.guessIndex ? { ...c, ...patch } : c));
  return { ...state, set: { ...s, cards } };
}

export function tick(state: RoomState, ctx: Ctx): RoomState {
  const s = state.set;
  const due = state.phaseEndsAt != null && ctx.now >= state.phaseEndsAt;

  if (state.phase === 'GUESS' && s) {
    const card = currentCard(state);
    const owner = card && state.players.find((p) => p.clientId === card.ownerClientId);
    if (card && owner && !owner.connected) return toReveal(state, ctx, true);
  }

  switch (state.phase) {
    case 'CLUE':
      return due && s ? beginGuessing(state, ctx) : state;
    case 'GUESS':
      return due ? toReveal(state, ctx) : state;
    case 'REVEAL':
      return due ? afterReveal(state, ctx) : state;
    default:
      return state;
  }
}
