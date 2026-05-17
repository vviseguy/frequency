import { motion } from 'framer-motion';
import { guessers } from '../game/rounds';
import type { RoomState } from '../game/types';
import { send } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';

export function ReadyBar({ room, myId }: { room: RoomState; myId: string }) {
  const r = room.round;
  if (!r) return null;
  const g = guessers(room);
  const readyCount = g.filter((p) => r.ready[p.clientId]).length;
  const amGuesser = g.some((p) => p.clientId === myId);
  const iAmReady = !!r.ready[myId];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-1.5">
        {g.map((p) => (
          <motion.span
            key={p.clientId}
            animate={{ scale: r.ready[p.clientId] ? 1.15 : 1 }}
            className="h-4 w-4 rounded-full border-3 border-ink"
            style={{ background: r.ready[p.clientId] ? p.color : 'white' }}
            title={p.name}
          />
        ))}
      </div>
      <p className="font-display text-xl font-extrabold">
        {readyCount}/{g.length} locked in
      </p>
      {amGuesser && (
        <button
          data-testid="ready-toggle"
          data-ready={iAmReady}
          className={iAmReady ? 'btn-ghost' : 'btn-fun'}
          onClick={() => {
            playSfx(iAmReady ? 'release' : 'ready');
            send({ t: 'SET_READY', ready: !iAmReady });
          }}
        >
          {iAmReady ? '✋ Wait, not yet' : '✅ Lock it in!'}
        </button>
      )}
    </div>
  );
}
