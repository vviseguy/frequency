import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { PlayerChip } from '../components/PlayerChip';
import { ShareLink } from '../components/ShareLink';
import { Logo, Stage } from '../components/Stage';
import { TopicPicker } from '../components/TopicPicker';
import { MIN_PLAYERS, setsTargetFor, type RoomState } from '../game/types';
import { send, useIsHost, useMyId } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';

export function LobbyScreen({ room }: { room: RoomState }) {
  const myId = useMyId();
  const isHost = useIsHost();
  const [showTopics, setShowTopics] = useState(false);
  const connected = room.players.filter((p) => p.connected);
  const canStart = connected.length >= MIN_PLAYERS;
  const totalClues = setsTargetFor(connected.length) * connected.length;

  return (
    <Stage>
      <div className="flex flex-1 flex-col gap-4 pt-8">
        <Logo small />

        <ShareLink code={room.code} />

        <div className="card-pop flex flex-col gap-3 p-4">
          <h2 className="font-display text-xl font-black">
            Players <span style={{ color: 'var(--text-soft)' }}>· {connected.length}</span>
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

          <div className="mt-1 flex flex-col gap-2">
            <button
              className="btn-ghost w-full px-3 py-2 text-sm"
              data-testid="topics-btn"
              onClick={() => setShowTopics(true)}
            >
              Topics: {room.packs.length ? `${room.packs.length} packs` : 'All'}
            </button>
            {isHost && (
              <div className="flex gap-2">
                <button
                  className={`flex-1 px-3 py-2 text-sm ${room.mode === 'coop' ? 'btn-fun' : 'btn-ghost'}`}
                  onClick={() => send({ t: 'SET_MODE', mode: room.mode === 'coop' ? 'classic' : 'coop' })}
                >
                  {room.mode === 'coop' ? 'Co-op 🤝' : 'Classic 🏆'}
                </button>
                <button
                  className={`flex-1 px-3 py-2 text-sm ${room.intro ? 'btn-fun' : 'btn-ghost'}`}
                  onClick={() => send({ t: 'SET_INTRO', on: !room.intro })}
                >
                  Intro: {room.intro ? 'on' : 'off'}
                </button>
              </div>
            )}
            {!isHost && (
              <p className="text-center text-xs font-extrabold" style={{ color: 'var(--text-soft)' }}>
                Mode: {room.mode === 'coop' ? 'Co-op 🤝' : 'Classic 🏆'}
              </p>
            )}
          </div>
        </div>

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
              {canStart ? `Start · ${totalClues} rounds` : `Need ${MIN_PLAYERS}+ players…`}
            </button>
          ) : (
            <div
              data-testid="lobby-waiting"
              className="card-pop p-4 text-center font-display text-lg font-extrabold"
              style={{ color: 'var(--text-soft)' }}
            >
              Waiting for the host to start…
            </div>
          )}
        </div>
      </div>
    </Stage>
  );
}
