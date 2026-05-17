import { Check, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { qrDataUrl } from '../lib/qr';
import { shareLink } from '../net/roomCode';

/** One cohesive invite card: code + QR + share, no scattered pieces. */
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
        await nav.share({ title: 'Frequency', text: `Join my game — code ${code}`, url: link });
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
    <div className="card-pop flex items-center gap-4 p-4">
      {qr && (
        <img
          src={qr}
          alt="Scan to join"
          className="h-28 w-28 shrink-0 rounded-xl border-3 border-ink"
          style={{ background: '#fff' }}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: 'var(--text-soft)' }}>
          Room code
        </p>
        <p
          data-testid="room-code"
          className="font-display text-5xl font-black leading-none tracking-[0.15em] text-grape"
        >
          {code}
        </p>
        <button className="btn-primary mt-1 w-full px-3 py-2 text-base" onClick={share}>
          <span className="inline-flex items-center gap-2">
            {copied ? <Check size={18} strokeWidth={3} /> : <Share2 size={18} strokeWidth={3} />}
            {copied ? 'Link copied!' : 'Share invite'}
          </span>
        </button>
      </div>
    </div>
  );
}
