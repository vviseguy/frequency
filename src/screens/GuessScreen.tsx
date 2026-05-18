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
  const coop = room.mode === 'coop';

  // co-op: one shared dial (fast channel). classic: my own guess.
  const dialValue = useGameStore((s) => s.dialValue);
  const draggerId = useGameStore((s) => s.dialDraggerId);
  const dragger = draggerId ? playerById(room, draggerId) : null;
  const someoneElse = coop && dragger && dragger.clientId !== myId;

  const value = coop ? dialValue : card.guesses[myId] ?? 50;
  const total = room.set?.cards.length ?? 0;
  const idx = (room.set?.guessIndex ?? 0) + 1;

  const pushMove = useMemo(
    () => rafThrottle((v: number) => send({ t: 'DIAL_MOVE', value: v })),
    [],
  );

  return (
    <Stage focus>
      <div className="flex flex-col gap-3">
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
            value={value}
            interactive={!meOwner}
            bands={BANDS}
            leftLabel={card.prompt.left}
            rightLabel={card.prompt.right}
            draggerName={someoneElse ? dragger!.name.replace(/^\p{Emoji}\s*/u, '') : null}
            draggerEmoji={dragger?.emoji}
            draggerColor={dragger?.color ?? '#7C5CFF'}
            onGrab={coop ? () => send({ t: 'DIAL_GRAB' }) : undefined}
            onChange={pushMove}
            onRelease={
              coop
                ? () => {
                    pushMove.cancel();
                    send({ t: 'DIAL_RELEASE' });
                  }
                : () => pushMove.cancel()
            }
          />
        </div>

        {meOwner ? (
          <div
            className="card-pop p-3 text-center font-display font-extrabold text-grape"
            style={{ background: 'color-mix(in srgb, #7C5CFF 12%, var(--surface))' }}
          >
            Your clue! Sit tight — no hints while they hunt for your wavelength.
          </div>
        ) : (
          <>
            {!coop && (
              <p
                className="text-center text-xs font-extrabold"
                style={{ color: 'var(--text-soft)' }}
              >
                Everyone guesses on their own — closest wins.
              </p>
            )}
            <ReadyBar room={room} myId={myId} />
          </>
        )}

        <div className="pt-1">
          <ReactionBar />
        </div>
      </div>
    </Stage>
  );
}
