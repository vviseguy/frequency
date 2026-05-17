// Host-facing topic chooser. Each pack is a little Memphis card with its
// emoji drifting in the background. Selection is shared via game state.
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { loadCatalog } from '../game/prompts';
import type { PackMeta, RoomState } from '../game/types';
import { send, useIsHost } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';

function CardEmojis({ emoji }: { emoji: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-25" aria-hidden>
      {[
        { top: '8%', left: '10%', d: '7s' },
        { top: '55%', left: '70%', d: '9s' },
        { top: '30%', left: '45%', d: '8s' },
      ].map((s, i) => (
        <span
          key={i}
          className="absolute animate-drift text-2xl"
          style={{ top: s.top, left: s.left, animationDuration: s.d }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

export function TopicPicker({ room, onClose }: { room: RoomState; onClose: () => void }) {
  const isHost = useIsHost();
  const [packs, setPacks] = useState<PackMeta[]>([]);
  useEffect(() => {
    loadCatalog().then((c) => setPacks(c.packs));
  }, []);

  const allIds = packs.map((p) => p.id);
  const selected = new Set(room.packs.length ? room.packs : allIds);
  const totalPrompts = packs
    .filter((p) => selected.has(p.id))
    .reduce((n, p) => n + p.count, 0);

  function commit(next: Set<string>) {
    if (!isHost) return;
    playSfx('pop');
    // empty or "everything" both mean "all topics" -> []
    send({ t: 'SET_PACKS', packs: next.size === 0 || next.size === allIds.length ? [] : [...next] });
  }
  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (next.size === 0) next.add(id); // never allow zero topics
    commit(next);
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex flex-col items-center overflow-y-auto p-4 backdrop-blur-sm"
        style={{ background: 'color-mix(in srgb, var(--page) 88%, transparent)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="flex w-full max-w-md flex-col gap-4 py-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl font-black">🎲 Topics</h2>
            <button className="btn-ghost px-4 py-2 text-base" onClick={onClose}>
              Done
            </button>
          </div>

          <div className="flex gap-2">
            <button
              className="btn-fun flex-1 py-2 text-sm"
              disabled={!isHost}
              onClick={() => commit(new Set(allIds))}
            >
              ✨ All topics
            </button>
            <span className="chip flex-1 justify-center text-sm">
              {selected.size}/{allIds.length || '–'} · {totalPrompts} prompts
            </span>
          </div>

          {!isHost && (
            <p className="text-center text-sm font-bold" style={{ color: 'var(--text-soft)' }}>
              The host picks the topics — hang tight!
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {packs.map((p) => {
              const on = selected.has(p.id);
              return (
                <motion.button
                  key={p.id}
                  layout
                  whileTap={{ scale: 0.95 }}
                  disabled={!isHost}
                  onClick={() => toggle(p.id)}
                  className="card-pop relative overflow-hidden p-3 text-left"
                  style={{
                    outline: on ? '4px solid #7C5CFF' : 'none',
                    opacity: on ? 1 : 0.55,
                  }}
                >
                  <CardEmojis emoji={p.emoji} />
                  <div className="relative">
                    <div className="text-3xl">{p.emoji}</div>
                    <div className="font-display text-lg font-black leading-tight">{p.name}</div>
                    <div className="text-xs font-extrabold" style={{ color: 'var(--text-soft)' }}>
                      {p.count} prompts
                    </div>
                    <div className="mt-1 font-display text-sm font-black text-grape">
                      {on ? '✓ included' : 'tap to add'}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
