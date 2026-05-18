// Memphis "spread" menu — lives in the header. The toggle's shadow stays put
// (only the icon rotates) and opening blurs the main content behind it.
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  HelpCircle,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Pencil,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { setVolume, toggleMute, useMuted, useVolume } from '../hooks/useSound';
import { toggleTheme, useTheme } from '../hooks/useTheme';
import { netCtl, send, useMe } from '../hooks/useNet';
import { saveName } from '../lib/identity';
import { useNetStore } from '../net/netStore';
import { HowToPlay } from './HowToPlay';

function Item({
  label,
  icon,
  onClick,
  tone = 'ghost',
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: 'ghost' | 'danger';
}) {
  const bg = tone === 'danger' ? 'bg-coral text-white' : 'bg-white';
  return (
    <motion.button
      initial={{ scale: 0, x: -16, opacity: 0 }}
      animate={{ scale: 1, x: 0, opacity: 1 }}
      exit={{ scale: 0, x: -16, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-full border-3 border-ink ${bg} py-2 pl-2 pr-4
        font-display text-sm font-extrabold shadow-pop-sm`}
    >
      <span className="grid h-7 w-7 place-items-center">{icon}</span>
      {label}
    </motion.button>
  );
}

export function Menu() {
  const [open, setOpen] = useState(false);
  const [howTo, setHowTo] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [editName, setEditName] = useState<string | null>(null);
  const muted = useMuted();
  const volume = useVolume();
  const theme = useTheme();
  const me = useMe();
  const inRoom = useNetStore((s) => s.role) !== 'none';

  const commitName = () => {
    const n = (editName ?? '').trim();
    if (n) {
      send({ t: 'RENAME', name: n });
      saveName(n);
    }
    setEditName(null);
  };

  const close = () => {
    setOpen(false);
    setConfirmLeave(false);
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-40 backdrop-blur-md"
            style={{ background: 'color-mix(in srgb, var(--page) 30%, transparent)' }}
          />
        )}
      </AnimatePresence>

      <button
        aria-label="menu"
        onClick={() => (open ? close() : setOpen(true))}
        className="relative z-50 grid h-11 w-11 place-items-center rounded-full border-3 border-ink
          bg-grape text-white shadow-pop-sm"
      >
        <motion.span animate={{ rotate: open ? 90 : 0 }} className="grid place-items-center">
          {open ? <X size={22} strokeWidth={3} /> : <MenuIcon size={22} strokeWidth={3} />}
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div className="absolute left-0 top-12 z-50 flex w-56 flex-col items-start gap-2">
            <Item
              label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              icon={theme === 'dark' ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />}
              onClick={toggleTheme}
            />
            <Item
              label={muted ? 'Sound on' : 'Sound off'}
              icon={muted ? <VolumeX size={18} strokeWidth={2.5} /> : <Volume2 size={18} strokeWidth={2.5} />}
              onClick={toggleMute}
            />
            <motion.div
              initial={{ scale: 0, x: -16, opacity: 0 }}
              animate={{ scale: 1, x: 0, opacity: 1 }}
              exit={{ scale: 0, x: -16, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
              className="flex w-full items-center gap-2 rounded-full border-3 border-ink bg-white py-2 pl-2 pr-4 shadow-pop-sm"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center">
                <Volume2 size={18} strokeWidth={2.5} />
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                aria-label="volume"
                className="h-2 w-full cursor-pointer appearance-none rounded-full border-2 border-ink bg-sun accent-grape"
              />
            </motion.div>
            {inRoom &&
              me &&
              (editName !== null ? (
                <motion.div
                  initial={{ scale: 0, x: -16, opacity: 0 }}
                  animate={{ scale: 1, x: 0, opacity: 1 }}
                  exit={{ scale: 0, x: -16, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                  className="flex w-full items-center gap-2 rounded-full border-3 border-ink bg-white py-1.5 pl-3 pr-1.5 shadow-pop-sm"
                >
                  <input
                    autoFocus
                    value={editName}
                    maxLength={18}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && commitName()}
                    className="w-full bg-transparent font-display text-sm font-extrabold outline-none"
                    placeholder="New name"
                  />
                  <button
                    aria-label="save name"
                    onClick={commitName}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink bg-lime"
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>
                </motion.div>
              ) : (
                <Item
                  label="Change name"
                  icon={<Pencil size={18} strokeWidth={2.5} />}
                  onClick={() => setEditName(me.name)}
                />
              ))}
            <Item
              label="How to play"
              icon={<HelpCircle size={18} strokeWidth={2.5} />}
              onClick={() => {
                setHowTo(true);
                close();
              }}
            />
            {inRoom &&
              (confirmLeave ? (
                <Item
                  label="Tap to confirm leave"
                  icon={<AlertTriangle size={18} strokeWidth={2.5} />}
                  tone="danger"
                  onClick={() => {
                    netCtl.leave();
                    close();
                  }}
                />
              ) : (
                <Item
                  label="Leave game"
                  icon={<LogOut size={18} strokeWidth={2.5} />}
                  tone="danger"
                  onClick={() => setConfirmLeave(true)}
                />
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {howTo && <HowToPlay onClose={() => setHowTo(false)} />}
      </AnimatePresence>
    </div>
  );
}
