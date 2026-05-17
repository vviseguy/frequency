// 180° spectrum dial. One pointer from a big centre hub that overshoots the
// meter slightly. Scoring zones keep their true width and continue *past*
// the meter edge (it's genuinely impossible to score out there) instead of
// squishing. Each zone is labelled with its point value.
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { playSfx } from '../hooks/useSound';

const W = 360;
const H = 250;
const CX = W / 2;
const CY = 168;
const R = 140;
const clamp = (n: number) => Math.max(0, Math.min(100, n));

// value -> angle (deg). 0..100 spans 180°; values beyond keep the same
// scale so zones continue off the ends rather than compressing.
function ang(v: number) {
  return Math.PI * (1 - v / 100);
}
function pol(v: number, r = R) {
  const a = ang(v);
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}
function arc(v1: number, v2: number, r: number) {
  const a = pol(Math.min(v1, v2), r);
  const b = pol(Math.max(v1, v2), r);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

interface DialProps {
  value: number;
  target?: number;
  showTarget?: boolean;
  showBands?: boolean;
  interactive?: boolean;
  bands: { bullseye: number; close: number; somewhat: number };
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
  bands,
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
  const tip = pol(shown, R + 16); // pointer overshoots the meter a touch

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

  // point-value labels, only where they actually fall on the meter
  const labels: { v: number; n: number }[] = [];
  if (showBands && target != null) {
    const push = (v: number, n: number) => {
      if (v >= 3 && v <= 97) labels.push({ v, n });
    };
    push(target, 4);
    push(target - (bands.bullseye + bands.close) / 2, 3);
    push(target + (bands.bullseye + bands.close) / 2, 3);
    push(target - (bands.close + bands.somewhat) / 2, 2);
    push(target + (bands.close + bands.somewhat) / 2, 2);
  }

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
        {/* track */}
        <path d={arc(0, 100, R)} fill="none" stroke="var(--line)" strokeWidth="26" strokeLinecap="round" />
        <path d={arc(0, 100, R)} fill="none" stroke="var(--surface)" strokeWidth="18" strokeLinecap="round" />

        {/* scoring zones — continue past the meter edge, never squish */}
        {showBands && target != null && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>
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

        {/* hidden target marker */}
        {showTarget && target != null && (
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 9 }}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
          >
            <line
              x1={pol(target, R - 22).x}
              y1={pol(target, R - 22).y}
              x2={pol(target, R + 16).x}
              y2={pol(target, R + 16).y}
              stroke="#FF6B6B"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </motion.g>
        )}

        {/* the pointer — no tip knob, overshoots the meter */}
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

        {/* big solid centre hub */}
        <circle cx={CX} cy={CY} r="22" fill={draggerColor} stroke="var(--line)" strokeWidth="5" />
        <circle cx={CX} cy={CY} r="7" fill="var(--line)" />
      </svg>

      <div className="-mt-2 flex items-start justify-between gap-3 px-1">
        <span className="max-w-[44%] text-left font-display text-lg font-extrabold leading-tight text-grape">
          ◀ {leftLabel}
        </span>
        <span className="max-w-[44%] text-right font-display text-lg font-extrabold leading-tight text-coral">
          {rightLabel} ▶
        </span>
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
