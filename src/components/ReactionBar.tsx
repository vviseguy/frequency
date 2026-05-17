import { send } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';

const EMOJIS = ['😂', '🎉', '🔥', '😮', '😭', '👏', '🤯', '💖'];

export function ReactionBar() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {EMOJIS.map((e) => (
        <button
          key={e}
          aria-label={`react ${e}`}
          onClick={() => {
            playSfx('pop');
            send({ t: 'REACTION', emoji: e });
          }}
          className="grid h-12 w-12 place-items-center rounded-full border-3 border-ink bg-white text-2xl
            shadow-pop-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
        >
          {e}
        </button>
      ))}
    </div>
  );
}
