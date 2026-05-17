import type { PackMeta, Prompt } from './types';

// Prompts live as versioned topic packs under /public/prompts/:
//   prompts/index.json   -> { version, packs: ["senses", "food-drink", ...] }
//   prompts/<id>.json    -> { name, emoji, version, prompts: [{left,right}, ...] }
// IDs are derived (pack + index) so editing a pack is just adding a line.

export interface Catalog {
  packs: PackMeta[];
  prompts: Prompt[];
}

const FALLBACK: Catalog = {
  packs: [{ id: 'core', name: 'Core', emoji: '🎯', count: 5, version: 1 }],
  prompts: [
    { id: 'core:0', left: 'Hot', right: 'Cold', category: 'Core', pack: 'core' },
    { id: 'core:1', left: 'Underrated', right: 'Overrated', category: 'Core', pack: 'core' },
    { id: 'core:2', left: 'Perfectly safe', right: 'Death-defying', category: 'Core', pack: 'core' },
    { id: 'core:3', left: 'Useless', right: 'Essential', category: 'Core', pack: 'core' },
    { id: 'core:4', left: 'A total chore', right: 'Pure fun', category: 'Core', pack: 'core' },
  ],
};

let cache: Catalog | null = null;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`fetch ${path} ${res.status}`);
  return res.json();
}

export async function loadCatalog(): Promise<Catalog> {
  if (cache) return cache;
  try {
    const index = await fetchJson<{ packs: string[] }>('prompts/index.json');
    const ids = index.packs ?? [];
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetchJson<{ name: string; emoji: string; version: number; prompts: { left: string; right: string }[] }>(
          `prompts/${id}.json`,
        ).then((p) => ({ id, ...p })),
      ),
    );

    const packs: PackMeta[] = [];
    const prompts: Prompt[] = [];
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const pk = r.value;
      const list = (pk.prompts ?? []).filter((q) => q && q.left && q.right);
      if (!list.length) continue;
      packs.push({
        id: pk.id,
        name: pk.name ?? pk.id,
        emoji: pk.emoji ?? '🎲',
        count: list.length,
        version: pk.version ?? 1,
      });
      list.forEach((q, i) =>
        prompts.push({
          id: `${pk.id}:${i}`,
          left: q.left,
          right: q.right,
          category: pk.name ?? pk.id,
          pack: pk.id,
        }),
      );
    }
    cache = packs.length ? { packs, prompts } : FALLBACK;
  } catch {
    cache = FALLBACK;
  }
  return cache;
}

/** Flat list of every prompt (host passes this into the reducer). */
export async function loadPrompts(): Promise<Prompt[]> {
  return (await loadCatalog()).prompts;
}

export function getCatalogSync(): Catalog {
  return cache ?? FALLBACK;
}

/** Prompts limited to the selected packs ([] = all). */
export function promptsForPacks(prompts: Prompt[], packs: string[]): Prompt[] {
  if (!packs.length) return prompts;
  const set = new Set(packs);
  const filtered = prompts.filter((p) => p.pack && set.has(p.pack));
  return filtered.length ? filtered : prompts;
}
