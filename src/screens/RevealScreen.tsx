import { motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { Dial } from '../components/Dial';
import { ReactionBar } from '../components/ReactionBar';
import { Stage } from '../components/Stage';
import { scoreBlurb, scoreLabel } from '../game/scoring';
import { BANDS, currentCard, playerById, type RoomState } from '../game/types';
import { playSfx } from '../hooks/useSound';
import { popConfetti } from '../lib/celebrate';

export function RevealScreen({ room }: { room: RoomState }) {
  const card = currentCard(room)!;
  const result = card.result;
  const points = result?.points ?? 0;
  const owner = playerById(room, card.ownerClientId);
  const blurb = useMemo(() => scoreBlurb(points), [points]);
  const total = room.set?.cards.length ?? 0;
  const idx = (room.set?.guessIndex ?? 0) + 1;

  useEffect(() => {
    if (card.voided) {
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
    }, 600);
    return () => clearTimeout(t);
  }, [points, card.voided]);

  return (
    <Stage focus>
      <div className="flex flex-1 flex-col gap-4 py-3">
        <p className="text-center font-display text-lg font-extrabold" style={{ color: 'var(--text-soft)' }}>
          Clue {idx}/{total} — {owner?.emoji} {owner?.name.replace(/^\p{Emoji}\s*/u, '')} said “
          <span className="text-grape">{card.clue}</span>”
        </p>

        <motion.div
          className="card-pop p-3"
          initial={{ x: 0 }}
          animate={points === 4 ? { x: [0, -8, 8, -6, 6, 0] } : { x: [0, -3, 3, 0] }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Dial
            value={card.dial.value}
            target={card.target}
            showTarget
            showBands
            bands={BANDS}
            leftLabel={card.prompt.left}
            rightLabel={card.prompt.right}
          />
        </motion.div>

        {card.voided ? (
          <div className="card-pop p-4 text-center font-display text-xl font-black text-coral">
            {owner?.name.replace(/^\p{Emoji}\s*/u, '')} disconnected — clue skipped
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.85, type: 'spring', stiffness: 260, damping: 9 }}
            className="card-pop flex flex-col items-center gap-1 p-5 text-center"
            data-testid="reveal-points"
          >
            <p className="font-display text-6xl font-black text-grape">+{points}</p>
            <p className="font-display text-2xl font-black">{scoreLabel(points)}</p>
            <p className="font-bold" style={{ color: 'var(--text-soft)' }}>
              {blurb}
            </p>
            <p className="mt-1 text-sm font-extrabold" style={{ color: 'var(--text-soft)' }}>
              off by {result?.delta}% — target was {card.target}
            </p>
          </motion.div>
        )}

        <div className="mt-auto">
          <ReactionBar />
        </div>
      </div>
    </Stage>
  );
}
