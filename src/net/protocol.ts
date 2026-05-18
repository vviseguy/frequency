// The wire protocol. One versioned discriminated union. Peers send intents
// to the host; the host is the only writer of canonical state and replies
// with snapshots / fast dial updates.
import type { RoomState } from '../game/types';

export const PROTOCOL_VERSION = 1;

export type ClientId = string;

// ---- Peer -> Host (intents) ----
export type C2H =
  | { t: 'HELLO'; clientId: ClientId; name: string; resumeToken?: string }
  | { t: 'DIAL_GRAB' }
  | { t: 'DIAL_MOVE'; value: number }
  | { t: 'DIAL_RELEASE' }
  | { t: 'SET_READY'; ready: boolean }
  | { t: 'SUBMIT_CLUE'; clue: string }
  | { t: 'START_GAME' }
  | { t: 'BEGIN_PLAY' }
  | { t: 'NEXT_ROUND' }
  | { t: 'PLAY_AGAIN' }
  | { t: 'SET_INTRO'; on: boolean }
  | { t: 'SET_MODE'; mode: 'classic' | 'coop' }
  | { t: 'SET_PACKS'; packs: string[] }
  | { t: 'RENAME'; name: string }
  | { t: 'KICK'; clientId: ClientId }
  | { t: 'REACTION'; emoji: string }
  | { t: 'PING'; ts: number };

// ---- Host -> Peer (authoritative) ----
export type H2C =
  | { t: 'WELCOME'; clientId: ClientId; resumeToken: string; snapshot: RoomState }
  | { t: 'STATE'; snapshot: RoomState }
  | { t: 'DIAL'; value: number; draggerId: ClientId | null }
  | { t: 'REACTION'; emoji: string; fromName: string }
  | { t: 'KICK'; reason: string }
  | { t: 'PONG'; ts: number };

export type Payload = C2H | H2C;

export interface Envelope {
  v: number;
  from: ClientId;
  seq: number;
  msg: Payload;
}

export function wrap(from: ClientId, seq: number, msg: Payload): Envelope {
  return { v: PROTOCOL_VERSION, from, seq, msg };
}
