// A stable per-device identity. The clientId persists across refreshes and
// host migration so a player keeps their score/seniority/slot.

const COLORS = ['#7C5CFF', '#FF8FD6', '#FF9F45', '#9BE564', '#5BC8FF', '#FFD93D', '#FF6B6B'];

// A grab-bag of playful defaults — critters, snacks, and characters — for
// some personality. (🎈 stays the generic fallback emoji, see defaultEmoji.)
const SUGGESTIONS = [
  '🦊 Fox',
  '🐙 Octopus',
  '🦩 Flamingo',
  '🐢 Turtle',
  '🦔 Hedgehog',
  '🐬 Dolphin',
  '🦦 Otter',
  '🦄 Unicorn',
  '🦥 Sloth',
  '🐼 Panda',
  '🐸 Frog',
  '🦜 Parrot',
  '🐝 Bee',
  '🐲 Dragon',
  '🦕 Dino',
  '🐳 Whale',
  '🌮 Taco',
  '🍕 Pizza',
  '🍩 Donut',
  '🥑 Avocado',
  '🍄 Mushroom',
  '🫐 Blueberry',
  '👻 Ghost',
  '🤖 Robot',
  '👽 Alien',
  '🧙 Wizard',
  '🥷 Ninja',
  '🦸 Hero',
  '🤠 Cowboy',
  '🧛 Vampire',
  '🪐 Cosmo',
  '⚡ Bolt',
  '🌵 Cactus',
  '🐉 Noodle',
  '🦖 Rexy',
  '🧊 Chill',
];

/** A fresh random suggestion (not persisted). */
export function randomName(exclude?: string): string {
  let pick = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];
  if (exclude && SUGGESTIONS.length > 1) {
    while (pick === exclude) pick = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];
  }
  return pick;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getClientId(): string {
  let id = localStorage.getItem('freq.clientId');
  if (!id) {
    id = uuid();
    localStorage.setItem('freq.clientId', id);
  }
  return id;
}

export function getSavedName(): string {
  const saved = localStorage.getItem('freq.name');
  if (saved) return saved;
  const pick = randomName();
  localStorage.setItem('freq.name', pick);
  return pick;
}

export function saveName(name: string) {
  localStorage.setItem('freq.name', name.slice(0, 18));
}

export function defaultEmoji(name: string): string {
  const m = name.match(/\p{Emoji}/u);
  return m ? m[0] : '🎈';
}

/** Deterministic color from clientId so a player keeps it across reconnects. */
export function colorFor(clientId: string): string {
  let h = 0;
  for (let i = 0; i < clientId.length; i++) h = (h * 31 + clientId.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

// Remember the last room so we can offer a one-tap rejoin.
export function rememberRoom(code: string) {
  localStorage.setItem('freq.lastRoom', code);
}
export function lastRoom(): string | null {
  return localStorage.getItem('freq.lastRoom');
}

// Remember that we *hosted* a room, so a refresh that can't find the old
// game can quietly spin up a fresh waiting room instead of dumping home.
export function markHosted(code: string) {
  localStorage.setItem('freq.hostedRoom', code);
}
export function wasHostOf(code: string): boolean {
  return localStorage.getItem('freq.hostedRoom') === code;
}
