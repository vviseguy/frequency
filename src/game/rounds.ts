import type { Player, Prompt, Round, RoomState } from './types';

/** Next psychic: round-robin by seniority, skipping disconnected players. */
export function nextPsychic(state: RoomState, prevPsychicId: string | null): string {
  const order = [...state.players].filter((p) => p.connected).sort((a, b) => a.joinedAt - b.joinedAt);
  if (order.length === 0) return state.players[0]?.clientId ?? '';
  if (!prevPsychicId) return order[0].clientId;
  const idx = order.findIndex((p) => p.clientId === prevPsychicId);
  return order[(idx + 1) % order.length].clientId;
}

function pickPrompt(prompts: Prompt[], history: Round[]): Prompt {
  const used = new Set(history.slice(-12).map((r) => r.prompt.id));
  const fresh = prompts.filter((p) => !used.has(p.id));
  const pool = fresh.length ? fresh : prompts;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Build a new round. Target stays away from the extreme edges so it's fair. */
export function makeRound(
  state: RoomState,
  prompts: Prompt[],
  index: number,
  psychicId: string,
): Round {
  return {
    index,
    psychicClientId: psychicId,
    prompt: pickPrompt(prompts, state.history),
    target: 8 + Math.floor(Math.random() * 85), // 8..92
    clue: null,
    voided: false,
    dial: { value: 50, draggerId: null },
    ready: {},
    results: null,
  };
}

/** Non-psychic, connected players whose "ready" gates the reveal. */
export function guessers(state: RoomState): Player[] {
  if (!state.round) return [];
  return state.players.filter(
    (p) => p.connected && p.clientId !== state.round!.psychicClientId,
  );
}

export function allReady(state: RoomState): boolean {
  const g = guessers(state);
  if (g.length === 0) return false;
  return g.every((p) => state.round?.ready[p.clientId]);
}
