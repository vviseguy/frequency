import { motion } from 'framer-motion';
import type { Player } from '../game/types';

export function PlayerChip({
  player,
  isHost,
  isPsychic,
  isYou,
  showScore,
}: {
  player: Player;
  isHost?: boolean;
  isPsychic?: boolean;
  isYou?: boolean;
  showScore?: boolean;
}) {
  const name = player.name.replace(/^\p{Emoji}\s*/u, '');
  return (
    <motion.div
      layout
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: player.connected ? 1 : 0.45 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      className="chip bg-white"
      style={{ borderColor: '#1A1626', boxShadow: `3px 3px 0 0 ${player.color}` }}
    >
      <span className="text-lg leading-none">{player.emoji}</span>
      <span className="font-display max-w-[8rem] truncate">{name}</span>
      {isYou && <span className="rounded-full bg-grape px-1.5 text-[10px] font-black text-white">YOU</span>}
      {isHost && <span title="Host" className="text-base">👑</span>}
      {isPsychic && <span title="Psychic" className="text-base">🔮</span>}
      {!player.connected && <span className="text-[10px] font-black text-ink/50">offline</span>}
      {showScore && (
        <span className="font-display ml-1 rounded-full bg-ink px-2 text-sm font-black text-white">
          {player.totalScore}
        </span>
      )}
    </motion.div>
  );
}
