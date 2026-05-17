import type { Prompt } from './types';

// Fetched once from the static, user-editable /public/prompts.json.
// A tiny built-in fallback keeps the game playable even if the fetch fails.
const FALLBACK: Prompt[] = [
  { id: 'temp', left: 'Hot', right: 'Cold', category: 'Senses' },
  { id: 'over', left: 'Underrated', right: 'Overrated', category: 'Society' },
  { id: 'safe', left: 'Perfectly safe', right: 'Death-defying', category: 'Activities' },
  { id: 'use', left: 'Useless', right: 'Essential', category: 'Things' },
  { id: 'fun', left: 'A total chore', right: 'Pure fun', category: 'Feelings' },
];

let cache: Prompt[] | null = null;

export async function loadPrompts(): Promise<Prompt[]> {
  if (cache) return cache;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}prompts.json`, { cache: 'no-cache' });
    const data = await res.json();
    const list: Prompt[] = (data.prompts ?? []).filter(
      (p: Prompt) => p && p.id && p.left && p.right,
    );
    cache = list.length >= 3 ? list : FALLBACK;
  } catch {
    cache = FALLBACK;
  }
  return cache;
}

export function getPromptsSync(): Prompt[] {
  return cache ?? FALLBACK;
}
