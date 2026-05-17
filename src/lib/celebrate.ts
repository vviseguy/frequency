import confetti from 'canvas-confetti';

const MEMPHIS = ['#7C5CFF', '#FF8FD6', '#FF9F45', '#9BE564', '#5BC8FF', '#FFD93D', '#FF6B6B'];

// Dedicated canvas pinned behind the cards but above the background blur
// (z-index -1: content is z:auto/0, the blur scrim is -5, backdrop -10).
let fire: confetti.CreateTypes | null = null;
function gun(): confetti.CreateTypes {
  if (fire) return fire;
  const c = document.createElement('canvas');
  c.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1';
  document.body.appendChild(c);
  fire = confetti.create(c, { resize: true, useWorker: true });
  return fire;
}

/** Bursts in from the upper sides + a top shower (never bottom-centre). */
export function popConfetti(power: 'small' | 'big' | 'huge' = 'big') {
  const f = gun();
  const n = power === 'small' ? 30 : power === 'big' ? 70 : 120;
  const v = power === 'huge' ? 50 : 40;
  // from the two upper sides, arcing inward
  f({ particleCount: n, angle: 300, spread: 70, startVelocity: v, origin: { x: 0, y: 0.3 }, colors: MEMPHIS, scalar: 1.1 });
  f({ particleCount: n, angle: 240, spread: 70, startVelocity: v, origin: { x: 1, y: 0.3 }, colors: MEMPHIS, scalar: 1.1 });
  if (power === 'huge') {
    setTimeout(() => {
      // a gentle shower from the top
      f({ particleCount: 90, angle: 270, spread: 120, startVelocity: 30, origin: { x: 0.5, y: 0 }, colors: MEMPHIS, scalar: 1.1 });
    }, 220);
  }
}
