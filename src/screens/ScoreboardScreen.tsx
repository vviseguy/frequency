import { motion } from 'framer-motion';
import { Stage } from '../components/Stage';
import type { RoomState } from '../game/types';
import { send, useIsHost } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';

export function ScoreboardScreen({ room }: { room: RoomState }) {
  const isHost = useIsHost();
  const ranked = [...room.players].sort((a, b) => b.totalScore - a.totalScore);
  const done = room.history.length;
  const total = room.config.roundsTarget;
  const last = done ? `${done}/${total}` : '';

  return (
    <Stage>
      <div className="flex flex-1 flex-col gap-5 py-4">
        <h2 className="text-center font-display text-4xl font-black">
          📊 Scoreboard
          <span className="block text-base font-extrabold text-ink/40">Round {last} done</span>
        </h2>

        <div className="flex flex-col gap-2">
          {ranked.map((p, i) => (
            <motion.div
              key={p.clientId}
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: p.connected ? 1 : 0.5 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 260, damping: 18 }}
              className="card-pop flex items-center gap-3 p-3"
              style={{ boxShadow: `4px 4px 0 0 ${p.color}` }}
            >
              <span className="font-display w-7 text-2xl font-black text-ink/40">
                {i === 0 ? '👑' : i + 1}
              </span>
              <span className="text-2xl">{p.emoji}</span>
              <span className="font-display flex-1 truncate text-lg font-black">
                {p.name.replace(/^\p{Emoji}\s*/u, '')}
              </span>
              <span className="font-display rounded-full bg-ink px-3 py-1 text-xl font-black text-white">
                {p.totalScore}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="mt-auto">
          {isHost ? (
            <button
              className="btn-primary w-full text-xl"
              onClick={() => {
                playSfx('ready');
                send({ t: 'NEXT_ROUND' });
              }}
            >
              {done >= total ? '🏆 See final results!' : '▶ Next round'}
            </button>
          ) : (
            <div className="card-pop p-4 text-center font-display font-extrabold text-ink/60">
              Waiting for the host to continue…
            </div>
          )}
        </div>
      </div>
    </Stage>
  );
}
