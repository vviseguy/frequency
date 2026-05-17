import { AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Invite } from '../components/Invite';
import { PlayerChip } from '../components/PlayerChip';
import { ReactionBar } from '../components/ReactionBar';
import { Logo, Stage } from '../components/Stage';
import { TopicPicker } from '../components/TopicPicker';
import { MIN_PLAYERS, setsTargetFor, type RoomState } from '../game/types';
import { send, useIsHost, useMyId } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';

const WAITING = [
  'Tuning the frequencies…',
  'Stretching those psychic muscles…',
  'Syncing everyone’s brainwaves…',
  'Reading the room…',
  'Warming up the wavelength…',
];

export function LobbyScreen({ room }: { room: RoomState }) {
  const myId = useMyId();
  const isHost = useIsHost();
  const [showTopics, setShowTopics] = useState(false);
  const connected = room.players.filter((p) => p.connected);
  const canStart = connected.length >= MIN_PLAYERS;
  const totalClues = setsTargetFor(connected.length) * connected.length;
  const quip = useMemo(() => WAITING[Math.floor(Math.random() * WAITING.length)], []);

  return (
    <Stage>
      <div className="flex flex-col gap-4">
        <Logo small />

        {isHost ? (
          <Invite code={room.code} />
        ) : (
          <div
            data-testid="lobby-waiting"
            className="card-pop p-5 text-center"
          >
            <p className="font-display text-2xl font-black text-grape">You’re in! 🎉</p>
            <p className="mt-1 font-display font-extrabold" style={{ color: 'var(--text-soft)' }}>
              {quip}
            </p>
          </div>
        )}

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
            {isHost ? (
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
            ) : (
              <p className="text-center text-xs font-extrabold" style={{ color: 'var(--text-soft)' }}>
                Mode: {room.mode === 'coop' ? 'Co-op 🤝' : 'Classic 🏆'}
              </p>
            )}
          </div>
        </div>

        {showTopics && <TopicPicker room={room} onClose={() => setShowTopics(false)} />}

        <ReactionBar />

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
          <p className="text-center font-display font-extrabold" style={{ color: 'var(--text-soft)' }}>
            Waiting for the host to start…
          </p>
        )}
      </div>
    </Stage>
  );
}
