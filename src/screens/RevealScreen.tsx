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
  const owner = playerById(room, card.ownerClientId);
  const coop = room.mode === 'coop';
  const total = room.set?.cards.length ?? 0;
  const idx = (room.set?.guessIndex ?? 0) + 1;

  const coopPoints = card.result?.points ?? 0;
  const gr = card.guessResults ?? [];
  const best = gr.reduce((m, r) => Math.max(m, r.points), 0);
  const headline = coop ? coopPoints : best; // drives sound/confetti
  const blurb = useMemo(() => scoreBlurb(headline as 0 | 2 | 3 | 4), [headline]);

  const markers = gr.map((r) => {
    const p = playerById(room, r.clientId);
    return { value: r.value, color: p?.color ?? '#7C5CFF', emoji: p?.emoji };
  });

  useEffect(() => {
    if (card.voided) {
      playSfx('whiff');
      return;
    }
    const t = setTimeout(() => {
      if (headline === 4) {
        playSfx('score4');
        popConfetti('huge');
      } else if (headline === 3) {
        playSfx('score3');
        popConfetti('big');
      } else if (headline === 2) {
        playSfx('score2');
        popConfetti('small');
      } else {
        playSfx('whiff');
      }
    }, 600);
    return () => clearTimeout(t);
  }, [headline, card.voided]);

  return (
    <Stage focus>
      <div className="flex flex-col gap-4">
        <p className="text-center font-display text-lg font-extrabold" style={{ color: 'var(--text-soft)' }}>
          Clue {idx}/{total} — {owner?.emoji} {owner?.name.replace(/^\p{Emoji}\s*/u, '')} said “
          <span className="text-grape">{card.clue}</span>”
        </p>

        <motion.div
          className="card-pop p-3"
          initial={{ x: 0 }}
          animate={headline === 4 ? { x: [0, -8, 8, -6, 6, 0] } : { x: [0, -3, 3, 0] }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Dial
            value={coop ? card.dial.value : card.target}
            target={card.target}
            showTarget
            showBands
            pointer={coop}
            markers={coop ? undefined : markers}
            bands={BANDS}
            leftLabel={card.prompt.left}
            rightLabel={card.prompt.right}
          />
        </motion.div>

        {card.voided ? (
          <div className="card-pop p-4 text-center font-display text-xl font-black text-coral">
            {owner?.name.replace(/^\p{Emoji}\s*/u, '')} disconnected — clue skipped
          </div>
        ) : coop ? (
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.85, type: 'spring', stiffness: 260, damping: 9 }}
            className="card-pop flex flex-col items-center gap-1 p-5 text-center"
            data-testid="reveal-points"
          >
            <p className="font-display text-6xl font-black text-grape">+{coopPoints}</p>
            <p className="font-display text-2xl font-black">{scoreLabel(coopPoints)}</p>
            <p className="font-bold" style={{ color: 'var(--text-soft)' }}>
              {blurb}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.85, type: 'spring', stiffness: 260, damping: 12 }}
            className="card-pop flex flex-col gap-2 p-4"
            data-testid="reveal-points"
          >
            <p className="text-center font-display text-xl font-black text-grape">
              {owner?.name.replace(/^\p{Emoji}\s*/u, '')} earns +{card.ownerBonus} clue bonus
            </p>
            <div className="flex flex-col gap-1">
              {gr
                .slice()
                .sort((a, b) => b.points - a.points)
                .map((r) => {
                  const p = playerById(room, r.clientId);
                  return (
                    <div key={r.clientId} className="flex items-center gap-2">
                      <span className="text-lg">{p?.emoji}</span>
                      <span className="font-display flex-1 truncate font-extrabold">
                        {p?.name.replace(/^\p{Emoji}\s*/u, '')}
                      </span>
                      <span
                        className="font-display rounded-full border-3 border-ink px-2 text-sm font-black"
                        style={{ background: r.points ? '#9BE564' : 'var(--surface)' }}
                      >
                        +{r.points}
                      </span>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}

        <div className="pt-1">
          <ReactionBar />
        </div>
      </div>
    </Stage>
  );
}
