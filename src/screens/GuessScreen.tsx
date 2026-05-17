import { useMemo } from 'react';
import { Dial } from '../components/Dial';
import { ReactionBar } from '../components/ReactionBar';
import { ReadyBar } from '../components/ReadyBar';
import { Stage } from '../components/Stage';
import { Timer } from '../components/Timer';
import { useGameStore } from '../game/gameStore';
import { BANDS, currentCard, GUESS_SECONDS, playerById, type RoomState } from '../game/types';
import { rafThrottle } from '../lib/throttle';
import { send, useMyId } from '../hooks/useNet';

export function GuessScreen({ room }: { room: RoomState }) {
  const myId = useMyId();
  const card = currentCard(room)!;
  const owner = playerById(room, card.ownerClientId);
  const meOwner = card.ownerClientId === myId;
  const dialValue = useGameStore((s) => s.dialValue);
  const draggerId = useGameStore((s) => s.dialDraggerId);
  const dragger = draggerId ? playerById(room, draggerId) : null;
  const someoneElse = dragger && dragger.clientId !== myId;
  const total = room.set?.cards.length ?? 0;
  const idx = (room.set?.guessIndex ?? 0) + 1;

  const pushMove = useMemo(
    () => rafThrottle((v: number) => send({ t: 'DIAL_MOVE', value: v })),
    [],
  );

  return (
    <Stage focus>
      <div className="flex flex-1 flex-col gap-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="card-pop flex-1 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-soft)' }}>
              Clue {idx}/{total} · {owner?.name.replace(/^\p{Emoji}\s*/u, '')}’s clue
            </p>
            <p className="font-display text-2xl font-black leading-tight text-grape">“{card.clue}”</p>
          </div>
          <Timer endsAt={room.phaseEndsAt} total={GUESS_SECONDS} />
        </div>

        <div className="card-pop p-3">
          <Dial
            value={dialValue}
            interactive={!meOwner}
            bands={BANDS}
            leftLabel={card.prompt.left}
            rightLabel={card.prompt.right}
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

        {meOwner ? (
          <div
            className="card-pop p-3 text-center font-display font-extrabold text-grape"
            style={{ background: 'color-mix(in srgb, #7C5CFF 12%, var(--surface))' }}
          >
            🔮 Your clue! Sit tight — no hints while they hunt for your wavelength.
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
