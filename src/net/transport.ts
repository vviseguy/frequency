// Thin send helper + sequence numbering over a PeerJS DataConnection.
import type { DataConnection } from 'peerjs';
import { wrap, type Envelope, type Payload, PROTOCOL_VERSION } from './protocol';

let seq = 1;

export function send(conn: DataConnection, from: string, msg: Payload) {
  if (!conn.open) return;
  try {
    conn.send(wrap(from, seq++, msg));
  } catch {
    /* connection mid-teardown — ignore */
  }
}

/** Validate an inbound payload's protocol version. */
export function accept(env: Envelope): boolean {
  return env && typeof env === 'object' && env.v === PROTOCOL_VERSION;
}
