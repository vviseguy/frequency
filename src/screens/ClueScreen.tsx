import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Dial } from '../components/Dial';
import { Stage } from '../components/Stage';
import { BANDS, cardsOwnedBy, clueProgress, type RoomState } from '../game/types';
import { send, useMyId } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';

export function ClueScreen({ room }: { room: RoomState }) {
  const myId = useMyId();
  const myCards = cardsOwnedBy(room, myId);
  const mineTotal = myCards.length;
  const nextIdx = myCards.findIndex((c) => c.clue == null);
  const cur = nextIdx >= 0 ? myCards[nextIdx] : null;
  const mineDone = myCards.filter((c) => c.clue != null).length;
  const players = clueProgress(room);
  const [clue, setClue] = useState('');

  // fresh input whenever we move on to the next clue
  useEffect(() => setClue(''), [nextIdx]);

  function submit() {
    if (!clue.trim()) return;
    playSfx('ready');
    send({ t: 'SUBMIT_CLUE', clue: clue.trim() });
    setClue('');
  }

  return (
    <Stage focus>
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <p className="font-display text-2xl font-black">Write your clues</p>
          <p className="font-display text-sm font-extrabold" style={{ color: 'var(--text-soft)' }}>
            All of them up front — no timer. {players.done}/{players.total} players done
          </p>
        </div>

        {mineTotal === 0 ? (
          <div className="card-pop flex flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="font-display text-xl font-black">You joined mid-game</p>
            <p className="font-bold" style={{ color: 'var(--text-soft)' }}>
              Sit tight — you’ll be dealt in next game. You can still guess!
            </p>
          </div>
        ) : cur ? (
          <>
            <div className="card-pop p-3">
              <p
                className="mb-1 text-center font-display text-sm font-extrabold"
                style={{ color: 'var(--text-soft)' }}
              >
                Clue {mineDone + 1} of {mineTotal} · the pointer is your secret target
              </p>
              <Dial
                value={cur.target}
                bands={BANDS}
                leftLabel={cur.prompt.left}
                rightLabel={cur.prompt.right}
              />
            </div>
            <input
              autoFocus
              className="input-pop"
              data-testid="clue-input"
              placeholder="A word or two that points here…"
              maxLength={60}
              value={clue}
              onChange={(e) => setClue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <button
              className="btn-primary w-full"
              data-testid="submit-clue"
              disabled={!clue.trim()}
              onClick={submit}
            >
              {mineDone + 1 < mineTotal ? 'Next clue' : 'Lock in last clue'}
            </button>
          </>
        ) : (
          <div className="card-pop flex flex-col items-center justify-center gap-3 p-8 text-center">
            <Check size={56} strokeWidth={3} className="text-lime" />
            <p className="font-display text-2xl font-black">All {mineTotal} clues in!</p>
            <p className="font-display text-lg font-extrabold">
              {players.done}/{players.total} players done
            </p>
            <p className="font-bold" style={{ color: 'var(--text-soft)' }}>
              Hang tight — the game starts when everyone’s finished.
            </p>
          </div>
        )}
      </div>
    </Stage>
  );
}
