import type { SoundKind } from "./DinoWorld";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(
  c: AudioContext,
  type: OscillatorType,
  f0: number,
  f1: number,
  start: number,
  dur: number,
  vol = 0.06
) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const t = c.currentTime + start;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function playSound(kind: SoundKind) {
  const c = getCtx();
  if (!c) return;
  if (kind === "jump") blip(c, "square", 420, 900, 0, 0.14);
  if (kind === "die") {
    blip(c, "sawtooth", 320, 50, 0, 0.45, 0.08);
    blip(c, "square", 160, 40, 0.05, 0.4, 0.05);
  }
  if (kind === "milestone") {
    blip(c, "square", 880, 880, 0, 0.08);
    blip(c, "square", 1175, 1175, 0.1, 0.12);
  }
}
