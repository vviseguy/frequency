// A small, budgeted reaction bar — each player gets only a few reactions per
// guess-turn (same as the number of clues they give) so the screen stays calm.
import { useEffect, useRef, useState } from 'react';
import { reactionBudget } from '../game/types';
import { useRoom, send } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';

const EMOJIS = ['😂', '🎉', '🔥', '😮', '😭', '👏', '🤯', '💖'];

export function ReactionBar() {
  const room = useRoom();
  const budget = reactionBudget(room?.setsTarget ?? 3);
  const turnKey = room?.set ? `${room.set.index}:${room.set.guessIndex}` : room?.phase ?? 'x';

  const [used, setUsed] = useState(0);
  const key = useRef(turnKey);
  useEffect(() => {
    if (key.current !== turnKey) {
      key.current = turnKey;
      setUsed(0);
    }
  }, [turnKey]);

  const left = Math.max(0, budget - used);
  const spent = left === 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {EMOJIS.map((e) => (
          <button
            key={e}
            aria-label={`react ${e}`}
            disabled={spent}
            onClick={() => {
              if (spent) return;
              setUsed((u) => u + 1);
              playSfx('pop');
              send({ t: 'REACTION', emoji: e });
            }}
            className="grid h-11 w-11 place-items-center rounded-full border-3 border-ink bg-white text-2xl
              shadow-pop-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5
              disabled:opacity-30"
          >
            {e}
          </button>
        ))}
      </div>
      <p className="text-[11px] font-extrabold" style={{ color: 'var(--text-soft)' }}>
        {spent ? 'out of reactions this turn' : `${left} reaction${left === 1 ? '' : 's'} left`}
      </p>
    </div>
  );
}
