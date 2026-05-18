// An animated walkthrough that demos the real Dial. Reused by the in-game
// INTRO and the menu's "How to play". Each step plays a short progressive
// animation (no repetitive loop): a clue being aimed, the group dragging
// and second-guessing, then the score landing.
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MousePointer2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BANDS } from '../game/types';
import { Dial } from './Dial';
import { MemphisBackground } from './memphis/Decor';

interface Frame {
  at: number; // ms after the step starts
  value: number;
  thought?: string; // a little "thinking out loud" bubble (step 2)
}
interface Step {
  title: string;
  body: string;
  left: string;
  right: string;
  start: number;
  timeline: Frame[];
  target?: number; // step 3: reveal bands + a score badge
  badge?: string;
  cursor?: boolean; // step 2: show a dragging cursor
}

const STEPS: Step[] = [
  {
    title: '1 · Write a clue',
    body: 'Only you see where the answer sits on a spectrum between two extremes. Write a short clue that points right at that spot.',
    left: 'Overrated',
    right: 'Underrated',
    start: 50,
    timeline: [
      { at: 600, value: 50 },
      { at: 1700, value: 74 }, // glides to the secret spot
    ],
  },
  {
    title: '2 · Guess together',
    body: 'Everyone debates and drags one shared dial — “maybe here… or there…” — then locks in when it feels right.',
    left: 'Cold',
    right: 'Hot',
    start: 55,
    cursor: true,
    timeline: [
      { at: 400, value: 55, thought: 'hmm…' },
      { at: 1300, value: 30, thought: 'this?' },
      { at: 2300, value: 64, thought: 'or here?' },
      { at: 3300, value: 44, thought: 'there!' },
    ],
  },
  {
    title: '3 · Score it',
    body: 'Closer to the spot = more points; a bullseye is worth 4. In Classic mode the clue-giver also earns a bonus for every good guess.',
    left: 'Boring',
    right: 'Iconic',
    start: 30,
    target: 62,
    badge: '+4',
    timeline: [
      { at: 300, value: 30 },
      { at: 1500, value: 62 }, // settles onto the target
    ],
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
  note?: string; // non-host "host is starting…"
}) {
  const [step, setStep] = useState(0);
  const [value, setValue] = useState(STEPS[0].start);
  const [thought, setThought] = useState<string | undefined>();
  const [showBadge, setShowBadge] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  // play this step's progressive timeline once (then it just rests)
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setValue(s.start);
    setThought(undefined);
    setShowBadge(false);
    for (const f of s.timeline) {
      timers.current.push(
        setTimeout(() => {
          setValue(f.value);
          if (f.thought !== undefined) setThought(f.thought);
        }, f.at),
      );
    }
    if (s.badge) {
      const lastAt = s.timeline[s.timeline.length - 1]?.at ?? 0;
      timers.current.push(setTimeout(() => setShowBadge(true), lastAt + 500));
    }
    return () => timers.current.forEach(clearTimeout);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // gentle auto-advance (stops on the last step)
  useEffect(() => {
    if (last) return;
    const id = setTimeout(() => setStep((x) => x + 1), 6500);
    return () => clearTimeout(id);
  }, [step, last]);

  const inner = (
    <div className="card-pop relative flex flex-col gap-4 p-5">
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
              target={s.target}
              showBands={!!s.target}
              pointer
              bands={BANDS}
              leftLabel={s.left}
              rightLabel={s.right}
            />
          </motion.div>
        </AnimatePresence>

        {/* a little cursor "dragging" the dial on step 2 */}
        {s.cursor && (
          <motion.div
            className="pointer-events-none absolute bottom-7 text-ink"
            animate={{ left: `${6 + value * 0.84}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            aria-hidden
          >
            <MousePointer2 size={26} strokeWidth={2.5} className="-rotate-12 fill-white" />
          </motion.div>
        )}

        {/* thinking-out-loud bubble on step 2 */}
        <AnimatePresence>
          {thought && (
            <motion.div
              key={thought}
              initial={{ opacity: 0, y: 8, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 16 }}
              className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full border-3 border-ink bg-white px-3 py-1 font-display text-sm font-extrabold shadow-pop-sm"
            >
              {thought}
            </motion.div>
          )}
        </AnimatePresence>

        {showBadge && s.badge && (
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 9 }}
            className="absolute right-2 top-0 rounded-full border-3 border-ink bg-sun px-3 py-1 font-display text-xl font-black text-ink shadow-pop-sm"
          >
            {s.badge}
          </motion.div>
        )}
      </div>

      <p className="min-h-[3.5rem] font-bold leading-tight" style={{ color: 'var(--text-soft)' }}>
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
        className="fixed inset-0 z-[70] flex flex-col items-center overflow-y-auto p-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <MemphisBackground />
        <div
          className="pointer-events-none fixed inset-0 -z-[1] backdrop-blur-[2px]"
          style={{ background: 'color-mix(in srgb, var(--page) 55%, transparent)' }}
          aria-hidden
        />
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
