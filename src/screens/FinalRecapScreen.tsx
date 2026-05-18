import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { CoopMeter } from '../components/CoopMeter';
import { Stage } from '../components/Stage';
import { cardPointDeltas, COOP_TIERS, coopTier, playerById, type RoomState } from '../game/types';
import { send, useIsHost } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';
import { popConfetti } from '../lib/celebrate';

export function FinalRecapScreen({ room }: { room: RoomState }) {
  const isHost = useIsHost();
  const coop = room.mode === 'coop';
  const cards = room.history;
  const [step, setStep] = useState(0);
  const finished = step >= cards.length;

  useEffect(() => {
    if (finished) return;
    const id = setTimeout(() => {
      const d = cards[step] ? cardPointDeltas(cards[step], room.mode) : {};
      const pts = Math.max(0, ...Object.values(d));
      playSfx(pts >= 3 ? 'score3' : pts ? 'score2' : 'whiff');
      setStep((s) => s + 1);
    }, 1100);
    return () => clearTimeout(id);
  }, [step, finished, cards, room.mode]);

  const standings = useMemo(() => {
    const totals = new Map<string, number>();
    cards.slice(0, step).forEach((c) => {
      const d = cardPointDeltas(c, room.mode);
      for (const [id, pts] of Object.entries(d)) totals.set(id, (totals.get(id) ?? 0) + pts);
    });
    return [...room.players]
      .map((p) => ({ p, score: totals.get(p.clientId) ?? 0 }))
      .sort((a, b) => b.score - a.score);
  }, [step, cards, room.players, room.mode]);

  const teamSoFar = cards.slice(0, step).reduce((n, c) => n + (c.result?.points ?? 0), 0);
  const maxPossible = cards.length * 4;

  useEffect(() => {
    if (finished) {
      playSfx('win');
      popConfetti('huge');
      const id = setInterval(() => popConfetti('big'), 1500);
      return () => clearInterval(id);
    }
  }, [finished]);

  const max = Math.max(1, ...standings.map((s) => s.score));
  const topScore = standings[0]?.score ?? 0;
  const winners = standings.filter((s) => s.score === topScore && topScore > 0);
  const title = useMemo(() => {
    const t = [
      'On the same wavelength',
      'Certified mind-reader',
      'Big brain energy',
      'Frequency royalty',
      'Dialed in',
      'Telepathy unlocked',
    ];
    return t[Math.floor(Math.random() * t.length)];
  }, []);
  const cur = cards[step];

  return (
    <Stage>
      <div className="flex flex-col gap-4">
        <h2 className="text-center font-display text-4xl font-black">
          {finished ? 'Final Results' : 'The story so far…'}
        </h2>

        {!finished && cur && (
          <motion.div
            key={step}
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            className="card-pop p-4 text-center"
          >
            <p className="font-display text-sm font-extrabold" style={{ color: 'var(--text-soft)' }}>
              “{cur.prompt.left} ↔ {cur.prompt.right}”
            </p>
            <p className="font-display mt-1 text-2xl font-black">
              {playerById(room, cur.ownerClientId)?.name.replace(/^\p{Emoji}\s*/u, '')}{' '}
              {coop ? (
                <>
                  scored <span className="text-grape">+{cur.result?.points ?? 0}</span>
                </>
              ) : (
                <>
                  earned <span className="text-grape">+{cur.ownerBonus}</span> clue bonus
                </>
              )}
            </p>
          </motion.div>
        )}

        {coop ? (
          <div className="card-pop flex flex-col gap-3 p-5 text-center">
            <p className="font-display text-lg font-extrabold" style={{ color: 'var(--text-soft)' }}>
              How in sync was the team?
            </p>
            <CoopMeter total={teamSoFar} max={maxPossible} big />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {standings.map(({ p, score }, i) => (
              <motion.div
                layout
                key={p.clientId}
                className="card-pop flex items-center gap-3 p-2"
                style={{ boxShadow: `4px 4px 0 0 ${p.color}` }}
              >
                <span className="w-6 text-center font-display text-xl font-black" style={{ color: 'var(--text-soft)' }}>
                  {finished && i === 0 ? '👑' : i + 1}
                </span>
                <span className="text-xl">{p.emoji}</span>
                <span className="font-display w-20 truncate text-sm font-black">
                  {p.name.replace(/^\p{Emoji}\s*/u, '')}
                </span>
                <div className="h-5 flex-1 overflow-hidden rounded-full border-3 border-ink" style={{ background: 'var(--surface)' }}>
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
        )}

        {finished && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 10 }}
            className="card-pop bg-sun p-5 text-center"
            data-testid="champion"
          >
            {coop ? (
              <>
                <p className="font-display text-xl font-black text-ink">Final verdict</p>
                <p className="font-display text-3xl font-black text-grape">
                  {COOP_TIERS[coopTier(teamSoFar, maxPossible)]}
                </p>
              </>
            ) : winners.length === 0 ? (
              <>
                <p className="font-display text-xl font-black text-ink">Well… that happened</p>
                <p className="font-display text-3xl font-black text-grape">
                  Totally crossed wires 📡
                </p>
              </>
            ) : winners.length === 1 ? (
              <>
                <p className="font-display text-xl font-black text-ink">{title}</p>
                <p className="font-display text-3xl font-black text-grape">
                  {winners[0].p.emoji} {winners[0].p.name.replace(/^\p{Emoji}\s*/u, '')}!
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-xl font-black text-ink">
                  It’s a {winners.length}-way tie!
                </p>
                <p className="font-display text-2xl font-black text-grape">
                  {winners
                    .map((w) => w.p.name.replace(/^\p{Emoji}\s*/u, ''))
                    .join(' & ')}{' '}
                  🤝
                </p>
              </>
            )}
          </motion.div>
        )}

        <div className="mt-2">
          {finished &&
            (isHost ? (
              <button
                className="btn-primary w-full text-xl"
                data-testid="play-again"
                onClick={() => {
                  playSfx('join');
                  send({ t: 'PLAY_AGAIN' });
                }}
              >
                Back to lobby
              </button>
            ) : (
              <div
                className="card-pop p-4 text-center font-display font-extrabold"
                style={{ color: 'var(--text-soft)' }}
              >
                GG! Waiting for the host to reset…
              </div>
            ))}
        </div>
      </div>
    </Stage>
  );
}
