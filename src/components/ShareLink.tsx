import { useEffect, useState } from 'react';
import { qrDataUrl } from '../lib/qr';
import { shareLink } from '../net/roomCode';

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
    <div className="flex flex-col items-center gap-3">
      <div className="card-pop px-6 py-3 text-center">
        <p className="text-xs font-extrabold uppercase tracking-widest text-ink/50">Room code</p>
        <p className="font-display text-5xl font-black tracking-[0.2em] text-grape">{code}</p>
      </div>
      {qr && (
        <img
          src={qr}
          alt="Scan to join"
          className="h-36 w-36 rounded-2xl border-3 border-ink bg-white p-2 shadow-pop"
        />
      )}
      <button className="btn-primary" onClick={share}>
        {copied ? '✓ Link copied!' : '🔗 Share invite'}
      </button>
    </div>
  );
}
