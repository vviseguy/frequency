import { motion } from 'framer-motion';
import { Stage } from '../components/Stage';
import { playerById, type RoomState } from '../game/types';
import { useMyId } from '../hooks/useNet';

export function RoundIntroScreen({ room }: { room: RoomState }) {
  const r = room.round;
  const myId = useMyId();
  if (!r) return null;
  const psychic = playerById(room, r.psychicClientId);
  const mePsychic = r.psychicClientId === myId;

  return (
    <Stage>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <motion.p
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="font-display text-xl font-extrabold text-ink/50"
        >
          Round {r.index + 1} of {room.config.roundsTarget}
        </motion.p>

        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 10 }}
          className="text-7xl"
        >
          🔮
        </motion.div>

        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 240, damping: 12 }}
          className="card-pop px-7 py-5"
        >
          <p className="font-display text-lg font-extrabold text-ink/50">
            {mePsychic ? 'YOU are' : 'The Psychic is'}
          </p>
          <p className="font-display text-4xl font-black text-grape">
            {psychic?.emoji} {psychic?.name.replace(/^\p{Emoji}\s*/u, '')}
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="font-display text-lg font-extrabold"
        >
          Category: <span className="text-coral">{r.prompt.category ?? 'Anything goes'}</span>
        </motion.p>
        <p className="animate-wiggle font-display text-base font-extrabold text-ink/40">
          Get ready…
        </p>
      </div>
    </Stage>
  );
}
