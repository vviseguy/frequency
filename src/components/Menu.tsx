// Top-left Memphis "spread" menu: a playful FAB that springs open a stack
// of round option buttons.
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { toggleMute, useMuted } from '../hooks/useSound';
import { toggleTheme, useTheme } from '../hooks/useTheme';
import { netCtl } from '../hooks/useNet';
import { useNetStore } from '../net/netStore';

const README = 'https://github.com/vviseguy/frequency#readme';

function Round({
  label,
  emoji,
  onClick,
  tone = 'ghost',
}: {
  label: string;
  emoji: string;
  onClick: () => void;
  tone?: 'ghost' | 'danger' | 'fun';
}) {
  const bg =
    tone === 'danger' ? 'bg-coral text-white' : tone === 'fun' ? 'bg-sun text-ink' : 'bg-white';
  return (
    <motion.button
      initial={{ scale: 0, x: -20, opacity: 0 }}
      animate={{ scale: 1, x: 0, opacity: 1 }}
      exit={{ scale: 0, x: -20, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border-3 border-ink ${bg} py-2 pl-2 pr-4
        text-sm font-display font-extrabold shadow-pop-sm`}
    >
      <span className="grid h-8 w-8 place-items-center rounded-full text-lg">{emoji}</span>
      {label}
    </motion.button>
  );
}

export function Menu() {
  const [open, setOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const muted = useMuted();
  const theme = useTheme();
  const role = useNetStore((s) => s.role);
  const inRoom = role !== 'none';

  return (
    <div className="fixed left-2 top-2 z-50 flex flex-col items-start gap-2">
      <motion.button
        aria-label="menu"
        onClick={() => {
          setOpen((o) => !o);
          setConfirmLeave(false);
        }}
        animate={{ rotate: open ? 90 : 0 }}
        className="grid h-11 w-11 place-items-center rounded-full border-3 border-ink bg-grape
          text-xl text-white shadow-pop-sm"
      >
        {open ? '✕' : '☰'}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div className="flex flex-col items-start gap-2">
            <Round
              label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              emoji={theme === 'dark' ? '☀️' : '🌙'}
              onClick={toggleTheme}
            />
            <Round
              label={muted ? 'Sound on' : 'Sound off'}
              emoji={muted ? '🔈' : '🔊'}
              onClick={toggleMute}
            />
            <Round
              label="How to play"
              emoji="❔"
              onClick={() => window.open(README, '_blank', 'noopener')}
            />
            {inRoom &&
              (confirmLeave ? (
                <Round
                  label="Tap to confirm leave"
                  emoji="⚠️"
                  tone="danger"
                  onClick={() => {
                    netCtl.leave();
                    setOpen(false);
                    setConfirmLeave(false);
                  }}
                />
              ) : (
                <Round
                  label="Leave game"
                  emoji="🚪"
                  tone="danger"
                  onClick={() => setConfirmLeave(true)}
                />
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
