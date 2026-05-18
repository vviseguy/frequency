// Top-level P2P controller. Owns create / join / host-migration and exposes
// one tiny API to React: createRoom, joinRoom, send(intent), leave().
import type { DataConnection } from 'peerjs';
import type Peer from 'peerjs';
import { useGameStore } from '../game/gameStore';
import { loadPrompts } from '../game/prompts';
import type { RoomState } from '../game/types';
import { toast } from '../hooks/useToast';
import { getClientId, markHosted } from '../lib/identity';
import { HostServer } from './hostServer';
import {
  HOST_DEAD_MS,
  HOST_SILENT_VEIL_MS,
  ladder,
  successorId,
} from './migration';
import { useNetStore } from './netStore';
import { openPeer } from './peer';
import { PeerClient } from './peerClient';
import type { C2H } from './protocol';
import { genRoomCode, hostPeerId } from './roomCode';

const game = () => useGameStore.getState();
const net = () => useNetStore.getState();

class Net {
  private peer: Peer | null = null;
  private host: HostServer | null = null;
  private client: PeerClient | null = null;
  private code = '';
  private name = '';
  private generation = 0;
  private myId = getClientId();
  private watch: ReturnType<typeof setInterval> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private migrating = false;
  private stopped = false;

  // ---- public API ----------------------------------------------------

  async createRoom(name: string) {
    if (this.host || this.client || net().status === 'connecting') return this.code; // ignore dup
    this.name = name;
    this.stopped = false;
    const prompts = await loadPrompts();
    net().set({ status: 'connecting', role: 'host', error: null });

    for (let attempt = 0; attempt < 4; attempt++) {
      const code = genRoomCode();
      try {
        const peer = await openPeer(hostPeerId(code, 0));
        this.peer = peer;
        this.code = code;
        this.generation = 0;
        this.startHost(prompts, undefined);
        net().set({ status: 'connected', code, myClientId: this.myId });
        markHosted(code);
        this.armWatch();
        return code;
      } catch (e) {
        if ((e as { type?: string })?.type === 'unavailable-id') continue; // code clash
        net().set({ status: 'error', error: null });
        toast('Could not reach the matchmaking broker. Try again.');
        throw e;
      }
    }
    net().set({ status: 'error', error: null });
    toast('Could not create a room. Try again.');
    throw new Error('room-create-failed');
  }

  async joinRoom(code: string, name: string) {
    if (this.host || this.client || net().status === 'connecting') return; // ignore dup
    this.name = name;
    this.code = code;
    this.stopped = false;
    await loadPrompts();
    net().set({ status: 'connecting', role: 'peer', code, error: null, myClientId: this.myId });
    // dead generations now fail instantly (peer-unavailable), so we can
    // afford a long per-try window for the live host to finish its WebRTC
    // handshake instead of giving up on a room that's actually there.
    const ok = await this.connectToHost(0, 3, 5000);
    if (!ok) {
      net().set({ status: 'idle', error: null });
      throw new Error('join-failed');
    }
    this.armWatch();
  }

  send(intent: C2H) {
    if (this.host) this.host.handleIntent(this.myId, intent);
    else if (this.client) this.client.intent(intent);
  }

  leave() {
    this.stopped = true;
    if (this.watch) clearInterval(this.watch);
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.host?.stop();
    this.client?.conn.close();
    this.peer?.destroy();
    this.peer = null;
    this.host = null;
    this.client = null;
    game().setRoom(null);
    net().reset();
  }

  // ---- host ----------------------------------------------------------

  private startHost(prompts: Awaited<ReturnType<typeof loadPrompts>>, seed?: RoomState) {
    if (!this.peer) return;
    const hs = seed
      ? HostServer.takeover(this.peer, prompts, seed, this.myId, this.generation)
      : new HostServer(this.peer, this.code, this.myId, prompts);
    hs.onState = (s) => {
      this.generation = s.generation;
      game().setRoom(s);
      net().set({ role: 'host', status: 'connected', code: s.code });
    };
    hs.onReaction = (emoji, fromName) => net().pushReaction(emoji, fromName);
    hs.onDial = (v, d) => game().setDial(v, d);
    hs.addLocalPlayer(this.myId, this.name);
    hs.start();
    this.host = hs;
    this.client = null;
  }

  // ---- peer ----------------------------------------------------------

  /** Probe the generation ladder until a host answers with WELCOME. */
  private async connectToHost(
    fromGen: number,
    rounds: number,
    perTryMs = 4000,
    maxSpan?: number,
  ): Promise<boolean> {
    for (let r = 0; r < rounds && !this.stopped; r++) {
      const gens = maxSpan != null ? ladder(fromGen).slice(0, maxSpan + 1) : ladder(fromGen);
      for (const gen of gens) {
        const conn = await this.tryConnect(hostPeerId(this.code, gen), perTryMs);
        if (!conn) continue;
        const adopted = await this.adopt(conn);
        if (adopted) return true;
      }
      await wait(350);
    }
    return false;
  }

