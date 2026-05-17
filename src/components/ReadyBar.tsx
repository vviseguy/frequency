import { motion } from 'framer-motion';
import { readyCountFor } from '../game/rounds';
import { currentCard, guessersFor, type RoomState } from '../game/types';
import { send } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';

export function ReadyBar({ room, myId }: { room: RoomState; myId: string }) {
  const card = currentCard(room);
  if (!card) return null;
  const g = guessersFor(room, card);
  const { done, total } = readyCountFor(room, card);
  const amGuesser = g.some((p) => p.clientId === myId);
  const iAmReady = !!card.ready[myId];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-1.5">
        {g.map((p) => (
          <motion.span
            key={p.clientId}
            animate={{ scale: card.ready[p.clientId] ? 1.15 : 1 }}
            className="h-4 w-4 rounded-full border-3 border-ink"
            style={{ background: card.ready[p.clientId] ? p.color : 'var(--surface)' }}
            title={p.name}
          />
        ))}
      </div>
      <p className="font-display text-xl font-extrabold">
        {done}/{total} locked in
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
