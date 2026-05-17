// The friendly full-screen veil shown while the host is briefly silent or a
// new host is taking over. (Room code lives in the header now.)
import { AnimatePresence, motion } from 'framer-motion';
import { useNetStore } from '../net/netStore';

export function ConnectionBadge() {
  const status = useNetStore((s) => s.status);
  const veil = status === 'reconnecting' || status === 'migrating';

  return (
    <AnimatePresence>
      {veil && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center backdrop-blur-sm"
          style={{ background: 'color-mix(in srgb, var(--page) 85%, transparent)' }}
        >
          <div className="card-pop flex flex-col items-center gap-3 px-8 py-6 text-center">
            <div className="animate-wiggle text-4xl font-black text-grape">~</div>
            <p className="font-display text-2xl font-black">
              {status === 'migrating' ? 'Handing off the crown…' : 'Reconnecting…'}
            </p>
            <p className="max-w-xs text-sm font-bold" style={{ color: 'var(--text-soft)' }}>
              Hang tight — the most senior player takes over if the host dropped.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
