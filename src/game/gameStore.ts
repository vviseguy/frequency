import { create } from 'zustand';
import type { RoomState } from './types';

interface GameState {
  room: RoomState | null;
  /** Live dial value, kept off the heavy snapshot for low-latency updates. */
  dialValue: number;
  dialDraggerId: string | null;

  setRoom: (r: RoomState | null) => void;
  setDial: (value: number, draggerId: string | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  room: null,
  dialValue: 50,
  dialDraggerId: null,
  setRoom: (room) =>
    set((s) => {
      if (!room) return { room: null };
      // keep the fast dial channel authoritative unless a fresher round arrives
      const next: Partial<GameState> = { room };
      if (room.round && (!s.room?.round || s.room.round.index !== room.round.index)) {
        next.dialValue = room.round.dial.value;
        next.dialDraggerId = room.round.dial.draggerId;
      }
      return next;
    }),
  setDial: (dialValue, dialDraggerId) => set({ dialValue, dialDraggerId }),
}));
