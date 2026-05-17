import { Check, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { qrDataUrl } from '../lib/qr';
import { shareLink } from '../net/roomCode';

/** Big scannable invite for the lobby. */
export function ShareLink({ code }: { code: string }) {
  const link = shareLink(code);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

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
        /* fell through to copy */
      }
    }
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="card-pop flex flex-col items-center gap-5 px-8 py-7">
      <div className="text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em]" style={{ color: 'var(--text-soft)' }}>
          Room code
        </p>
        <p
          data-testid="room-code"
          className="font-display text-6xl font-black leading-tight tracking-[0.18em] text-grape"
        >
          {code}
        </p>
      </div>

      {qr && (
        <img
          src={qr}
          alt="Scan to join"
          className="h-48 w-48 rounded-lg border-3 border-ink p-3"
          style={{ background: '#fff' }}
        />
      )}

      <button className="btn-primary w-full px-6 py-3" onClick={share}>
        <span className="inline-flex items-center gap-2">
          {copied ? <Check size={20} strokeWidth={3} /> : <Share2 size={20} strokeWidth={3} />}
          {copied ? 'Link copied!' : 'Share invite'}
        </span>
      </button>
    </div>
  );
}
