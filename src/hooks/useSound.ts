// Procedural sound via WebAudio — zero audio assets to ship or set up.
// Unlocked on the first user gesture (required by iOS Safari).
import { useSyncExternalStore } from 'react';

type Sfx =
  | 'tick'
  | 'grab'
  | 'release'
  | 'ready'
  | 'reveal'
  | 'score2'
  | 'score3'
  | 'score4'
  | 'whiff'
  | 'pop'
  | 'win'
  | 'join';

let ctx: AudioContext | null = null;
let muted = localStorage.getItem('freq.muted') === '1';
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function ensure(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function blip(
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  when = 0,
  gain = 0.18,
  slideTo?: number,
) {
  const ac = ensure();
  if (!ac) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function arpeggio(notes: number[], step: number, type: OscillatorType = 'triangle', gain = 0.2) {
  notes.forEach((n, i) => blip(n, step * 1.7, type, i * step, gain));
}

export function playSfx(name: Sfx) {
  switch (name) {
    case 'tick':
      return blip(420, 0.04, 'square', 0, 0.05);
    case 'grab':
      return blip(220, 0.09, 'sine', 0, 0.16, 360);
    case 'release':
      return blip(360, 0.08, 'sine', 0, 0.14, 220);
    case 'ready':
      return arpeggio([523, 784], 0.07, 'triangle', 0.16);
    case 'pop':
      return blip(680, 0.09, 'triangle', 0, 0.18, 980);
    case 'join':
      return arpeggio([392, 523], 0.08, 'sine', 0.14);
    case 'reveal':
      return arpeggio([330, 392, 494, 587], 0.075, 'sawtooth', 0.12);
    case 'whiff':
      return blip(180, 0.4, 'sawtooth', 0, 0.14, 70);
    case 'score2':
      return arpeggio([392, 494], 0.1, 'triangle', 0.18);
    case 'score3':
      return arpeggio([392, 494, 587], 0.1, 'triangle', 0.2);
    case 'score4':
      return arpeggio([523, 659, 784, 1047], 0.11, 'triangle', 0.22);
    case 'win':
      return arpeggio([523, 659, 784, 1047, 784, 1047, 1319], 0.13, 'triangle', 0.22);
  }
}

/** Call once from a user gesture to satisfy iOS autoplay rules. */
export function unlockAudio() {
  ensure();
}

export function toggleMute() {
  muted = !muted;
  localStorage.setItem('freq.muted', muted ? '1' : '0');
  emit();
}

export function useMuted(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => muted,
  );
}
