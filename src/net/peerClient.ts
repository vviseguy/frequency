// Runs on every non-host. One connection to the host: sends intents,
// applies authoritative snapshots / fast dial updates to the stores.
import type { DataConnection } from 'peerjs';
import type { RoomState } from '../game/types';
import type { C2H, ClientId, H2C } from './protocol';
import { send } from './transport';

export class PeerClient {
  conn: DataConnection;
  myClientId: ClientId;
  resumeToken?: string;
  lastHostMsgAt = Date.now();

  onSnapshot: (s: RoomState) => void = () => {};
  onDial: (value: number, draggerId: string | null) => void = () => {};
  onReaction: (emoji: string, fromName: string) => void = () => {};
  onWelcome: (s: RoomState) => void = () => {};
  onClose: () => void = () => {};
  onPong: (rttMs: number) => void = () => {};

  constructor(conn: DataConnection, myClientId: ClientId) {
    this.conn = conn;
    this.myClientId = myClientId;
    conn.on('data', (raw: unknown) => this.handle(raw));
    conn.on('close', () => this.onClose());
    conn.on('error', () => this.onClose());
  }

  hello(name: string) {
    send(this.conn, this.myClientId, {
      t: 'HELLO',
      clientId: this.myClientId,
      name,
      resumeToken: this.resumeToken,
    });
  }

  intent(i: C2H) {
    send(this.conn, this.myClientId, i);
  }

  ping() {
    send(this.conn, this.myClientId, { t: 'PING', ts: Date.now() });
  }

  private handle(raw: unknown) {
    const env = raw as { v: number; msg: H2C };
    if (!env || typeof env !== 'object' || !env.msg) return;
    this.lastHostMsgAt = Date.now();
    const m = env.msg;
    switch (m.t) {
      case 'WELCOME':
        this.resumeToken = m.resumeToken;
        this.onWelcome(m.snapshot);
        break;
      case 'STATE':
        this.onSnapshot(m.snapshot);
        break;
      case 'DIAL':
        this.onDial(m.value, m.draggerId);
        break;
      case 'REACTION':
        this.onReaction(m.emoji, m.fromName);
        break;
      case 'PONG':
        this.onPong(Date.now() - m.ts);
        break;
      case 'KICK':
        this.onClose();
        break;
    }
  }
}
