// Host-facing topic chooser. Selected packs fill purple (no odd outline).
// Each card drifts a few of the pack's emojis in the background.
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { loadCatalog } from '../game/prompts';
import type { PackMeta, RoomState } from '../game/types';
import { send, useIsHost } from '../hooks/useNet';
import { splitEmojis } from '../lib/emoji';

function CardEmojis({ emojis, on }: { emojis: string[]; on: boolean }) {
  const spots = [
    { top: '10%', left: '8%', d: '7s' },
    { top: '58%', left: '72%', d: '9s' },
    { top: '34%', left: '46%', d: '8s' },
    { top: '74%', left: '20%', d: '10s' },
  ];
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${on ? 'opacity-30' : 'opacity-20'}`} aria-hidden>
      {spots.map((s, i) => (
        <span
          key={i}
          className="absolute animate-drift text-2xl"
          style={{ top: s.top, left: s.left, animationDuration: s.d }}
        >
          {emojis[i % emojis.length]}
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
  const totalPrompts = packs.filter((p) => selected.has(p.id)).reduce((n, p) => n + p.count, 0);

  function commit(next: Set<string>) {
    if (!isHost) return;
    send({ t: 'SET_PACKS', packs: next.size === 0 || next.size === allIds.length ? [] : [...next] });
  }
  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (next.size === 0) next.add(id);
    commit(next);
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] overflow-y-auto p-5 backdrop-blur-md"
        style={{ background: 'color-mix(in srgb, var(--page) 86%, transparent)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-3xl font-black">Topics</h2>
            <button className="btn-ghost px-5 py-2 text-base" onClick={onClose}>
              Done
            </button>
          </div>

          <div className="flex gap-2">
            <button
              className="btn-fun flex-1 px-4 py-2 text-sm"
              disabled={!isHost}
              onClick={() => commit(new Set(allIds))}
            >
              All topics
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
              const emojis = splitEmojis(p.emoji);
              return (
                <motion.button
                  key={p.id}
                  layout
                  whileTap={{ scale: 0.95 }}
                  disabled={!isHost}
                  onClick={() => toggle(p.id)}
                  className="card-pop relative overflow-hidden p-4 text-left transition-colors"
                  style={
                    on
                      ? { background: '#7C5CFF', color: '#fff', borderColor: 'var(--line)' }
                      : { opacity: 0.7 }
                  }
                >
                  <CardEmojis emojis={emojis} on={on} />
                  <div className="relative">
                    <div className="text-3xl">{emojis.slice(0, 3).join('')}</div>
                    <div className="font-display mt-1 text-lg font-black leading-tight">{p.name}</div>
                    <div
                      className="text-xs font-extrabold"
                      style={{ color: on ? 'rgba(255,255,255,0.75)' : 'var(--text-soft)' }}
                    >
                      {p.count} prompts
                    </div>
                    <div className={`mt-2 font-display text-sm font-black ${on ? 'text-white' : 'text-grape'}`}>
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
