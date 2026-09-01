let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

/**
 * A suspended context's clock is frozen at 0, and anything scheduled against
 * that frozen clock is already in the past when the browser resumes it — so it
 * is thrown away silently.
 *
 * resume() is asynchronous, which used to lose the first sound of a session:
 * the tap that unlocked audio also asked for a sound, and that sound was
 * scheduled a few milliseconds before the context actually started running.
 * Now a sound asked for during that window waits for the resume to land
 * instead of being dropped.
 */
function withCtx(run: (c: AudioContext, startTime: number) => void) {
  const c = getCtx();
  if (!c) return;
  // A hair of lead time so a note is never scheduled fractionally in the past.
  if (c.state === 'running') {
    run(c, c.currentTime + 0.02);
    return;
  }
  void c
    .resume()
    .then(() => {
      if (c.state === 'running') run(c, c.currentTime + 0.02);
    })
    .catch(() => {
      // Still locked — the browser wants a gesture it hasn't seen yet.
    });
}

/**
 * Must be called from a user-gesture handler (tap) to unlock audio on
 * iOS/Safari. Playing a one-sample silent buffer is what actually flips the
 * context to running; resume() alone is not always enough on iOS.
 *
 * Worth knowing: on an iPhone this cannot beat the physical Ring/Silent
 * switch. Web Audio in Safari is muted by that switch no matter how high the
 * volume is, and a web page has no way to opt out — only a native build can.
 */
export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  void c.resume().catch(() => {});
  const buffer = c.createBuffer(1, 1, 22050);
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.connect(c.destination);
  source.start(0);
}

/** True once the context is genuinely running — used to warn if it never is. */
export function audioIsRunning(): boolean {
  return ctx?.state === 'running';
}

function tone(
  c: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  options: { type?: OscillatorType; gain?: number; sweepTo?: number } = {},
) {
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
  withCtx((c, t) => tone(c, 330 + Math.min(playerCount, 10) * 45, t, 0.12, { type: 'triangle', gain: 0.18 }));
}

/** A finger leaves before the pick. */
export function playLeave() {
  withCtx((c, t) => tone(c, 300, t, 0.12, { type: 'triangle', gain: 0.14, sweepTo: 180 }));
}

/** One beat of a countdown or one click of a spinner. */
export function playTick(remaining: number) {
  withCtx((c, t) => tone(c, 520 + (3 - remaining) * 90, t, 0.09, { type: 'square', gain: 0.16 }));
}

/** The result is revealed. */
export function playWinner() {
  withCtx((c, t) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(c, f, t + i * 0.09, 0.35, { type: 'triangle', gain: 0.22 });
    });
  });
}

/** A player is knocked out of a multi-round mode. */
export function playEliminate() {
  withCtx((c, t) => tone(c, 400, t, 0.22, { type: 'sawtooth', gain: 0.16, sweepTo: 120 }));
}

/** Generic UI tap for menu buttons. */
export function playBoop() {
  withCtx((c, t) => tone(c, 440, t, 0.06, { type: 'sine', gain: 0.12 }));
}
