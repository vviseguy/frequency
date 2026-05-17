export type Points = 0 | 2 | 3 | 4;

export interface Bands {
  bullseye: number;
  close: number;
  somewhat: number;
}

/** Distance of the team's guess from the hidden target -> points. */
export function scoreFor(dial: number, target: number, bands: Bands): Points {
  const delta = Math.abs(dial - target);
  if (delta <= bands.bullseye) return 4;
  if (delta <= bands.close) return 3;
  if (delta <= bands.somewhat) return 2;
  return 0;
}

export function scoreLabel(points: Points): string {
  switch (points) {
    case 4:
      return 'BULLSEYE!';
    case 3:
      return 'So close!';
    case 2:
      return 'Not bad!';
    default:
      return 'Way off…';
  }
}

export function scoreBlurb(points: Points): string {
  const pools: Record<Points, string[]> = {
    4: ['Are you reading minds?!', 'Absolute legend.', 'Dead center. Chef’s kiss.'],
    3: ['So close it hurts (the good kind).', 'Almost telepathic.', 'You felt that one.'],
    2: ['In the neighborhood!', 'We’ll take it.', 'Not bad, not bad.'],
    0: ['Total whiff 😬', 'Bold strategy.', 'The wavelength was… elsewhere.'],
  };
  const p = pools[points];
  return p[Math.floor(Math.random() * p.length)];
}
