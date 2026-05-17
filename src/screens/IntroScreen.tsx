import { motion } from 'framer-motion';
import { Stage } from '../components/Stage';
import { send, useIsHost } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';

const STEPS = [
  'Everyone writes a clue at the same time for their own secret spot on a weird scale.',
  'The group then takes each clue in turn and drags one shared dial to guess that spot.',
  'The closer the group lands, the more points the clue-giver scores. Highest total wins.',
];

export function IntroScreen() {
  const isHost = useIsHost();
  return (
    <Stage focus>
      <div className="flex flex-1 flex-col justify-center gap-6 py-6">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          className="card-pop flex flex-col gap-5 p-6"
        >
          <h2 className="font-display text-3xl font-black">How it works</h2>
          <ol className="flex flex-col gap-4">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-3 border-ink bg-sun font-display font-black">
                  {i + 1}
                </span>
                <span className="pt-1 font-bold leading-tight">{s}</span>
              </li>
            ))}
          </ol>
        </motion.div>

        {isHost ? (
          <button className="btn-primary w-full text-2xl" onClick={() => { playSfx('reveal'); send({ t: 'BEGIN_PLAY' }); }}>
            Let’s play!
          </button>
        ) : (
          <p className="text-center font-display text-lg font-extrabold" style={{ color: 'var(--text-soft)' }}>
            Get ready — the host is starting…
          </p>
        )}
      </div>
    </Stage>
  );
}
