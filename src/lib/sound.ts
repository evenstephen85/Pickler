let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/**
 * A context created before the first user gesture comes back suspended, and a
 * suspended context's clock is frozen at 0. Anything scheduled against that
 * frozen clock is already in the past by the time the browser resumes it, so it
 * is thrown away silently. Nothing is scheduled unless the clock is running.
 */
function activeCtx(): AudioContext | null {
  const c = getCtx();
  return c && c.state === 'running' ? c : null;
}

/** A hair of lead time so a note is never scheduled fractionally in the past. */
function at(c: AudioContext): number {
  return c.currentTime + 0.02;
}

/** Must be called from a user-gesture handler (tap) to unlock audio on iOS/Safari. */
export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  const buffer = c.createBuffer(1, 1, 22050);
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.connect(c.destination);
  source.start(0);
}

function tone(
  frequency: number,
  startTime: number,
  duration: number,
  options: { type?: OscillatorType; gain?: number; sweepTo?: number } = {},
) {
  const c = activeCtx();
  if (!c) return;
  const { type = 'sine', gain = 0.25, sweepTo } = options;
  const osc = c.createOscillator();
  const gainNode = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  if (sweepTo !== undefined) osc.frequency.linearRampToValueAtTime(sweepTo, startTime + duration);
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gainNode);
  gainNode.connect(c.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/** A finger arrives. Pitch climbs with the head count so the group hears it fill up. */
export function playJoin(playerCount: number) {
  const c = activeCtx();
  if (!c) return;
  const step = Math.min(playerCount, 10);
  tone(330 + step * 45, at(c), 0.12, { type: 'triangle', gain: 0.18 });
}

/** A finger leaves before the pick. */
export function playLeave() {
  const c = activeCtx();
  if (!c) return;
  tone(300, at(c), 0.12, { type: 'triangle', gain: 0.14, sweepTo: 180 });
}

/** One beat of the countdown. `remaining` counts down to 0. */
export function playTick(remaining: number) {
  const c = activeCtx();
  if (!c) return;
  tone(520 + (3 - remaining) * 90, at(c), 0.09, { type: 'square', gain: 0.16 });
}

/** The winner is revealed. */
export function playWinner() {
  const c = activeCtx();
  if (!c) return;
  const t = at(c);
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    tone(f, t + i * 0.09, 0.35, { type: 'triangle', gain: 0.22 });
  });
}

/** A player is knocked out of a multi-round mode. */
export function playEliminate() {
  const c = activeCtx();
  if (!c) return;
  tone(400, at(c), 0.22, { type: 'sawtooth', gain: 0.16, sweepTo: 120 });
}

/** Generic UI tap for menu buttons. */
export function playBoop() {
  const c = activeCtx();
  if (!c) return;
  tone(440, at(c), 0.06, { type: 'sine', gain: 0.12 });
}
