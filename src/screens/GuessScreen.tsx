import { useMemo } from 'react';
import { Dial } from '../components/Dial';
import { ReactionBar } from '../components/ReactionBar';
import { ReadyBar } from '../components/ReadyBar';
import { Stage } from '../components/Stage';
import { useGameStore } from '../game/gameStore';
import { playerById, type RoomState } from '../game/types';
import { send, useMyId } from '../hooks/useNet';
import { rafThrottle } from '../lib/throttle';
import { Timer } from '../components/Timer';

export function GuessScreen({ room }: { room: RoomState }) {
  const r = room.round!;
  const myId = useMyId();
  const mePsychic = r.psychicClientId === myId;
  const dialValue = useGameStore((s) => s.dialValue);
  const draggerId = useGameStore((s) => s.dialDraggerId);

  const dragger = draggerId ? playerById(room, draggerId) : null;
  const someoneElse = dragger && dragger.clientId !== myId;

  const pushMove = useMemo(
    () => rafThrottle((v: number) => send({ t: 'DIAL_MOVE', value: v })),
    [],
  );

  return (
    <Stage>
      <div className="flex flex-1 flex-col gap-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="card-pop flex-1 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">The clue</p>
            <p className="font-display text-2xl font-black leading-tight text-grape">
              “{r.clue}”
            </p>
          </div>
          <Timer endsAt={room.phaseEndsAt} total={room.config.guessSeconds} />
        </div>

        <div className="card-pop p-3">
          <Dial
            value={dialValue}
            interactive={!mePsychic}
            bands={room.config.bands}
            leftLabel={r.prompt.left}
            rightLabel={r.prompt.right}
            draggerName={someoneElse ? dragger!.name.replace(/^\p{Emoji}\s*/u, '') : null}
            draggerColor={dragger?.color ?? '#7C5CFF'}
            onGrab={() => send({ t: 'DIAL_GRAB' })}
            onChange={pushMove}
            onRelease={() => {
              pushMove.cancel();
              send({ t: 'DIAL_RELEASE' });
            }}
          />
        </div>

        {mePsychic ? (
          <div className="card-pop bg-grape/10 p-3 text-center font-display font-extrabold text-grape">
            🔮 Sit back — the team is hunting for your wavelength. No hints!
          </div>
        ) : (
          <ReadyBar room={room} myId={myId} />
        )}

        <div className="mt-auto pt-2">
          <ReactionBar />
        </div>
      </div>
    </Stage>
  );
}
