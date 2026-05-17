// Always-mounted corner status + a friendly full-screen veil while the host
// is briefly silent or a new host is taking over.
import { AnimatePresence, motion } from 'framer-motion';
import { useMuted, toggleMute } from '../hooks/useSound';
import { useNetStore } from '../net/netStore';

export function ConnectionBadge() {
  const { role, status, latencyMs } = useNetStore();
  const muted = useMuted();
  const veil = status === 'reconnecting' || status === 'migrating';

  return (
    <>
      <div className="fixed right-2 top-2 z-50 flex items-center gap-2">
        <button
          onClick={toggleMute}
          aria-label={muted ? 'unmute' : 'mute'}
          className="grid h-9 w-9 place-items-center rounded-full border-3 border-ink bg-white text-base shadow-pop-sm"
        >
          {muted ? '🔇' : '🔊'}
        </button>
        {role !== 'none' && (
          <span className="chip bg-white text-xs">
            {role === 'host' ? '👑 Host' : '🛰️ Player'}
            {latencyMs != null && <span className="text-ink/40">{latencyMs}ms</span>}
          </span>
        )}
      </div>

      <AnimatePresence>
        {veil && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] grid place-items-center bg-cream/85 backdrop-blur-sm"
          >
            <div className="card-pop flex flex-col items-center gap-3 px-8 py-6 text-center">
              <div className="text-5xl animate-wiggle">📡</div>
              <p className="font-display text-2xl font-black">
                {status === 'migrating' ? 'Handing off the crown…' : 'Reconnecting…'}
              </p>
              <p className="max-w-xs text-sm font-bold text-ink/60">
                Hang tight — keeping the party going. The most senior player takes over
                if the host dropped.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
