// The single authoritative game reducer. Runs ONLY on the host. Pure-ish:
// (state, intent, ctx) -> next state. Time-based transitions live in tick().
import type { C2H } from '../net/protocol';
import { colorFor } from '../lib/identity';
import { allReady, makeRound, nextPsychic } from './rounds';
import { scoreFor } from './scoring';
import {
  DEFAULT_CONFIG,
  MIN_PLAYERS,
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
    config: { ...DEFAULT_CONFIG },
    round: null,
    history: [],
    phaseEndsAt: null,
    updatedAt: Date.now(),
  };
}

let joinCounter = 1;

/** Add a brand-new player or re-attach a returning one (by clientId). */
export function joinPlayer(
  state: RoomState,
  clientId: string,
  name: string,
): RoomState {
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
    emoji: (name.match(/\p{Emoji}/u)?.[0]) ?? '🎈',
    joinedAt: joinCounter++,
    connected: true,
    totalScore: 0,
  };
  return { ...state, players: [...players, p], updatedAt: Date.now() };
}

export function setConnected(
  state: RoomState,
  clientId: string,
  connected: boolean,
): RoomState {
  const players = state.players.map((p) =>
    p.clientId === clientId ? { ...p, connected } : p,
  );
  let owner = state.ownerClientId;
  // Owner left -> hand the crown to the most senior connected player.
  if (!connected && clientId === owner) {
    const senior = [...players]
      .filter((p) => p.connected)
      .sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (senior) owner = senior.clientId;
  }
  return { ...state, players, ownerClientId: owner, updatedAt: Date.now() };
}

function startRound(state: RoomState, ctx: Ctx, psychicId: string, index: number): RoomState {
  return {
    ...state,
    phase: 'ROUND_INTRO',
    round: makeRound(state, ctx.prompts, index, psychicId),
    phaseEndsAt: ctx.now + 2800,
    updatedAt: ctx.now,
  };
}

function toReveal(state: RoomState, ctx: Ctx, voided = false): RoomState {
  if (!state.round) return state;
  const r = state.round;
  const points = voided ? 0 : scoreFor(r.dial.value, r.target, state.config.bands);
  const result = {
    clientId: r.psychicClientId,
    delta: Math.abs(r.dial.value - r.target),
    points,
  };
  const players = state.players.map((p) =>
    p.clientId === r.psychicClientId ? { ...p, totalScore: p.totalScore + points } : p,
  );
  return {
    ...state,
    phase: 'REVEAL',
    players,
    round: { ...r, voided, results: [result] },
    phaseEndsAt: ctx.now + 7200,
    updatedAt: ctx.now,
  };
}

