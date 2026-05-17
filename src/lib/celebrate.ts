import confetti from 'canvas-confetti';

const MEMPHIS = ['#7C5CFF', '#FF8FD6', '#FF9F45', '#9BE564', '#5BC8FF', '#FFD93D', '#FF6B6B'];

export function popConfetti(power: 'small' | 'big' | 'huge' = 'big') {
  const count = power === 'small' ? 40 : power === 'big' ? 120 : 220;
  confetti({
    particleCount: count,
    spread: power === 'huge' ? 130 : 80,
    startVelocity: power === 'huge' ? 55 : 42,
    origin: { y: 0.6 },
    colors: MEMPHIS,
    scalar: 1.1,
  });
  if (power === 'huge') {
    setTimeout(() => confetti({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0 }, colors: MEMPHIS }), 180);
    setTimeout(() => confetti({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1 }, colors: MEMPHIS }), 320);
  }
}
