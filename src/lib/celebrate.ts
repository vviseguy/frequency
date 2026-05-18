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
  // fountains spraying UP and inward from the two sides
  f({ particleCount: n, angle: 65, spread: 55, startVelocity: v, origin: { x: 0, y: 0.75 }, colors: MEMPHIS, scalar: 1.1 });
  f({ particleCount: n, angle: 115, spread: 55, startVelocity: v, origin: { x: 1, y: 0.75 }, colors: MEMPHIS, scalar: 1.1 });
  if (power === 'huge') {
    setTimeout(() => {
      f({ particleCount: 80, angle: 75, spread: 60, startVelocity: v + 8, origin: { x: 0, y: 0.85 }, colors: MEMPHIS, scalar: 1.1 });
      f({ particleCount: 80, angle: 105, spread: 60, startVelocity: v + 8, origin: { x: 1, y: 0.85 }, colors: MEMPHIS, scalar: 1.1 });
    }, 220);
  }
}
