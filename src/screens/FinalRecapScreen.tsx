import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Stage } from '../components/Stage';
import { playerById, type RoomState } from '../game/types';
import { send, useIsHost } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';
import { popConfetti } from '../lib/celebrate';

export function FinalRecapScreen({ room }: { room: RoomState }) {
  const isHost = useIsHost();
  const rounds = room.history;
  // step 0..rounds.length-1 reveal each round; >=length -> final podium
  const [step, setStep] = useState(0);
  const finished = step >= rounds.length;

  useEffect(() => {
    if (finished) return;
    const id = setTimeout(() => {
      const r = rounds[step];
      const pts = r?.results?.[0]?.points ?? 0;
      playSfx(pts >= 3 ? 'score3' : pts ? 'score2' : 'whiff');
      setStep((s) => s + 1);
    }, 1300);
    return () => clearTimeout(id);
  }, [step, finished, rounds]);

  const standings = useMemo(() => {
    const totals = new Map<string, number>();
    rounds.slice(0, step).forEach((r) => {
      const res = r.results?.[0];
      if (res) totals.set(res.clientId, (totals.get(res.clientId) ?? 0) + res.points);
    });
    return [...room.players]
      .map((p) => ({ p, score: totals.get(p.clientId) ?? 0 }))
      .sort((a, b) => b.score - a.score);
  }, [step, rounds, room.players]);

  useEffect(() => {
    if (finished) {
      playSfx('win');
      popConfetti('huge');
      const id = setInterval(() => popConfetti('big'), 1400);
      return () => clearInterval(id);
    }
  }, [finished]);

  const max = Math.max(1, ...standings.map((s) => s.score));
  const winner = standings[0];

  return (
    <Stage>
      <div className="flex flex-1 flex-col gap-4 py-4">
        <h2 className="text-center font-display text-4xl font-black">
          {finished ? '🏆 Final Results!' : '🎞️ The story so far…'}
        </h2>

        <AnimatePresence mode="wait">
          {!finished && rounds[step] && (
            <motion.div
              key={step}
              initial={{ scale: 0.7, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              className="card-pop p-4 text-center"
            >
              <p className="font-display text-sm font-extrabold text-ink/40">
                Round {step + 1}: “{rounds[step].prompt.left} ↔ {rounds[step].prompt.right}”
              </p>
              <p className="font-display mt-1 text-2xl font-black">
                {playerById(room, rounds[step].psychicClientId)?.name.replace(/^\p{Emoji}\s*/u, '')}{' '}
                scored{' '}
                <span className="text-grape">+{rounds[step].results?.[0]?.points ?? 0}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-2">
          {standings.map(({ p, score }, i) => (
            <motion.div
              layout
              key={p.clientId}
              className="card-pop flex items-center gap-3 p-2"
              style={{ boxShadow: `4px 4px 0 0 ${p.color}` }}
            >
              <span className="w-6 text-center font-display text-xl font-black text-ink/40">
                {finished && i === 0 ? '👑' : i + 1}
              </span>
              <span className="text-xl">{p.emoji}</span>
              <span className="font-display w-20 truncate text-sm font-black">
                {p.name.replace(/^\p{Emoji}\s*/u, '')}
              </span>
              <div className="h-5 flex-1 overflow-hidden rounded-full border-3 border-ink bg-white">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: p.color }}
                  animate={{ width: `${(score / max) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                />
              </div>
              <span className="font-display w-7 text-right text-lg font-black">{score}</span>
            </motion.div>
          ))}
        </div>

        {finished && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 10 }}
            className="card-pop bg-sun p-5 text-center"
          >
            <p className="font-display text-xl font-black">Champion of the Frequency</p>
            <p className="font-display text-3xl font-black text-grape">
              {winner?.p.emoji} {winner?.p.name.replace(/^\p{Emoji}\s*/u, '')}!
            </p>
          </motion.div>
        )}

        <div className="mt-auto">
          {finished &&
            (isHost ? (
              <button
                className="btn-primary w-full text-xl"
                onClick={() => {
                  playSfx('join');
                  send({ t: 'PLAY_AGAIN' });
                }}
              >
                🔁 Back to lobby
              </button>
            ) : (
              <div className="card-pop p-4 text-center font-display font-extrabold text-ink/60">
                GG! Waiting for the host to reset…
              </div>
            ))}
        </div>
      </div>
    </Stage>
  );
}
