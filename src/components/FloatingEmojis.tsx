// Listens to the shared reaction stream: every reaction pops a sound and
// sends a burst of that emoji floating up across everyone's background.
import { useEffect, useRef, useState } from 'react';
import { playSfx } from '../hooks/useSound';
import { useNetStore } from '../net/netStore';

interface Floater {
  key: string;
  emoji: string;
  left: number;
  size: number;
  duration: number;
  drift: number;
}

export function FloatingEmojis() {
  const reactions = useNetStore((s) => s.reactions);
  const seen = useRef(new Set<number>());
  const [floaters, setFloaters] = useState<Floater[]>([]);

  useEffect(() => {
    for (const r of reactions) {
      if (seen.current.has(r.id)) continue;
      seen.current.add(r.id);
      playSfx('pop');
      const burst: Floater[] = Array.from({ length: 4 }, (_, i) => ({
        key: `${r.id}-${i}`,
        emoji: r.emoji,
        left: 8 + Math.random() * 84,
        size: 26 + Math.random() * 30,
        duration: 2.8 + Math.random() * 1.4,
        drift: -40 + Math.random() * 80,
      }));
      setFloaters((f) => [...f, ...burst]);
      const ids = new Set(burst.map((b) => b.key));
      setTimeout(() => setFloaters((f) => f.filter((x) => !ids.has(x.key))), 4600);
    }
  }, [reactions]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {floaters.map((f) => (
        <span
          key={f.key}
          className="absolute bottom-0 animate-float-up"
          style={{
            left: `${f.left}%`,
            fontSize: f.size,
            animationDuration: `${f.duration}s`,
            ['--tw-translate-x' as string]: `${f.drift}px`,
          }}
        >
          {f.emoji}
        </span>
      ))}
    </div>
  );
}
