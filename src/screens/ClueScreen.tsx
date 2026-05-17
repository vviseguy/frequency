import { useState } from 'react';
import { Dial } from '../components/Dial';
import { Stage } from '../components/Stage';
import { Timer } from '../components/Timer';
import { clueProgress } from '../game/rounds';
import { BANDS, CLUE_SECONDS, type RoomState } from '../game/types';
import { send, useMyId } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';

export function ClueScreen({ room }: { room: RoomState }) {
  const myId = useMyId();
  const myCard = room.set?.cards.find((c) => c.ownerClientId === myId) ?? null;
  const submitted = !!myCard?.clue;
  const { done, total } = clueProgress(room);
  const [clue, setClue] = useState('');

  return (
    <Stage focus>
      <div className="flex flex-1 flex-col gap-4 py-3">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-black">Everyone, write your clue!</p>
          <Timer endsAt={room.phaseEndsAt} total={CLUE_SECONDS} />
        </div>

        {!myCard ? (
          <div className="card-pop flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="animate-wiggle text-5xl">🍿</div>
            <p className="font-display text-xl font-black">You joined mid-set</p>
            <p className="font-bold" style={{ color: 'var(--text-soft)' }}>
              Sit this one out — you’re in next set.
            </p>
          </div>
        ) : submitted ? (
          <div className="card-pop flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="text-6xl">✅</div>
            <p className="font-display text-2xl font-black">Clue locked in!</p>
            <p className="card-pop px-4 py-2 font-display text-lg font-extrabold text-grape">
              “{myCard.clue}”
            </p>
            <p className="font-display text-xl font-extrabold">
              {done}/{total} players ready
            </p>
            <p className="font-bold" style={{ color: 'var(--text-soft)' }}>
              Waiting for everyone else…
            </p>
          </div>
        ) : (
          <>
            <div
              className="card-pop p-3 text-center font-display font-extrabold text-grape"
              style={{ background: 'color-mix(in srgb, #7C5CFF 12%, var(--surface))' }}
            >
              🤫 Only you see your target. Nail a clue that lands the dial there!
            </div>
            <div className="card-pop p-3">
              <Dial
                value={50}
                target={myCard.target}
                showTarget
                bands={BANDS}
                leftLabel={myCard.prompt.left}
                rightLabel={myCard.prompt.right}
              />
            </div>
            <input
              autoFocus
              className="input-pop"
              data-testid="clue-input"
              placeholder="Your clue (a word or two)…"
              maxLength={60}
              value={clue}
              onChange={(e) => setClue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && clue.trim() && submit()}
            />
            <button
              className="btn-primary w-full"
              data-testid="submit-clue"
              disabled={!clue.trim()}
              onClick={submit}
            >
              📣 Lock in clue ({done}/{total} in)
            </button>
          </>
        )}
      </div>
    </Stage>
  );

  function submit() {
    playSfx('ready');
    send({ t: 'SUBMIT_CLUE', clue: clue.trim() });
  }
}
