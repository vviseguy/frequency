import { create } from 'zustand';

export type Role = 'none' | 'host' | 'peer';
export type Status =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting' // host silent — showing the grace veil
  | 'migrating' // we are becoming / finding the new host
  | 'error';

export interface ReactionEvent {
  id: number;
  emoji: string;
  fromName: string;
}

interface NetState {
  role: Role;
  status: Status;
  code: string | null;
  myClientId: string;
  error: string | null;
  latencyMs: number | null;
  /** transient reaction bursts other clients can render */
  reactions: ReactionEvent[];

  set: (p: Partial<NetState>) => void;
  pushReaction: (emoji: string, fromName: string) => void;
  reset: () => void;
}

let reactionSeq = 1;

export const useNetStore = create<NetState>((set) => ({
  role: 'none',
  status: 'idle',
  code: null,
  myClientId: '',
  error: null,
  latencyMs: null,
  reactions: [],

  set: (p) => set(p),
  pushReaction: (emoji, fromName) =>
    set((s) => {
      const id = reactionSeq++;
      // auto-expire after the float animation
      setTimeout(() => {
        useNetStore.setState((st) => ({ reactions: st.reactions.filter((r) => r.id !== id) }));
      }, 3600);
      return { reactions: [...s.reactions, { id, emoji, fromName }] };
    }),
  reset: () =>
    set({ role: 'none', status: 'idle', code: null, error: null, latencyMs: null, reactions: [] }),
}));
