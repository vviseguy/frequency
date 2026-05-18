import { motion } from 'framer-motion';
import { Crown, X } from 'lucide-react';
import type { Player } from '../game/types';

export function PlayerChip({
  player,
  isHost,
  isPsychic,
  isYou,
  showScore,
  onKick,
  armed,
}: {
  player: Player;
  isHost?: boolean;
  isPsychic?: boolean;
  isYou?: boolean;
  showScore?: boolean;
  onKick?: () => void; // shown only when provided (host, others)
  armed?: boolean; // first tap arms, second confirms
}) {
  const name = player.name.replace(/^\p{Emoji}\s*/u, '');
  return (
    <motion.div
      layout
      data-testid="player-chip"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: player.connected ? 1 : 0.45 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      className="chip bg-white"
      style={{ borderColor: '#1A1626', boxShadow: `3px 3px 0 0 ${player.color}` }}
    >
      <span className="text-lg leading-none">{player.emoji}</span>
      <span className="font-display max-w-[8rem] truncate">{name}</span>
      {isYou && <span className="rounded-full bg-grape px-1.5 text-[10px] font-black text-white">YOU</span>}
      {isHost && <Crown size={16} strokeWidth={2.5} className="text-tangerine" aria-label="host" />}
      {isPsychic && (
        <span className="rounded-full bg-grape px-1.5 text-[10px] font-black text-white">CLUE</span>
      )}
      {!player.connected && <span className="text-[10px] font-black text-ink/50">offline</span>}
      {showScore && (
        <span className="font-display ml-1 rounded-full bg-ink px-2 text-sm font-black text-white">
          {player.totalScore}
        </span>
      )}
      {onKick &&
        (armed ? (
          <button
            onClick={onKick}
            className="ml-1 rounded-full bg-coral px-2 text-[10px] font-black text-white"
            title="Confirm remove"
          >
            Remove?
          </button>
        ) : (
          <button
            onClick={onKick}
            aria-label={`remove ${name}`}
            title="Remove player"
            className="ml-1 grid h-5 w-5 place-items-center rounded-full border-2 border-ink text-ink/60"
          >
            <X size={12} strokeWidth={3} />
          </button>
        ))}
    </motion.div>
  );
}