/** Apply a peer intent. Returns the next state (unchanged if rejected). */
export function reduce(
  state: RoomState,
  from: string,
  intent: C2H,
  ctx: Ctx,
): RoomState {
  const r = state.round;
  switch (intent.t) {
    case 'RENAME': {
      const players = state.players.map((p) =>
        p.clientId === from ? { ...p, name: intent.name.slice(0, 18) } : p,
      );
      return { ...state, players, updatedAt: ctx.now };
    }

    case 'CONFIG': {
      if (from !== state.ownerClientId || state.phase !== 'LOBBY') return state;
      return {
        ...state,
        config: { ...state.config, ...intent.patch },
        updatedAt: ctx.now,
      };
    }

    case 'START_GAME': {
      if (from !== state.ownerClientId || state.phase !== 'LOBBY') return state;
      if (state.players.filter((p) => p.connected).length < MIN_PLAYERS) return state;
      const reset = {
        ...state,
        history: [],
        players: state.players.map((p) => ({ ...p, totalScore: 0 })),
      };
      const psychic = nextPsychic(reset, null);
      return startRound(reset, ctx, psychic, 0);
    }

    case 'SUBMIT_CLUE': {
      if (!r || state.phase !== 'CLUE' || from !== r.psychicClientId) return state;
      return {
        ...state,
        phase: 'GUESS',
        round: { ...r, clue: intent.clue.slice(0, 60) || '(no clue)' },
        phaseEndsAt: ctx.now + state.config.guessSeconds * 1000,
        updatedAt: ctx.now,
      };
    }

    case 'DIAL_GRAB': {
      if (!r || state.phase !== 'GUESS' || from === r.psychicClientId) return state;
      if (r.dial.draggerId && r.dial.draggerId !== from) return state; // someone else steering
      return { ...state, round: { ...r, dial: { ...r.dial, draggerId: from } } };
    }

    case 'DIAL_MOVE': {
      if (!r || state.phase !== 'GUESS' || from === r.psychicClientId) return state;
      if (r.dial.draggerId && r.dial.draggerId !== from) return state;
      return {
        ...state,
        round: { ...r, dial: { value: clamp(intent.value), draggerId: from } },
      };
    }

    case 'DIAL_RELEASE': {
      if (!r || r.dial.draggerId !== from) return state;
      return { ...state, round: { ...r, dial: { ...r.dial, draggerId: null } } };
    }

    case 'SET_READY': {
      if (!r || state.phase !== 'GUESS' || from === r.psychicClientId) return state;
      const ready = { ...r.ready, [from]: intent.ready };
      const next = { ...state, round: { ...r, ready }, updatedAt: ctx.now };
      return allReady(next) ? toReveal(next, ctx) : next;
    }

    case 'NEXT_ROUND': {
      if (from !== state.ownerClientId) return state;
      if (state.phase !== 'SCOREBOARD' && state.phase !== 'REVEAL') return state;
      // bank the just-finished round
      const history = r ? [...state.history, r] : state.history;
      if (history.length >= state.config.roundsTarget) {
        return { ...state, phase: 'FINAL_RECAP', history, round: null, phaseEndsAt: null, updatedAt: ctx.now };
      }
      const psychic = nextPsychic(state, r?.psychicClientId ?? null);
      return startRound({ ...state, history }, ctx, psychic, history.length);
    }

    case 'PLAY_AGAIN': {
      if (from !== state.ownerClientId || state.phase !== 'FINAL_RECAP') return state;
      return {
        ...state,
        phase: 'LOBBY',
        round: null,
        history: [],
        phaseEndsAt: null,
        players: state.players.map((p) => ({ ...p, totalScore: 0 })),
        updatedAt: ctx.now,
      };
    }

    default:
      return state;
  }
}

/** Time / presence driven transitions. Called by the host loop ~4x/sec. */
export function tick(state: RoomState, ctx: Ctx): RoomState {
  const r = state.round;
  const due = state.phaseEndsAt != null && ctx.now >= state.phaseEndsAt;

  // Psychic vanished mid-round -> void it.
  if (r && (state.phase === 'CLUE' || state.phase === 'GUESS')) {
    const psychic = state.players.find((p) => p.clientId === r.psychicClientId);
    if (psychic && !psychic.connected) return toReveal(state, ctx, true);
  }

  switch (state.phase) {
    case 'ROUND_INTRO':
      if (due)
        return {
          ...state,
          phase: 'CLUE',
          phaseEndsAt: ctx.now + state.config.clueSeconds * 1000,
          updatedAt: ctx.now,
        };
      return state;
    case 'CLUE':
      if (due && r)
        return {
          ...state,
          phase: 'GUESS',
          round: { ...r, clue: r.clue ?? '(out of time!)' },
          phaseEndsAt: ctx.now + state.config.guessSeconds * 1000,
          updatedAt: ctx.now,
        };
      return state;
    case 'GUESS':
      if (due) return toReveal(state, ctx);
      return state;
    case 'REVEAL':
      if (due) return { ...state, phase: 'SCOREBOARD', phaseEndsAt: null, updatedAt: ctx.now };
      return state;
    default:
      return state;
  }
}
