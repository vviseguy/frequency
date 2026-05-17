// rAF-gated throttle: coalesces rapid calls (e.g. pointer move / dial
// broadcast) to at most one per animation frame, always keeping the latest.

export function rafThrottle<A extends unknown[]>(fn: (...args: A) => void) {
  let queued: A | null = null;
  let scheduled = false;
  const flush = () => {
    scheduled = false;
    if (queued) {
      const args = queued;
      queued = null;
      fn(...args);
    }
  };
  const throttled = (...args: A) => {
    queued = args;
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(flush);
    }
  };
  throttled.cancel = () => {
    queued = null;
    scheduled = false;
  };
  return throttled;
}

/** Time-based throttle that always fires a trailing call. */
export function throttleMs<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: A | null = null;
  return (...args: A) => {
    const now = Date.now();
    const remaining = ms - (now - last);
    pending = args;
    if (remaining <= 0) {
      last = now;
      fn(...args);
      pending = null;
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        if (pending) fn(...pending);
        pending = null;
      }, remaining);
    }
  };
}
