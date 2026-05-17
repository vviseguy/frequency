// The spectrum dial: a 180° SVG gauge. Drag anywhere on it (mouse or thumb).
// The hidden target + colored scoring bands animate in at the reveal.
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { playSfx } from '../hooks/useSound';

const W = 360;
const H = 210;
const CX = W / 2;
const CY = H - 18;
const R = 150;

const polar = (value: number, r = R) => {
  const t = Math.PI - (clamp(value) / 100) * Math.PI;
  return { x: CX + r * Math.cos(t), y: CY - r * Math.sin(t) };
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

/** Thick arc path between two spectrum values, at radius r. */
function arc(v1: number, v2: number, r: number) {
  const a = polar(Math.min(v1, v2), r);
  const b = polar(Math.max(v1, v2), r);
  const large = 0;
  // sweep flag 0 because we go right(0)->left(180) decreasing angle
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
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
  // While locally dragging show our own value instantly; otherwise follow state.
  const [local, setLocal] = useState(value);
  useEffect(() => {
    if (!dragging) setLocal(value);
  }, [value, dragging]);

  const shown = dragging ? local : value;
  const handle = polar(shown);

  const valueFromEvent = useCallback((e: PointerEvent | React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return 50;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    const dx = px - CX;
    const dy = CY - py;
    let ang = Math.atan2(dy, dx); // 0..π across the top
    if (ang < 0) ang = px < CX ? Math.PI : 0; // below the line -> snap to nearest end
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
    if ('vibrate' in navigator) navigator.vibrate?.(8);
    onChange?.(v);
  };
  const move = (e: React.PointerEvent) => {
    if (!dragging || !interactive) return;
    const v = valueFromEvent(e);
    setLocal(v);
    if (Math.abs(v - lastTick.current) >= 4) {
      lastTick.current = v;
      playSfx('tick');
      if ('vibrate' in navigator) navigator.vibrate?.(3);
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
        {/* base track */}
        <path d={arc(0, 100, R)} fill="none" stroke="#1A1626" strokeWidth="26" strokeLinecap="round" />
        <path d={arc(0, 100, R)} fill="none" stroke="#FBF3E4" strokeWidth="18" strokeLinecap="round" />

        {/* scoring bands — revealed at the end */}
        {showBands && target != null && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <path d={arc(target - bands.somewhat, target + bands.somewhat, R)} fill="none" stroke="#5BC8FF" strokeWidth="18" strokeLinecap="round" />
            <path d={arc(target - bands.close, target + bands.close, R)} fill="none" stroke="#9BE564" strokeWidth="18" strokeLinecap="round" />
            <path d={arc(target - bands.bullseye, target + bands.bullseye, R)} fill="none" stroke="#FFD93D" strokeWidth="18" strokeLinecap="round" />
          </motion.g>
        )}

        {/* tick marks */}
        {Array.from({ length: 11 }, (_, i) => {
          const o = polar(i * 10, R + 14);
          const a = polar(i * 10, R + 4);
          return <line key={i} x1={o.x} y1={o.y} x2={a.x} y2={a.y} stroke="#1A1626" strokeWidth="3" />;
        })}

        {/* hidden target needle */}
        {showTarget && target != null && (
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 9 }}
            style={{ originX: `${CX}px`, originY: `${CY}px` }}
          >
            <line
              x1={CX}
              y1={CY}
              x2={polar(target, R - 4).x}
              y2={polar(target, R - 4).y}
              stroke="#FF6B6B"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle cx={polar(target, R - 4).x} cy={polar(target, R - 4).y} r="9" fill="#FF6B6B" stroke="#1A1626" strokeWidth="3" />
          </motion.g>
        )}

        {/* the team's pointer */}
        <motion.g
          animate={{ x: handle.x, y: handle.y }}
          transition={dragging ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 16 }}
        >
          <g transform={`translate(${-CX} ${-CY})`}>
            <line x1={CX} y1={CY} x2={handle.x} y2={handle.y} stroke="#1A1626" strokeWidth="6" strokeLinecap="round" />
            <circle cx={handle.x} cy={handle.y} r="16" fill={draggerColor} stroke="#1A1626" strokeWidth="4" />
            {draggerName && (
              <circle cx={handle.x} cy={handle.y} r="22" fill="none" stroke={draggerColor} strokeWidth="3" className="animate-pulse-ring" />
            )}
          </g>
        </motion.g>

        {/* hub */}
        <circle cx={CX} cy={CY} r="12" fill="#1A1626" />
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
        <p className="mt-2 text-center font-display text-sm font-extrabold text-ink/70">
          🎚️ {draggerName} is steering…
        </p>
      )}
    </div>
  );
}
