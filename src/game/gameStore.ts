import { create } from 'zustand';
import { currentCard, currentSet, type RoomState } from './types';

interface GameState {
  room: RoomState | null;
  // Live dial kept off the heavy snapshot for low-latency updates.
  dialValue: number;
  dialDraggerId: string | null;

  setRoom: (r: RoomState | null) => void;
  setDial: (value: number, draggerId: string | null) => void;
}

function turnKey(r: RoomState | null): string {
  if (!r) return 'none';
  const s = currentSet(r);
  if (!s || (r.phase !== 'GUESS' && r.phase !== 'REVEAL')) return 'none';
  return `${s.index}:${s.guessIndex}`;
}

export const useGameStore = create<GameState>((set) => ({
  room: null,
  dialValue: 50,
  dialDraggerId: null,
  setRoom: (room) =>
    set((s) => {
      if (!room) return { room: null };
      const next: Partial<GameState> = { room };
      // resync the fast dial channel whenever the guessed card changes
      if (turnKey(room) !== turnKey(s.room)) {
        const card = currentCard(room);
        next.dialValue = card?.dial.value ?? 50;
        next.dialDraggerId = card?.dial.draggerId ?? null;
      }
      return next;
    }),
  setDial: (dialValue, dialDraggerId) => set({ dialValue, dialDraggerId }),
}));
