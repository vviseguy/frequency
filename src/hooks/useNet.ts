// Convenience selectors so screens stay tiny.
import { useGameStore } from '../game/gameStore';
import { playerById, seniorPlayer, type RoomState } from '../game/types';
import { netCtl } from '../net/net';
import { useNetStore } from '../net/netStore';
import type { C2H } from '../net/protocol';

export function useRoom(): RoomState | null {
  return useGameStore((s) => s.room);
}

export function useMyId(): string {
  return useNetStore((s) => s.myClientId);
}

export function useMe() {
  const room = useRoom();
  const id = useMyId();
  return room ? playerById(room, id) : undefined;
}

export function useIsHost(): boolean {
  const room = useRoom();
  const id = useMyId();
  return !!room && room.ownerClientId === id;
}

export function useIsSenior(): boolean {
  const room = useRoom();
  const id = useMyId();
  return !!room && seniorPlayer(room.players)?.clientId === id;
}

export function send(intent: C2H) {
  netCtl.send(intent);
}

export { netCtl };
