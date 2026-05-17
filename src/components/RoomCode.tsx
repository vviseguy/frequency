// Header room-code button. Tap to share/copy the invite with a peppy blurb.
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useNetStore } from '../net/netStore';
import { shareLink } from '../net/roomCode';

export function RoomCode() {
  const code = useNetStore((s) => s.code);
  const [copied, setCopied] = useState(false);
  if (!code) return null;

  const link = shareLink(code);
  const blurb = `🎯 Join my Frequency game! Room ${code} → ${link}`;

  const onClick = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: 'Frequency', text: blurb, url: link });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(blurb);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      onClick={onClick}
      aria-label="copy invite"
      className="flex h-11 items-center gap-2 rounded-full border-3 border-ink bg-white px-4
        font-display font-extrabold shadow-pop-sm"
    >
      <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-soft)' }}>
        room
      </span>
      <span className="text-lg tracking-[0.15em] text-grape">{code}</span>
      {copied ? (
        <Check size={18} strokeWidth={3} className="text-lime" />
      ) : (
        <Copy size={18} strokeWidth={2.5} />
      )}
    </button>
  );
}
