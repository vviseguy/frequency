// 180° spectrum dial. One pointer from a big centre hub that overshoots the
// meter a touch. Scoring zones are clamped to the meter (anything past an
// edge is simply cut off) and labelled 2·3·4·3·2 on both sides where they
// fall on the meter.
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { playSfx } from '../hooks/useSound';

const W = 360;
const H = 212;
const CX = W / 2;
const CY = 178;
const R = 140;
const clamp = (n: number) => Math.max(0, Math.min(100, n));

function pol(v: number, r = R) {
  const a = Math.PI * (1 - clamp(v) / 100); // clamp -> zones cut at the edges
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}
function arc(v1: number, v2: number, r: number) {
  const a = pol(Math.min(v1, v2), r);
  const b = pol(Math.max(v1, v2), r);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export interface DialMarker {
  value: number;
  color: string;
  emoji?: string;
}

interface DialProps {
  value: number;
  target?: number;
  showTarget?: boolean;
  showBands?: boolean;
  interactive?: boolean;
  pointer?: boolean; // draw the steering pointer (off for classic reveal)
  bands: { bullseye: number; close: number; somewhat: number };
  markers?: DialMarker[]; // classic reveal: each guesser's guess
  draggerName?: string | null;
  draggerEmoji?: string;
  draggerColor?: string;
  leftLabel: string;
  rightLabel: string;
  onGrab?: () => void;
  onChange?: (v: number) => void;
  onRelease?: () => void;
}

export function Dial({
  value,
  target,
  showTarget,
  showBands,
  interactive,
  pointer = true,
  bands,
  markers,
  draggerName,
  draggerEmoji,
  draggerColor = '#7C5CFF',
  leftLabel,
  rightLabel,
  onGrab,
  onChange,
  onRelease,
}: DialProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const lastTick = useRef(0);
  const [local, setLocal] = useState(value);
  useEffect(() => {
    if (!dragging) setLocal(value);
  }, [value, dragging]);

  const shown = dragging ? local : value;
  const tip = pol(shown, R + 14);

  const valueFromEvent = useCallback((e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return 50;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    let a = Math.atan2(CY - py, px - CX);
    if (a < 0) a = px < CX ? Math.PI : 0;
    return clamp((1 - a / Math.PI) * 100);
  }, []);

  const begin = (e: React.PointerEvent) => {
    if (!interactive) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    const v = valueFromEvent(e);
    setLocal(v);
    onGrab?.();
    playSfx('grab');
    navigator.vibrate?.(8);
    onChange?.(v);
  };
  const move = (e: React.PointerEvent) => {
    if (!dragging || !interactive) return;
    const v = valueFromEvent(e);
    setLocal(v);
    if (Math.abs(v - lastTick.current) >= 4) {
      lastTick.current = v;
      playSfx('tick');
      navigator.vibrate?.(3);
    }
    onChange?.(v);
  };
  const end = () => {
    if (!dragging) return;
    setDragging(false);
    onRelease?.();
    playSfx('release');
  };

  const labels: { v: number; n: number }[] = [];
  if (showBands && target != null) {
    const push = (v: number, n: number) => {
      if (v >= 2 && v <= 98) labels.push({ v, n });
    };
    push(target - (bands.close + bands.somewhat) / 2, 2);
    push(target - (bands.bullseye + bands.close) / 2, 3);
    push(target, 4);
    push(target + (bands.bullseye + bands.close) / 2, 3);
    push(target + (bands.close + bands.somewhat) / 2, 2);
  }

  const targetPt = target != null ? pol(target) : null;

  return (
    <div className="w-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full ${interactive ? 'no-touch-scroll cursor-grab active:cursor-grabbing' : ''}`}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        role="slider"
        aria-valuenow={Math.round(shown)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={interactive ? 0 : -1}
        onKeyDown={(e) => {
          if (!interactive) return;
          if (e.key === 'ArrowLeft') onChange?.(clamp(value - 2));
          if (e.key === 'ArrowRight') onChange?.(clamp(value + 2));
        }}
      >
        <path d={arc(0, 100, R)} fill="none" stroke="var(--line)" strokeWidth="26" strokeLinecap="round" />
        <path d={arc(0, 100, R)} fill="none" stroke="var(--surface)" strokeWidth="18" strokeLinecap="round" />

        {showBands && target != null && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <path d={arc(target - bands.somewhat, target + bands.somewhat, R)} fill="none" stroke="#5BC8FF" strokeWidth="18" strokeLinecap="butt" />
            <path d={arc(target - bands.close, target + bands.close, R)} fill="none" stroke="#9BE564" strokeWidth="18" strokeLinecap="butt" />
            <path d={arc(target - bands.bullseye, target + bands.bullseye, R)} fill="none" stroke="#FFD93D" strokeWidth="18" strokeLinecap="butt" />
            {labels.map((l, i) => {
              const p = pol(l.v, R);
              return (
                <text
                  key={i}
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="font-display"
                  fontSize="15"
                  fontWeight="900"
                  fill="#1A1626"
                >
                  {l.n}
                </text>
              );
            })}
          </motion.g>
        )}

        {/* classic reveal: every guesser's guess */}
        {markers?.map((m, i) => {
          const a = pol(m.value, R + 4);
          const b = pol(m.value, R - 14);
          return (
            <motion.g
              key={i}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.06, type: 'spring', stiffness: 300, damping: 14 }}
              style={{ originX: `${a.x}px`, originY: `${a.y}px` }}
            >
              <line x1={b.x} y1={b.y} x2={a.x} y2={a.y} stroke="var(--line)" strokeWidth="4" strokeLinecap="round" />
              <circle cx={a.x} cy={a.y} r="9" fill={m.color} stroke="var(--line)" strokeWidth="3" />
            </motion.g>
          );
        })}

        {/* hidden target — pops in place near the bar */}
        {showTarget && targetPt && (
          <motion.g
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 12 }}
            style={{ originX: `${targetPt.x}px`, originY: `${targetPt.y}px` }}
          >
            <line x1={pol(target!, R - 22).x} y1={pol(target!, R - 22).y} x2={pol(target!, R + 14).x} y2={pol(target!, R + 14).y} stroke="#FF6B6B" strokeWidth="5" strokeLinecap="round" />
            <circle cx={pol(target!, R + 14).x} cy={pol(target!, R + 14).y} r="6" fill="#FF6B6B" stroke="var(--line)" strokeWidth="2.5" />
          </motion.g>
        )}

        {/* pointer (no tip knob) + pulse ring near the bar for the dragger */}
        {pointer && (
          <>
            <line
              x1={CX}
              y1={CY}
              x2={tip.x}
              y2={tip.y}
              stroke="var(--line)"
              strokeWidth="7"
              strokeLinecap="round"
              style={{ transition: dragging ? 'none' : 'all 0.18s ease-out' }}
            />
            {draggerName && !dragging && (
              <circle cx={tip.x} cy={tip.y} r="11" fill="none" stroke={draggerColor} strokeWidth="3" className="animate-pulse-ring" />
            )}
          </>
        )}

        <circle cx={CX} cy={CY} r={pointer ? 22 : 12} fill={draggerColor} stroke="var(--line)" strokeWidth="5" />
        <circle cx={CX} cy={CY} r={pointer ? 7 : 4} fill="var(--line)" />
      </svg>

      <div className="-mt-1 flex items-stretch justify-between gap-3 px-1">
        <div className="flex max-w-[46%] items-center gap-1.5">
          <span className="font-display text-xl font-black text-grape">◀</span>
          <span className="font-display text-base font-extrabold leading-tight text-grape">
            {leftLabel}
          </span>
        </div>
        <div className="flex max-w-[46%] items-center gap-1.5 text-right">
          <span className="font-display text-base font-extrabold leading-tight text-coral">
            {rightLabel}
          </span>
          <span className="font-display text-xl font-black text-coral">▶</span>
        </div>
      </div>

      <AnimatePresence>
        {draggerName && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="mt-2 text-center font-display text-sm font-extrabold"
          >
            <span
              className="inline-flex items-center gap-1 rounded-full border-3 border-ink px-3 py-1"
              style={{ background: 'var(--surface)' }}
            >
              {draggerEmoji && <span>{draggerEmoji}</span>}
              {draggerName} is steering…
            </span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
