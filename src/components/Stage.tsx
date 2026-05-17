import type { ReactNode } from 'react';
import { MemphisBackground } from './memphis/Decor';

/** Centered, mobile-first page frame with the drifting Memphis backdrop. */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center px-4 py-5">
      <MemphisBackground />
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
