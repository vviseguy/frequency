// Host-migration math. Every peer caches the last snapshot, so when the
// host goes silent each peer independently computes the SAME successor with
// zero negotiation: the most-senior connected player who isn't the dead host.
import type { RoomState } from '../game/types';

export const HOST_SILENT_VEIL_MS = 4500; // show "reconnecting…" after this
export const HOST_DEAD_MS = 8000; // trigger migration after this
export const LADDER_SPAN = 5; // probe this many generations upward

/** clientId that should become the next host, or null if unknowable. */
export function successorId(state: RoomState, deadHostId: string): string | null {
  const candidates = state.players
    .filter((p) => p.connected && p.clientId !== deadHostId)
    .sort((a, b) => a.joinedAt - b.joinedAt);
  return candidates[0]?.clientId ?? null;
}

/** Generations a re-joining peer should probe, current first then upward. */
export function ladder(currentGen: number): number[] {
  const g: number[] = [];
  for (let i = 0; i <= LADDER_SPAN; i++) g.push(currentGen + i);
  return g;
}
