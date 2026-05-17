// Countdown driven by an absolute deadline so it stays correct across
// host migration / brief disconnects.
import { useEffect, useState } from 'react';

export function Timer({ endsAt, total }: { endsAt: number | null; total: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  if (endsAt == null) return null;
  const remaining = Math.max(0, endsAt - now);
  const secs = Math.ceil(remaining / 1000);
  const frac = total > 0 ? Math.max(0, Math.min(1, remaining / (total * 1000))) : 0;
  const R = 26;
  const C = 2 * Math.PI * R;
  const low = secs <= 5;

  return (
    <div className={`relative h-16 w-16 ${low ? 'animate-wiggle' : ''}`} aria-label={`${secs} seconds left`}>
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={R} fill="white" stroke="#1A1626" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          stroke={low ? '#FF6B6B' : '#7C5CFF'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 0.2s linear' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-extrabold">
        {secs}
      </span>
    </div>
  );
}
