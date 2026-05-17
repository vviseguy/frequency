import type { ReactNode } from 'react';
import { MemphisBackground } from './memphis/Decor';

/**
 * Mobile-first page frame. A soft blurred scrim always sits between the
 * drifting Memphis backdrop and the content, so the screen reads calm
 * everywhere. In `focus` mode (active play) the background also freezes.
 */
export function Stage({ children, focus = false }: { children: ReactNode; focus?: boolean }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center px-4 py-5">
      <MemphisBackground motion={focus ? 'still' : 'lazy'} />
      <div
        className="pointer-events-none fixed inset-0 -z-[5] backdrop-blur-[3px]"
        style={{
          background: `color-mix(in srgb, var(--page) ${focus ? 62 : 48}%, transparent)`,
        }}
        aria-hidden
      />
      <div className="flex w-full max-w-md flex-1 flex-col">{children}</div>
    </div>
  );
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <h1
      className={`font-display text-center font-black leading-none ${
        small ? 'text-4xl' : 'text-6xl'
      }`}
    >
      <span className="inline-block -rotate-2 text-grape">FREQ</span>
      <span className="inline-block rotate-2 text-coral">UEN</span>
      <span className="inline-block -rotate-1 text-tangerine">CY</span>
    </h1>
  );
}
