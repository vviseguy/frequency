import { motion } from 'framer-motion';
import { COOP_TIERS, coopTier } from '../game/types';

const SEG = ['#FF6B6B', '#FF9F45', '#FFD93D', '#9BE564', '#7C5CFF'];

/** Thick 5-tier team meter: 0 .. max possible points. */
export function CoopMeter({ total, max, big }: { total: number; max: number; big?: boolean }) {
  const pct = max > 0 ? Math.min(100, (total / max) * 100) : 0;
  const tier = coopTier(total, max);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative w-full overflow-hidden rounded-full border-3 border-ink ${big ? 'h-9' : 'h-6'}`}
      >
        <div className="absolute inset-0 flex">
          {SEG.map((c, i) => (
            <div
              key={i}
              className="h-full flex-1"
              style={{ background: c, opacity: 0.28, borderRight: i < 4 ? '2px solid var(--line)' : 'none' }}
            />
          ))}
        </div>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: SEG[tier] }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        />
      </div>
      <p className={`font-display font-black ${big ? 'text-2xl' : 'text-lg'}`}>
        {total} / {max} · <span className="text-grape">{COOP_TIERS[tier]}</span>
      </p>
    </div>
  );
}
