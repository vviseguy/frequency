import { motion } from 'framer-motion';
import { Dices } from 'lucide-react';
import { useState } from 'react';
import { Logo, Stage } from '../components/Stage';
import { netCtl } from '../hooks/useNet';
import { unlockAudio, playSfx } from '../hooks/useSound';
import { toast } from '../hooks/useToast';
import { getSavedName, lastRoom, randomName, rememberRoom, saveName, wasHostOf } from '../lib/identity';
import { isValidCode, normalizeCode, roomFromUrl } from '../net/roomCode';

export function HomeScreen() {
  const [name, setName] = useState(getSavedName());
  const [code, setCode] = useState(roomFromUrl() ?? '');
  const [busy, setBusy] = useState<'host' | 'join' | null>(null);
  const prefilled = !!roomFromUrl();
  const previous = lastRoom();

  const begin = () => {
    unlockAudio();
    playSfx('join');
    saveName(name.trim() || '🎈 Player');
  };

  const host = async () => {
    begin();
    setBusy('host');
    try {
      const c = await netCtl.createRoom(name.trim() || '🎈 Player');
      if (c) rememberRoom(c);
    } catch {
      setBusy(null);
    }
  };

  const join = async (c: string) => {
    const cc = normalizeCode(c);
    if (!isValidCode(cc)) return;
    begin();
    setBusy('join');
    try {
      await netCtl.joinRoom(cc, name.trim() || '🎈 Player');
      rememberRoom(cc);
    } catch {
      setBusy(null);
      if (wasHostOf(cc)) {
        // we created that room before — its code is gone, so just open a
        // fresh waiting room and keep the party going
        toast('That game ended — started you a fresh room.', 'info');
        host();
      } else {
        toast(`No game found for "${cc}". Double-check the code?`);
      }
    }
  };

  return (
    <Stage>
      <div className="flex flex-col gap-5">
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        >
          <Logo />
          <p
            className="mt-2 text-center font-display text-base font-extrabold"
            style={{ color: 'var(--text-soft)' }}
          >
            Read the room. Move the dial.
          </p>
        </motion.div>

        <div className="card-pop flex flex-col gap-3 p-5">
          <div className="flex gap-2">
            <input
              className="input-pop"
              data-testid="name-input"
              value={name}
              maxLength={18}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
            <button
              type="button"
              aria-label="shuffle name"
              title="Shuffle name"
              className="btn-ghost shrink-0 px-3"
              onClick={() => {
                const n = randomName(name);
                setName(n);
                saveName(n);
              }}
            >
              <Dices size={20} strokeWidth={2.5} />
            </button>
          </div>
          <button
            className="btn-primary w-full"
            data-testid="host-btn"
            disabled={!!busy}
            onClick={host}
          >
            {busy === 'host' ? 'Spinning up…' : 'Host a new game'}
          </button>

          <div className="my-1 flex items-center gap-3" style={{ color: 'var(--text-soft)' }}>
            <span className="h-0.5 flex-1" style={{ background: 'var(--text-soft)' }} />
            <span className="font-display text-xs font-extrabold">OR JOIN</span>
            <span className="h-0.5 flex-1" style={{ background: 'var(--text-soft)' }} />
          </div>

          <div className="flex gap-2">
            <input
              className="input-pop text-center font-display text-2xl uppercase tracking-[0.3em]"
              data-testid="code-input"
              value={code}
              maxLength={4}
              autoCapitalize="characters"
              placeholder="CODE"
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && join(code)}
            />
            <button
              className="btn-fun shrink-0"
              data-testid="join-btn"
              disabled={!!busy || !isValidCode(normalizeCode(code))}
              onClick={() => join(code)}
            >
              {busy === 'join' ? '…' : 'Go'}
            </button>
          </div>

          {prefilled && busy === 'join' && (
            <p className="text-center text-sm font-bold text-grape">
              Reconnecting to {normalizeCode(code)}…
            </p>
          )}
          {previous && !prefilled && (
            <button
              className="text-center text-sm font-extrabold underline"
              style={{ color: 'var(--text-soft)' }}
              onClick={() => join(previous)}
            >
              Rejoin your last room ({previous})
            </button>
          )}
        </div>
      </div>
    </Stage>
  );
}
