import type { ReactNode } from 'react';
import { MemphisBackground } from './memphis/Decor';

/**
 * Mobile-first page frame. In `focus` mode (active play) the background
 * freezes and a soft scrim lifts the content onto its own calm pane so the
 * screen never feels busy. While waiting, the background drifts lazily.
 */
export function Stage({ children, focus = false }: { children: ReactNode; focus?: boolean }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center px-4 py-5">
      <MemphisBackground motion={focus ? 'still' : 'lazy'} />
      {focus && (
        <div
          className="pointer-events-none fixed inset-0 -z-[5] backdrop-blur-[3px]"
          style={{ background: 'color-mix(in srgb, var(--page) 62%, transparent)' }}
          aria-hidden
        />
      )}
      <div className="flex w-full max-w-md flex-1 flex-col">{children}</div>
    </div>
  );
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <h1
      className={`font-display text-center font-black leading-none ${
        small ? 'text-3xl' : 'text-6xl'
      }`}
    >
      <span className="inline-block -rotate-2 text-grape">FREQ</span>
      <span className="inline-block rotate-2 text-coral">UEN</span>
      <span className="inline-block -rotate-1 text-tangerine">CY</span>
      {!small && <span className="ml-1 inline-block text-3xl">📡</span>}
    </h1>
  );
}
