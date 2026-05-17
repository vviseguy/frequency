import { AnimatePresence } from 'framer-motion';
import { PlayerChip } from '../components/PlayerChip';
import { ShareLink } from '../components/ShareLink';
import { Logo, Stage } from '../components/Stage';
import { MIN_PLAYERS, seniorPlayer, type RoomState } from '../game/types';
import { send, useIsHost, useMyId } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';

export function LobbyScreen({ room }: { room: RoomState }) {
  const myId = useMyId();
  const isHost = useIsHost();
  const connected = room.players.filter((p) => p.connected);
  const canStart = connected.length >= MIN_PLAYERS;

  return (
    <Stage>
      <div className="flex flex-1 flex-col gap-5 py-4">
        <Logo small />
        <ShareLink code={room.code} />

        <div className="card-pop flex flex-col gap-3 p-4">
          <h2 className="font-display text-xl font-black">
            Players <span className="text-ink/40">({connected.length})</span>
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
          <p className="text-xs font-bold text-ink/50">
            👑 {seniorPlayer(room.players)?.name ?? 'Host'} is hosting. If they drop, the
            most senior player automatically takes over.
          </p>
        </div>

        {isHost && (
          <div className="card-pop flex flex-col gap-4 p-4">
            <h2 className="font-display text-xl font-black">Game settings</h2>
            <Slider
              label="Rounds"
              value={room.config.roundsTarget}
              min={2}
              max={20}
              onChange={(v) => send({ t: 'CONFIG', patch: { roundsTarget: v } })}
            />
            <Slider
              label="Clue time"
              suffix="s"
              value={room.config.clueSeconds}
              min={15}
              max={120}
              step={5}
              onChange={(v) => send({ t: 'CONFIG', patch: { clueSeconds: v } })}
            />
            <Slider
              label="Guess time"
              suffix="s"
              value={room.config.guessSeconds}
              min={20}
              max={120}
              step={5}
              onChange={(v) => send({ t: 'CONFIG', patch: { guessSeconds: v } })}
            />
          </div>
        )}

        <div className="mt-auto">
          {isHost ? (
            <button
              className="btn-primary w-full text-2xl"
              disabled={!canStart}
              onClick={() => {
                playSfx('reveal');
                send({ t: 'START_GAME' });
              }}
            >
              {canStart ? '🚀 Start the game!' : `Need ${MIN_PLAYERS}+ players…`}
            </button>
          ) : (
            <div className="card-pop p-4 text-center font-display text-lg font-extrabold text-ink/60">
              Waiting for the host to start… stretch those psychic muscles 🔮
            </div>
          )}
        </div>
      </div>
    </Stage>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between font-display text-sm font-extrabold">
        <span>{label}</span>
        <span className="text-grape">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-3 w-full cursor-pointer appearance-none rounded-full border-3 border-ink bg-sun accent-grape"
      />
    </div>
  );
}
