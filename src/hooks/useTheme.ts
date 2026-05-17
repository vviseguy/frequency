import { useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';
const listeners = new Set<() => void>();

function initial(): Theme {
  const saved = localStorage.getItem('freq.theme') as Theme | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

let theme: Theme = typeof window === 'undefined' ? 'light' : initial();

function apply() {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
if (typeof window !== 'undefined') apply();

export function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('freq.theme', theme);
  apply();
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => theme,
  );
}