  private tryConnect(peerId: string, timeoutMs = 4000): Promise<DataConnection | null> {
    return new Promise(async (resolve) => {
      // Recreate the Peer if it's gone OR lost its link to the broker
      // (PeerJS won't recover a "disconnected" Peer for outbound connects).
      if (!this.peer || this.peer.destroyed || this.peer.disconnected) {
        try {
          this.peer?.destroy();
        } catch {
          /* noop */
        }
        try {
          this.peer = await openPeer();
        } catch {
          return resolve(null);
        }
      }
      const peer = this.peer;
      let done = false;
      const onErr = (err: { type?: string }) => {
        // probing a generation nobody owns -> fail this attempt instantly
        if (err?.type === 'peer-unavailable') finish(null);
      };
      const finish = (c: DataConnection | null) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try {
          peer.off('error', onErr);
        } catch {
          /* noop */
        }
        resolve(c);
      };
      peer.on('error', onErr);
      const conn = peer.connect(peerId, { reliable: true });
      const timer = setTimeout(() => {
        try {
          conn.close();
        } catch {
          /* noop */
        }
        finish(null);
      }, timeoutMs);
      conn.on('open', () => finish(conn));
      conn.on('error', () => finish(null));
    });
  }

  private adopt(conn: DataConnection): Promise<boolean> {
    return new Promise((resolve) => {
      const pc = new PeerClient(conn, this.myId);
      let welcomed = false;
      pc.onWelcome = (snap) => {
        welcomed = true;
        this.generation = snap.generation;
        this.host?.stop();
        this.host = null;
        this.client = pc;
        this.migrating = false;
        game().setRoom(snap);
        net().set({ role: 'peer', status: 'connected', code: snap.code, error: null });
        this.armPing();
        resolve(true);
      };
      pc.onSnapshot = (snap) => {
        if (snap.generation >= this.generation) {
          this.generation = snap.generation;
          game().setRoom(snap);
          net().set({ role: 'peer', status: 'connected', error: null });
        }
      };
      pc.onDial = (v, d) => game().setDial(v, d);
      pc.onReaction = (e, n) => net().pushReaction(e, n);
      pc.onPong = (rtt) => net().set({ latencyMs: rtt });
      pc.onClose = () => {
        if (this.client === pc && !this.stopped) net().set({ status: 'reconnecting' });
      };
      pc.onKick = (reason) => {
        this.leave();
        toast(reason || 'Removed by the host', 'error');
      };
      pc.hello(this.name);
      setTimeout(() => {
        if (!welcomed) resolve(false);
      }, 2000);
    });
  }

  // ---- watchdog / migration -----------------------------------------

  private armPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => this.client?.ping(), 2500);
  }

  private armWatch() {
    if (this.watch) clearInterval(this.watch);
    this.watch = setInterval(() => this.checkHost(), 1000);
  }

  private async checkHost() {
    if (this.stopped || this.host || !this.client || this.migrating) return;
    const silent = Date.now() - this.client.lastHostMsgAt;
    if (silent > HOST_SILENT_VEIL_MS && silent <= HOST_DEAD_MS) {
      if (net().status !== 'reconnecting') net().set({ status: 'reconnecting' });
    } else if (silent > HOST_DEAD_MS) {
      await this.migrate();
    }
  }

  private async migrate() {
    const state = game().room;
    if (!state || this.migrating) return;
    this.migrating = true;
    net().set({ status: 'migrating' });

    const deadHost = state.ownerClientId;
    const successor = successorId(state, deadHost) ?? this.myId;
    const nextGen = state.generation + 1;

    if (successor === this.myId) {
      // I'm the most senior survivor -> claim the next generation id.
      try {
        this.peer?.destroy();
        const prompts = await loadPrompts();
        const peer = await openPeer(hostPeerId(this.code, nextGen));
        this.peer = peer;
        this.generation = nextGen;
        this.client = null;
        this.startHost(prompts, { ...state, generation: nextGen });
        net().set({ role: 'host', status: 'connected' });
      } catch {
        net().set({ status: 'error', error: 'Lost the room. Try rejoining.' });
      } finally {
        this.migrating = false;
      }
    } else {
      // Someone else takes over — reconnect up the generation ladder.
      const ok = await this.connectToHost(nextGen, 6);
      this.migrating = false;
      if (!ok && !this.stopped) net().set({ status: 'reconnecting' });
    }
  }
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const netCtl = new Net();
