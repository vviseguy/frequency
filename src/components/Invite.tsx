// Compact invite for the lobby: big code + share, with the QR tucked
// behind a "Show QR" button (an enlarged modal) so the lobby never has to
// scroll — on desktop or mobile.
import { AnimatePresence, motion } from 'framer-motion';
import { QrCode, Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { qrDataUrl } from '../lib/qr';
import { shareLink } from '../net/roomCode';

export function Invite({ code }: { code: string }) {
  const link = shareLink(code);
  const [qr, setQr] = useState('');
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    qrDataUrl(link).then(setQr).catch(() => {});
  }, [link]);

  const share = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: 'Frequency', text: `🎯 Join my Frequency game! Room ${code}`, url: link });
        return;
      } catch {
        /* fall through */
      }
    }
    await navigator.clipboard.writeText(link).catch(() => {});
  };

  return (
    <div className="card-pop flex flex-col items-center gap-3 px-6 py-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.2em]" style={{ color: 'var(--text-soft)' }}>
        Room code
      </p>
      <p data-testid="room-code" className="font-display text-6xl font-black leading-none tracking-[0.18em] text-grape">
        {code}
      </p>
      <div className="flex w-full gap-2">
        <button className="btn-primary flex-1 px-4 py-2 text-base" onClick={share}>
          <span className="inline-flex items-center gap-2">
            <Share2 size={18} strokeWidth={3} /> Share
          </span>
        </button>
        <button className="btn-ghost flex-1 px-4 py-2 text-base" onClick={() => setShowQr(true)}>
          <span className="inline-flex items-center gap-2">
            <QrCode size={18} strokeWidth={3} /> QR
          </span>
        </button>
      </div>

      <AnimatePresence>
        {showQr && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQr(false)}
            className="fixed inset-0 z-[75] grid place-items-center p-6 backdrop-blur-md"
            style={{ background: 'color-mix(in srgb, var(--page) 86%, transparent)' }}
          >
            <motion.div
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 240, damping: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="card-pop flex flex-col items-center gap-4 p-6"
            >
              <p className="font-display text-4xl font-black tracking-[0.18em] text-grape">{code}</p>
              {qr && (
                <img
                  src={qr}
                  alt="Scan to join"
                  className="h-64 w-64 rounded-lg border-3 border-ink p-3"
                  style={{ background: '#fff' }}
                />
              )}
              <button className="btn-ghost px-5 py-2" onClick={() => setShowQr(false)}>
                <span className="inline-flex items-center gap-2">
                  <X size={18} strokeWidth={3} /> Close
                </span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
