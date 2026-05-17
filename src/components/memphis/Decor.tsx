// Memphis decorative layer. Layout is seeded per-client (persisted) so it
// stays roughly the same across reloads but differs between people. Density
// scales with the viewport. Motion is phase-aware: lazy drift while waiting,
// frozen during focused play so the screen isn't busy.
import { useEffect, useMemo, useState } from 'react';

const COLORS = ['#7C5CFF', '#FF8FD6', '#FF9F45', '#9BE564', '#5BC8FF', '#FFD93D', '#FF6B6B'];
type Shape = 'blob' | 'zig' | 'squiggle' | 'dots' | 'tri' | 'arc';
const KINDS: Shape[] = ['blob', 'zig', 'squiggle', 'dots', 'tri', 'arc'];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clientSeed(): number {
  let s = localStorage.getItem('freq.bgseed');
  if (!s) {
    s = String((Math.random() * 1e9) | 0);
    localStorage.setItem('freq.bgseed', s);
  }
  return Number(s);
}

function ShapeSvg({ kind, color }: { kind: Shape; color: string }) {
  const stroke = 'var(--line)';
  switch (kind) {
    case 'blob':
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <path d="M51 8c20 0 41 12 41 36 0 27-17 48-43 48S6 71 6 45 31 8 51 8Z" fill={color} stroke={stroke} strokeWidth="5" />
        </svg>
      );
    case 'zig':
      return (
        <svg viewBox="0 0 120 40" className="h-full w-full">
          <path d="M4 30 20 10 36 30 52 10 68 30 84 10 100 30 116 10" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'squiggle':
      return (
        <svg viewBox="0 0 120 40" className="h-full w-full">
          <path d="M6 20c10-22 22 22 32 0s22 22 32 0 22 22 32 0" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
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

export function MemphisBackground({ motion = 'lazy' }: { motion?: 'lazy' | 'still' }) {
  const [vw, setVw] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  const [vh, setVh] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight));
  useEffect(() => {
    const on = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const items = useMemo(() => {
    const rnd = mulberry32(clientSeed());
    // density-driven: ~1 shape per 22k px², clamped
    const count = Math.max(18, Math.min(70, Math.round((vw * vh) / 22000)));
    return Array.from({ length: count }, (_, i) => ({
      kind: KINDS[Math.floor(rnd() * KINDS.length)],
      color: COLORS[Math.floor(rnd() * COLORS.length)],
      top: rnd() * 96,
      left: rnd() * 96,
      size: 38 + rnd() * 78,
      delay: rnd() * 8,
      duration: 16 + rnd() * 16, // slow & lazy
      rotate: Math.floor(rnd() * 360),
      key: i,
    }));
  }, [vw, vh]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {items.map((it) => (
        <div
          key={it.key}
          className={`absolute opacity-70 ${motion === 'lazy' ? 'animate-drift' : ''}`}
          style={{
            top: `${it.top}%`,
            left: `${it.left}%`,
            width: it.size,
            height: it.size,
            animationDelay: `${it.delay}s`,
            animationDuration: `${it.duration}s`,
            transform: `rotate(${it.rotate}deg)`,
          }}
        >
          <ShapeSvg kind={it.kind} color={it.color} />
        </div>
      ))}
    </div>
  );
}
