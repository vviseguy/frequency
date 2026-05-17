// Room code <-> PeerJS id. The host's peer id is FULLY DETERMINED by the
// room code + generation, so any device can reach the current host with no
// directory service. Host migration just increments the generation.

const NS = 'freqv1';
// Ambiguity-free alphabet (no I/O/0/1) -> codes are easy to read aloud.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function genRoomCode(): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
}

export function isValidCode(code: string): boolean {
  return /^[A-Z]{4}$/.test(code) && [...code].every((c) => ALPHABET.includes(c));
}

/** The canonical host peer id for a code at a given migration generation. */
export function hostPeerId(code: string, generation = 0): string {
  return `${NS}-${code.toUpperCase()}-g${generation}`;
}

export function shareLink(code: string): string {
  const base = `${location.origin}${import.meta.env.BASE_URL}`;
  return `${base}?room=${code}`;
}

export function roomFromUrl(): string | null {
  const p = new URLSearchParams(location.search).get('room');
  return p && isValidCode(normalizeCode(p)) ? normalizeCode(p) : null;
}
