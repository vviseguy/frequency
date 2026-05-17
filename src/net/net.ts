// Top-level P2P controller. Owns create / join / host-migration and exposes
// one tiny API to React: createRoom, joinRoom, send(intent), leave().
import type { DataConnection } from 'peerjs';
import type Peer from 'peerjs';
import { useGameStore } from '../game/gameStore';
import { loadPrompts } from '../game/prompts';
import type { RoomState } from '../game/types';
import { getClientId } from '../lib/identity';
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
        syncUrl(code);
        this.armWatch();
        return code;
      } catch (e) {
        if ((e as { type?: string })?.type === 'unavailable-id') continue; // code clash
        net().set({ status: 'error', error: 'Could not reach the matchmaking broker. Try again.' });
        throw e;
      }
    }
    net().set({ status: 'error', error: 'Could not create a room. Try again.' });
    throw new Error('room-create-failed');
  }

  async joinRoom(code: string, name: string) {
    if (this.host || this.client || net().status === 'connecting') return; // ignore dup
    this.name = name;
    this.code = code;
    this.stopped = false;
    await loadPrompts();
    net().set({ status: 'connecting', role: 'peer', code, error: null, myClientId: this.myId });
    const ok = await this.connectToHost(0, 4);
    if (!ok) {
      net().set({ status: 'error', error: `No room "${code}" found. Check the code?` });
      throw new Error('join-failed');
    }
    syncUrl(code);
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
    clearUrl();
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
    hs.addLocalPlayer(this.myId, this.name);
    hs.start();
    this.host = hs;
    this.client = null;
  }

  // ---- peer ----------------------------------------------------------

  /** Probe the generation ladder until a host answers with WELCOME. */
  private async connectToHost(fromGen: number, rounds: number): Promise<boolean> {
    for (let r = 0; r < rounds && !this.stopped; r++) {
      for (const gen of ladder(fromGen)) {
        const conn = await this.tryConnect(hostPeerId(this.code, gen));
        if (!conn) continue;
        const adopted = await this.adopt(conn);
        if (adopted) return true;
      }
      await wait(500);
    }
    return false;
  }

  private tryConnect(peerId: string): Promise<DataConnection | null> {
    return new Promise(async (resolve) => {
      if (!this.peer || this.peer.destroyed) {
        try {
          this.peer = await openPeer();
        } catch {
          return resolve(null);
        }
      }
      const conn = this.peer.connect(peerId, { reliable: true });
      const timer = setTimeout(() => {
        try {
          conn.close();
        } catch {
          /* noop */
        }
        resolve(null);
      }, 1600);
      conn.on('open', () => {
        clearTimeout(timer);
        resolve(conn);
      });
      conn.on('error', () => {
        clearTimeout(timer);
        resolve(null);
      });
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

// Keep the room in the URL so a refresh (incl. the host's) can rejoin the
// same game. clientId persists in localStorage, so you reclaim your slot.
function syncUrl(code: string) {
  try {
    history.replaceState(null, '', `${import.meta.env.BASE_URL}?room=${code}`);
  } catch {
    /* ignore */
  }
}
function clearUrl() {
  try {
    history.replaceState(null, '', import.meta.env.BASE_URL);
  } catch {
    /* ignore */
  }
}

export const netCtl = new Net();
