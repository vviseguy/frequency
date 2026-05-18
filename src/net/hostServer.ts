// Runs ONLY on the host. Owns the canonical RoomState, applies every
// intent (remote AND the host's own) through one reducer, and broadcasts.
import type { DataConnection } from 'peerjs';
import type Peer from 'peerjs';
import {
  freshRoom,
  joinPlayer,
  reduce,
  setConnected,
  tick,
  type Ctx,
} from '../game/reducer';
import { currentCard, type Prompt, type RoomState } from '../game/types';
import type { C2H, ClientId } from './protocol';
import { send } from './transport';

interface PeerConn {
  conn: DataConnection;
  clientId: ClientId | null;
}

export class HostServer {
  state: RoomState;
  private prompts: Prompt[];
  private conns = new Map<string, PeerConn>(); // keyed by peer.id
  private tokens = new Map<ClientId, string>();
  private loop: ReturnType<typeof setInterval> | null = null;
  private lastBroadcast = 0;
  private dialDirty = false;

  onState: (s: RoomState) => void = () => {};
  onReaction: (emoji: string, fromName: string) => void = () => {};
  onDial: (value: number, draggerId: string | null) => void = () => {};

  constructor(
    peer: Peer,
    code: string,
    ownerClientId: ClientId,
    prompts: Prompt[],
    seed?: RoomState,
  ) {
    this.prompts = prompts;
    this.state = seed ?? freshRoom(code, ownerClientId);
    peer.on('connection', (c) => this.attach(c));
  }

  /** Seed from a snapshot when taking over via host migration. */
  static takeover(
    peer: Peer,
    prompts: Prompt[],
    snapshot: RoomState,
    myClientId: ClientId,
    generation: number,
  ): HostServer {
    const seed: RoomState = {
      ...snapshot,
      generation,
      ownerClientId: myClientId,
      // drop any in-flight dragger so the new host re-arbitrates cleanly
      sets: snapshot.sets.map((set) => ({
        ...set,
        cards: set.cards.map((c) => ({ ...c, dial: { ...c.dial, draggerId: null } })),
      })),
      updatedAt: Date.now(),
    };
    const hs = new HostServer(peer, snapshot.code, myClientId, prompts, seed);
    return hs;
  }

  private ctx(): Ctx {
    return { prompts: this.prompts, now: Date.now() };
  }

  addLocalPlayer(clientId: ClientId, name: string) {
    this.state = joinPlayer(this.state, clientId, name);
    if (!this.state.ownerClientId) this.state.ownerClientId = clientId;
    this.onState(this.state);
  }

  start() {
    this.broadcastState();
    this.loop = setInterval(() => this.frame(), 250);
  }

  stop() {
    if (this.loop) clearInterval(this.loop);
    this.loop = null;
    this.conns.forEach((c) => c.conn.close());
    this.conns.clear();
  }

  private attach(conn: DataConnection) {
    this.conns.set(conn.peer, { conn, clientId: null });
    conn.on('data', (raw: unknown) => this.onData(conn, raw));
    conn.on('close', () => this.onClose(conn));
    conn.on('error', () => this.onClose(conn));
  }

  private onClose(conn: DataConnection) {
    const pc = this.conns.get(conn.peer);
    this.conns.delete(conn.peer);
    if (pc?.clientId) {
      this.state = setConnected(this.state, pc.clientId, false);
      this.broadcastState();
    }
  }

  private onData(conn: DataConnection, raw: unknown) {
    const env = raw as { v: number; from: ClientId; msg: C2H };
    if (!env || typeof env !== 'object') return;
    const pc = this.conns.get(conn.peer);
    if (!pc) return;
    const m = env.msg;

    if (m.t === 'HELLO') {
      pc.clientId = m.clientId;
      this.state = joinPlayer(this.state, m.clientId, m.name);
      let token = this.tokens.get(m.clientId);
      if (!token) {
        token = Math.random().toString(36).slice(2);
        this.tokens.set(m.clientId, token);
      }
      send(conn, this.state.ownerClientId, {
        t: 'WELCOME',
        clientId: m.clientId,
        resumeToken: token,
        snapshot: this.snapshot(),
      });
      this.broadcastState();
      return;
    }

    if (m.t === 'PING') {
      send(conn, this.state.ownerClientId, { t: 'PONG', ts: m.ts });
      return;
    }

    if (m.t === 'REACTION') {
      const who = this.state.players.find((p) => p.clientId === pc.clientId);
      this.fanReaction(m.emoji, who?.name ?? 'Someone');
      return;
    }

    if (!pc.clientId) return;
    this.handleIntent(pc.clientId, m);
  }

  /** THE single entry point for game actions — local host UI uses it too. */
  handleIntent(from: ClientId, intent: C2H) {
    if (intent.t === 'REACTION') {
      const who = this.state.players.find((p) => p.clientId === from);
      this.fanReaction(intent.emoji, who?.name ?? 'Someone');
      return;
    }
    const before = this.state;
    this.state = reduce(this.state, from, intent, this.ctx());
    if (this.state === before) return;
    if (intent.t === 'DIAL_MOVE') {
      this.dialDirty = true; // fast path; coalesced in frame()
    } else {
      this.broadcastState();
    }
  }

  private fanReaction(emoji: string, fromName: string) {
    this.onReaction(emoji, fromName);
    this.conns.forEach(({ conn }) =>
      send(conn, this.state.ownerClientId, { t: 'REACTION', emoji, fromName }),
    );
  }

  private frame() {
    const before = this.state;
    this.state = tick(this.state, this.ctx());
    const changed = this.state !== before;

    const card = currentCard(this.state);
    if (this.dialDirty && card) {
      this.dialDirty = false;
      const { value, draggerId } = card.dial;
      this.conns.forEach(({ conn }) =>
        send(conn, this.state.ownerClientId, { t: 'DIAL', value, draggerId }),
      );
      this.onDial(value, draggerId); // host sees the live dial too
    }

    if (changed || Date.now() - this.lastBroadcast > 3000) {
      this.broadcastState();
    }
  }

  private snapshot(): RoomState {
    return { ...this.state, updatedAt: Date.now() };
  }

  private broadcastState() {
    this.lastBroadcast = Date.now();
    const snap = this.snapshot();
    this.conns.forEach(({ conn }) =>
      send(conn, this.state.ownerClientId, { t: 'STATE', snapshot: snap }),
    );
    this.onState(snap);
  }
}
