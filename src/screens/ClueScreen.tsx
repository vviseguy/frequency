import { useState } from 'react';
import { Dial } from '../components/Dial';
import { Timer } from '../components/Timer';
import { Stage } from '../components/Stage';
import { playerById, type RoomState } from '../game/types';
import { send, useMyId } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';

export function ClueScreen({ room }: { room: RoomState }) {
  const r = room.round!;
  const myId = useMyId();
  const psychic = playerById(room, r.psychicClientId);
  const mePsychic = r.psychicClientId === myId;
  const [clue, setClue] = useState('');

  return (
    <Stage>
      <div className="flex flex-1 flex-col gap-4 py-3">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-black">Round {r.index + 1}</p>
          <Timer endsAt={room.phaseEndsAt} total={room.config.clueSeconds} />
        </div>

        {mePsychic ? (
          <>
            <div className="card-pop bg-grape/10 p-3 text-center font-display font-extrabold text-grape">
              🤫 Only you can see the target. Give a clue that lands the dial here!
            </div>
            <div className="card-pop p-3">
              <Dial
                value={50}
                target={r.target}
                showTarget
                bands={room.config.bands}
                leftLabel={r.prompt.left}
                rightLabel={r.prompt.right}
              />
            </div>
            <input
              autoFocus
              className="input-pop"
              placeholder="Your clue (a word or two)…"
              maxLength={60}
              value={clue}
              onChange={(e) => setClue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && clue.trim() && submit()}
            />
            <button className="btn-primary w-full" disabled={!clue.trim()} onClick={submit}>
              📣 Lock in clue
            </button>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <div className="text-6xl animate-wiggle">🔮</div>
            <p className="font-display text-2xl font-black">
              {psychic?.name.replace(/^\p{Emoji}\s*/u, '')} is dreaming up a clue…
            </p>
            <div className="card-pop px-6 py-4">
              <p className="font-display text-lg font-extrabold">
                <span className="text-grape">{r.prompt.left}</span>
                <span className="mx-2 text-ink/30">↔</span>
                <span className="text-coral">{r.prompt.right}</span>
              </p>
            </div>
            <p className="font-display font-extrabold text-ink/40">No peeking. Build the suspense 👀</p>
          </div>
        )}
      </div>
    </Stage>
  );

  function submit() {
    playSfx('ready');
    send({ t: 'SUBMIT_CLUE', clue: clue.trim() });
  }
}
