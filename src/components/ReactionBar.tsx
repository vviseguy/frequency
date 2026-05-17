// Bottom-of-screen reactions. Emojis live here on purpose. Unlimited to
// send; the screen just spawns fewer copies per click in bigger rooms.
// The sound (per-emoji) plays from FloatingEmojis so everyone hears it once.
import { send } from '../hooks/useNet';

const EMOJIS = ['😂', '🎉', '🔥', '😮', '😭', '👏', '🤯', '💖'];

export function ReactionBar() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {EMOJIS.map((e) => (
        <button
          key={e}
          aria-label={`react ${e}`}
          onClick={() => send({ t: 'REACTION', emoji: e })}
          className="grid h-11 w-11 place-items-center rounded-full border-3 border-ink bg-white text-2xl
            shadow-pop-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
        >
          {e}
        </button>
      ))}
    </div>
  );
}
