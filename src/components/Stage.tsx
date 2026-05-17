import type { ReactNode } from 'react';
import { Menu } from './Menu';
import { RoomCode } from './RoomCode';
import { MemphisBackground } from './memphis/Decor';

/**
 * Mobile-first frame. The document doesn't scroll — this inner container
 * does — so the fixed Memphis backdrop never jumps on phones. A blurred
 * scrim always calms the background; in `focus` mode it also freezes.
 * Content is vertically centred so the title never hugs the top.
 */
export function Stage({ children, focus = false }: { children: ReactNode; focus?: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <MemphisBackground motion={focus ? 'still' : 'lazy'} />
      <div
        className="pointer-events-none fixed inset-0 -z-[5] backdrop-blur-[3px]"
        style={{ background: `color-mix(in srgb, var(--page) ${focus ? 62 : 48}%, transparent)` }}
        aria-hidden
      />

      <div className="relative h-full overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 sm:px-7">
          <header
            className="sticky top-0 z-50 flex items-center justify-between gap-3"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.85rem)', paddingBottom: '0.6rem' }}
          >
            <Menu />
            <RoomCode />
          </header>

          {/* my-auto centres short screens but never clips tall ones */}
          <main
            className="flex flex-1 flex-col"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
          >
            <div className="my-auto flex w-full flex-col">{children}</div>
          </main>
        </div>
      </div>
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
      <span className={`ml-2 inline-block ${small ? 'text-2xl' : 'text-4xl'}`}>📡</span>
    </h1>
  );
}
