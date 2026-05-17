// Tiny toast store. `toast(msg)` from anywhere; <Toaster/> renders them.
import { useSyncExternalStore } from 'react';

export type ToastKind = 'error' | 'info' | 'success';
export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

let toasts: Toast[] = [];
let seq = 1;
const listeners = new Set<() => void>();

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  listeners.forEach((l) => l());
}

export function toast(message: string, kind: ToastKind = 'error', ms = 3000) {
  const id = seq++;
  toasts = [...toasts, { id, message, kind }];
  listeners.forEach((l) => l());
  setTimeout(() => dismissToast(id), ms);
  return id;
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => toasts,
    () => toasts,
  );
}
