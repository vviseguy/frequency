// A small animated walkthrough that demos the real Dial. Reused by the
// in-game INTRO and the menu's "How to play" (no more GitHub link).
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BANDS } from '../game/types';
import { Dial } from './Dial';

interface Step {
  title: string;
  body: string;
  left: string;
  right: string;
  target: number;
  script: number[]; // pointer positions the demo cycles through
  bands?: boolean;
  badge?: string;
}

const STEPS: Step[] = [
  {
    title: '1 · Write a clue',
    body: 'You get a secret spot on a weird scale. Write a short clue that points right at it.',
    left: 'Overrated',
    right: 'Underrated',
    target: 73,
    script: [50, 73],
  },
  {
    title: '2 · Guess together',
    body: 'Everyone hunts for each clue’s spot, then locks in. No timer to write — only to guess.',
    left: 'Cold',
    right: 'Hot',
    target: 38,
    script: [60, 28, 45, 38],
  },
  {
    title: '3 · Score it',
    body: 'Closer = more points. The bullseye is worth 4, and the clue-giver earns a bonus too.',
    left: 'Boring',
    right: 'Iconic',
    target: 62,
    script: [62],
    bands: true,
    badge: '+4',
  },
];

export function HowToPlay({
  onClose,
  onDone,
  doneLabel,
  note,
}: {
  onClose?: () => void; // menu modal: show a Close button + overlay
  onDone?: () => void; // intro: primary CTA on the last step
  doneLabel?: string;
  note?: string; // e.g. non-host "host is starting…"
}) {
  const [step, setStep] = useState(0);
  const [tick, setTick] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  // cycle the demo pointer along the step's scripted path
  useEffect(() => {
    setTick(0);
    if (s.script.length < 2) return;
    const id = setInterval(() => setTick((t) => t + 1), 1100);
    return () => clearInterval(id);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // gently auto-advance the steps (stops on the last one)
  useEffect(() => {
    if (last) return;
    const id = setTimeout(() => setStep((x) => x + 1), 6000);
    return () => clearTimeout(id);
  }, [step, last]);

  const value = s.script[tick % s.script.length];

  const inner = (
    <div className="card-pop flex flex-col gap-4 p-5">
      <h2 className="font-display text-2xl font-black">{s.title}</h2>

      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <Dial
              value={value}
              target={s.bands ? s.target : undefined}
              showBands={s.bands}
              pointer
              bands={BANDS}
              leftLabel={s.left}
              rightLabel={s.right}
            />
          </motion.div>
        </AnimatePresence>
        {s.badge && (
          <motion.div
            key={`badge-${step}`}
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 280, damping: 9 }}
            className="absolute right-2 top-0 rounded-full border-3 border-ink bg-sun px-3 py-1 font-display text-xl font-black text-ink shadow-pop-sm"
          >
            {s.badge}
          </motion.div>
        )}
      </div>

      <p className="min-h-[3rem] font-bold leading-tight" style={{ color: 'var(--text-soft)' }}>
        {s.body}
      </p>

      <div className="flex items-center justify-between">
        <button
          aria-label="previous"
          disabled={step === 0}
          onClick={() => setStep((x) => Math.max(0, x - 1))}
          className="grid h-9 w-9 place-items-center rounded-full border-3 border-ink bg-white shadow-pop-sm disabled:opacity-30"
        >
          <ChevronLeft size={18} strokeWidth={3} />
        </button>

        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-full border-2 border-ink"
              style={{ background: i === step ? '#7C5CFF' : 'var(--surface)' }}
            />
          ))}
        </div>

        <button
          aria-label="next"
          disabled={last}
          onClick={() => setStep((x) => Math.min(STEPS.length - 1, x + 1))}
          className="grid h-9 w-9 place-items-center rounded-full border-3 border-ink bg-white shadow-pop-sm disabled:opacity-30"
        >
          <ChevronRight size={18} strokeWidth={3} />
        </button>
      </div>
    </div>
  );

  const actions = (
    <div className="flex flex-col gap-2">
      {onDone &&
        (last ? (
          <button className="btn-primary w-full text-2xl" data-testid="howto-done" onClick={onDone}>
            {doneLabel ?? 'Let’s play!'}
          </button>
        ) : (
          <button className="btn-ghost w-full" onClick={() => setStep(STEPS.length - 1)}>
            Skip
          </button>
        ))}
      {onClose && (
        <button className="btn-primary w-full" data-testid="howto-close" onClick={onClose}>
          Got it
        </button>
      )}
      {note && (
        <p className="text-center font-display font-extrabold" style={{ color: 'var(--text-soft)' }}>
          {note}
        </p>
      )}
    </div>
  );

  if (onClose) {
    return (
      <motion.div
        className="fixed inset-0 z-[70] flex flex-col items-center overflow-y-auto p-5 backdrop-blur-md"
        style={{ background: 'color-mix(in srgb, var(--page) 86%, transparent)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4">
          {inner}
          {actions}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {inner}
      {actions}
    </div>
  );
}
