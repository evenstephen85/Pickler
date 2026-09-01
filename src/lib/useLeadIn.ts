import { useEffect, useState } from 'react';

/** Beats in the lead-in, and how long each one is held. */
export const LEAD_IN_BEATS = 3;
const BEAT_MS = 700;
/** How long "GO" stays up after the last beat. */
const GO_MS = 500;

/**
 * A 3-2-1-GO before a game that people have to *do* something in. Bumper Rings
 * needs it so nobody is driving before the others have noticed, and Corner
 * Bounce needs it to say when it is safe to take your finger away.
 *
 * Returns the current beat: 3, 2, 1, then 0 for "GO", then null once the
 * lead-in is over and the game is live.
 */
export function useLeadIn(
  active: boolean,
  onDone: () => void,
  tick: (beat: number) => void,
): number | null {
  const [beat, setBeat] = useState<number | null>(null);

  useEffect(() => {
    if (!active) {
      setBeat(null);
      return;
    }

    let current = LEAD_IN_BEATS;
    setBeat(current);
    tick(current);

    const timer = setInterval(() => {
      current -= 1;
      if (current >= 0) {
        setBeat(current);
        tick(current);
        return;
      }
      clearInterval(timer);
      setBeat(null);
      onDone();
    }, BEAT_MS);

    return () => clearInterval(timer);
    // Deliberately keyed on `active` alone: the callbacks are declared inline
    // by the games and would otherwise restart the count on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // The "GO" beat is held a little longer than the numbers.
  useEffect(() => {
    if (beat !== 0) return;
    const timer = setTimeout(() => {}, GO_MS);
    return () => clearTimeout(timer);
  }, [beat]);

  return beat;
}
