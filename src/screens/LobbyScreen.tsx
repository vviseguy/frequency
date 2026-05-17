import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { PlayerChip } from '../components/PlayerChip';
import { ShareLink } from '../components/ShareLink';
import { Logo, Stage } from '../components/Stage';
import { TopicPicker } from '../components/TopicPicker';
import { MIN_PLAYERS, seniorPlayer, setsTargetFor, type RoomState } from '../game/types';
import { send, useIsHost, useMyId } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';

export function LobbyScreen({ room }: { room: RoomState }) {
  const myId = useMyId();
  const isHost = useIsHost();
  const [showTopics, setShowTopics] = useState(false);
  const connected = room.players.filter((p) => p.connected);
  const canStart = connected.length >= MIN_PLAYERS;
  const cluesEach = setsTargetFor(connected.length);
  const totalClues = cluesEach * connected.length;

  return (
    <Stage>
      <div className="flex flex-1 flex-col gap-5 py-4">
        <Logo small />
        <ShareLink code={room.code} />

        <div className="card-pop flex flex-col gap-3 p-4">
          <h2 className="font-display text-xl font-black">
            Players <span style={{ color: 'var(--text-soft)' }}>({connected.length})</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {room.players.map((p) => (
                <PlayerChip
                  key={p.clientId}
                  player={p}
                  isYou={p.clientId === myId}
                  isHost={p.clientId === room.ownerClientId}
                />
              ))}
            </AnimatePresence>
          </div>
          <p className="text-xs font-bold" style={{ color: 'var(--text-soft)' }}>
            👑 {seniorPlayer(room.players)?.name ?? 'Host'} is hosting. If they drop, the
            most senior player automatically takes over.
          </p>
        </div>

        <div className="card-pop flex items-center justify-center gap-4 p-4 text-center">
          <div>
            <p className="font-display text-4xl font-black text-grape">{cluesEach}</p>
            <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: 'var(--text-soft)' }}>
              clues each
            </p>
          </div>
          <span className="text-2xl" style={{ color: 'var(--text-soft)' }}>
            ·
          </span>
          <div>
            <p className="font-display text-4xl font-black text-coral">{totalClues || '–'}</p>
            <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: 'var(--text-soft)' }}>
              total rounds
            </p>
          </div>
        </div>
        <p className="-mt-3 text-center text-xs font-bold" style={{ color: 'var(--text-soft)' }}>
          Scales with the room: smaller groups play more clues each.
        </p>

        <button
          className="btn-ghost w-full"
          data-testid="topics-btn"
          onClick={() => setShowTopics(true)}
        >
          🎲 Topics:{' '}
          {room.packs.length ? `${room.packs.length} pack${room.packs.length === 1 ? '' : 's'}` : 'All'}
          {isHost ? ' · tap to choose' : ''}
        </button>

        {showTopics && <TopicPicker room={room} onClose={() => setShowTopics(false)} />}

        <div className="mt-auto">
          {isHost ? (
            <button
              className="btn-primary w-full text-2xl"
              data-testid="start-btn"
              disabled={!canStart}
              onClick={() => {
                playSfx('reveal');
                send({ t: 'START_GAME' });
              }}
            >
              {canStart ? '🚀 Start the game!' : `Need ${MIN_PLAYERS}+ players…`}
            </button>
          ) : (
            <div
              data-testid="lobby-waiting"
              className="card-pop p-4 text-center font-display text-lg font-extrabold"
              style={{ color: 'var(--text-soft)' }}
            >
              Waiting for the host to start… stretch those psychic muscles 🔮
            </div>
          )}
        </div>
      </div>
    </Stage>
  );
}
