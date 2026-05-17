// Memphis-design decorative layer: pastel squiggles, zigzags, dots and
// geometric confetti shapes that gently drift behind everything.
import { useMemo } from 'react';

const COLORS = ['#7C5CFF', '#FF8FD6', '#FF9F45', '#9BE564', '#5BC8FF', '#FFD93D', '#FF6B6B'];

type Shape = 'blob' | 'zig' | 'squiggle' | 'dots' | 'tri' | 'arc';

function ShapeSvg({ kind, color }: { kind: Shape; color: string }) {
  const stroke = '#1A1626';
  switch (kind) {
    case 'blob':
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <path
            d="M51 8c20 0 41 12 41 36 0 27-17 48-43 48S6 71 6 45 31 8 51 8Z"
            fill={color}
            stroke={stroke}
            strokeWidth="5"
          />
        </svg>
      );
    case 'zig':
      return (
        <svg viewBox="0 0 120 40" className="h-full w-full">
          <path
            d="M4 30 20 10 36 30 52 10 68 30 84 10 100 30 116 10"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'squiggle':
      return (
        <svg viewBox="0 0 120 40" className="h-full w-full">
          <path
            d="M6 20c10-22 22 22 32 0s22 22 32 0 22 22 32 0"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'dots':
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full">
          {[20, 50, 80].map((y) =>
            [20, 50, 80].map((x) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="8" fill={color} stroke={stroke} strokeWidth="3" />
            )),
          )}
        </svg>
      );
    case 'tri':
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <path d="M50 8 92 86 8 86Z" fill={color} stroke={stroke} strokeWidth="5" strokeLinejoin="round" />
        </svg>
      );
    case 'arc':
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <path d="M10 90 A80 80 0 0 1 90 90 Z" fill={color} stroke={stroke} strokeWidth="5" strokeLinejoin="round" />
        </svg>
      );
  }
}

const KINDS: Shape[] = ['blob', 'zig', 'squiggle', 'dots', 'tri', 'arc'];

/** Full-screen, non-interactive, drifting decoration. */
export function MemphisBackground({ density = 9 }: { density?: number }) {
  const items = useMemo(() => {
    return Array.from({ length: density }, (_, i) => ({
      kind: KINDS[i % KINDS.length],
      color: COLORS[(i * 3) % COLORS.length],
      top: `${(i * 53 + 7) % 92}%`,
      left: `${(i * 37 + 5) % 92}%`,
      size: 44 + ((i * 29) % 70),
      delay: `${(i % 6) * 0.7}s`,
      duration: `${8 + (i % 5) * 1.7}s`,
      rotate: (i * 47) % 360,
    }));
  }, [density]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {items.map((it, i) => (
        <div
          key={i}
          className="absolute opacity-70 animate-drift"
          style={{
            top: it.top,
            left: it.left,
            width: it.size,
            height: it.size,
            animationDelay: it.delay,
            animationDuration: it.duration,
            transform: `rotate(${it.rotate}deg)`,
          }}
        >
          <ShapeSvg kind={it.kind} color={it.color} />
        </div>
      ))}
    </div>
  );
}
