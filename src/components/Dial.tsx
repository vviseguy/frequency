// A clean, centered 180° spectrum dial. Drag anywhere on it (mouse or
// thumb). Scoring zones have hard edges and only appear at the reveal.
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { playSfx } from '../hooks/useSound';

const W = 360;
const H = 196;
const CX = W / 2;
const CY = 172;
const R = 146;
const clamp = (n: number) => Math.max(0, Math.min(100, n));

function pt(value: number, r = R) {
  const t = Math.PI * (1 - clamp(value) / 100);
  return { x: CX + r * Math.cos(t), y: CY - r * Math.sin(t) };
}

/** Arc path between two spectrum values at radius r (right→left sweep). */
function arc(v1: number, v2: number, r: number) {
  const a = pt(Math.min(v1, v2), r);
  const b = pt(Math.max(v1, v2), r);
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
  const handle = pt(shown);
  const tgt = target != null ? pt(target) : null;

  const valueFromEvent = useCallback((e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return 50;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    let ang = Math.atan2(CY - py, px - CX); // 0..π across the top
    if (ang < 0) ang = px < CX ? Math.PI : 0;
    return clamp((1 - ang / Math.PI) * 100);
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
        <path d={arc(0, 100, R)} fill="none" stroke="var(--line)" strokeWidth="24" strokeLinecap="round" />
        <path d={arc(0, 100, R)} fill="none" stroke="var(--surface)" strokeWidth="16" strokeLinecap="round" />

        {/* hard-edged scoring zones, revealed at the end */}
        {showBands && target != null && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>
            <path d={arc(target - bands.somewhat, target + bands.somewhat, R)} fill="none" stroke="#5BC8FF" strokeWidth="16" strokeLinecap="butt" />
            <path d={arc(target - bands.close, target + bands.close, R)} fill="none" stroke="#9BE564" strokeWidth="16" strokeLinecap="butt" />
            <path d={arc(target - bands.bullseye, target + bands.bullseye, R)} fill="none" stroke="#FFD93D" strokeWidth="16" strokeLinecap="butt" />
          </motion.g>
        )}

        {/* hidden target */}
        {showTarget && tgt && (
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 9 }}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
          >
            <line x1={CX} y1={CY} x2={tgt.x} y2={tgt.y} stroke="#FF6B6B" strokeWidth="5" strokeLinecap="round" />
            <circle cx={tgt.x} cy={tgt.y} r="9" fill="#FF6B6B" stroke="var(--line)" strokeWidth="3" />
          </motion.g>
        )}

        {/* the team's pointer */}
        <line
          x1={CX}
          y1={CY}
          x2={handle.x}
          y2={handle.y}
          stroke="var(--line)"
          strokeWidth="6"
          strokeLinecap="round"
          style={{ transition: dragging ? 'none' : 'all 0.18s ease-out' }}
        />
        <circle
          cx={handle.x}
          cy={handle.y}
          r="15"
          fill={draggerColor}
          stroke="var(--line)"
          strokeWidth="4"
          style={{ transition: dragging ? 'none' : 'all 0.18s ease-out' }}
        />
        {draggerName && (
          <circle cx={handle.x} cy={handle.y} r="21" fill="none" stroke={draggerColor} strokeWidth="3" className="animate-pulse-ring" />
        )}

        <circle cx={CX} cy={CY} r="10" fill="var(--line)" />
      </svg>

      <div className="mt-1 flex items-start justify-between gap-3 px-1">
        <span className="max-w-[44%] text-left font-display text-lg font-extrabold leading-tight text-grape">
          ◀ {leftLabel}
        </span>
        <span className="max-w-[44%] text-right font-display text-lg font-extrabold leading-tight text-coral">
          {rightLabel} ▶
        </span>
      </div>

      {draggerName && (
        <p className="mt-2 text-center font-display text-sm font-extrabold" style={{ color: 'var(--text-soft)' }}>
          🎚️ {draggerName} is steering…
        </p>
      )}
    </div>
  );
}
