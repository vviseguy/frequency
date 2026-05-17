// Keep the host's screen awake so the room doesn't stall when their phone
// would otherwise sleep. Re-acquired whenever the tab becomes visible again.
import { useEffect } from 'react';

export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          lock = await (navigator as Navigator & {
            wakeLock: { request: (t: 'screen') => Promise<WakeLockSentinel> };
          }).wakeLock.request('screen');
        }
      } catch {
        /* not supported / denied — host nudge in the UI covers this */
      }
    };

    const onVis = () => {
      if (document.visibilityState === 'visible' && !cancelled) acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
