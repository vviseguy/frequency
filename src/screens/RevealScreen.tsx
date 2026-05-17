import { motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { Dial } from '../components/Dial';
import { ReactionBar } from '../components/ReactionBar';
import { Stage } from '../components/Stage';
import { scoreBlurb, scoreLabel } from '../game/scoring';
import { playerById, type RoomState } from '../game/types';
import { send, useIsHost } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';
import { popConfetti } from '../lib/celebrate';

export function RevealScreen({ room }: { room: RoomState }) {
  const r = room.round!;
  const isHost = useIsHost();
  const result = r.results?.[0];
  const points = result?.points ?? 0;
  const psychic = playerById(room, r.psychicClientId);
  const blurb = useMemo(() => scoreBlurb(points), [points]);

  useEffect(() => {
    if (r.voided) {
      playSfx('whiff');
      return;
    }
    const t = setTimeout(() => {
      if (points === 4) {
        playSfx('score4');
        popConfetti('huge');
      } else if (points === 3) {
        playSfx('score3');
        popConfetti('big');
      } else if (points === 2) {
        playSfx('score2');
        popConfetti('small');
      } else {
        playSfx('whiff');
      }
    }, 650); // beat of suspense before the payoff
    return () => clearTimeout(t);
  }, [points, r.voided]);

  return (
    <Stage>
      <div className="flex flex-1 flex-col gap-4 py-3">
        <p className="text-center font-display text-lg font-extrabold text-ink/50">
          {psychic?.emoji} {psychic?.name.replace(/^\p{Emoji}\s*/u, '')} said “
          <span className="text-grape">{r.clue}</span>”
        </p>

        <motion.div
          className="card-pop p-3"
          initial={{ x: 0 }}
          animate={points === 4 ? { x: [0, -8, 8, -6, 6, 0] } : { x: [0, -3, 3, 0] }}
          transition={{ delay: 0.65, duration: 0.5 }}
        >
          <Dial
            value={r.dial.value}
            target={r.target}
            showTarget
            showBands
            bands={room.config.bands}
            leftLabel={r.prompt.left}
            rightLabel={r.prompt.right}
          />
        </motion.div>

        {r.voided ? (
          <div className="card-pop bg-coral/15 p-4 text-center font-display text-xl font-black text-coral">
            😵 Psychic disconnected — round skipped!
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 9 }}
            className="card-pop flex flex-col items-center gap-1 p-5 text-center"
          >
            <p className="font-display text-5xl font-black text-grape">
              +{points} {points === 4 ? '🎯' : points ? '⭐' : '💨'}
            </p>
            <p className="font-display text-2xl font-black">{scoreLabel(points)}</p>
            <p className="font-bold text-ink/60">{blurb}</p>
            <p className="mt-1 text-sm font-extrabold text-ink/40">
              off by {result?.delta}% — target was {r.target}
            </p>
          </motion.div>
        )}

        <div className="mt-auto flex flex-col gap-3">
          <ReactionBar />
          {isHost && (
            <button className="btn-ghost w-full" onClick={() => send({ t: 'NEXT_ROUND' })}>
              Skip ahead ⏭
            </button>
          )}
        </div>
      </div>
    </Stage>
  );
}
