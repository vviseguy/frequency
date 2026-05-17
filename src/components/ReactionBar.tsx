// Bottom-of-screen reactions. Emojis stay here on purpose (this is the one
// place they belong). Unlimited to send — we just spawn fewer copies per
// click in bigger rooms so the screen never floods.
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
          className="grid h-11 w-11 place-items-center rounded-full border-3 border-ink bg-white text-2xl
            shadow-pop-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
        >
          {e}
        </button>
      ))}
    </div>
  );
}
