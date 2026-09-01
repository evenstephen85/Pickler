import { useEffect } from 'react';
import type { Touch } from '../types';

/** How long the set of players must stay unchanged before a round begins. */
export const SETTLE_MS = 2600;
/** Fewer than this and there is nothing to decide. */
export const MIN_PLAYERS = 2;

/**
 * Fires `onSettled` once nobody has joined or left for SETTLE_MS.
 *
 * The timer is keyed on the *set* of players: any join or lift produces a new
 * key, React tears the old timer down, and the wait starts over. That is the
 * whole "wait until nobody else is joining" rule, with no bookkeeping.
 */
export function useSettle(touches: Touch[], active: boolean, onSettled: () => void) {
  const key = touches
    .map((t) => t.id)
    .sort((a, b) => a - b)
    .join(',');
  const ready = touches.length >= MIN_PLAYERS;

  useEffect(() => {
    if (!active || !ready) return;
    const timer = setTimeout(onSettled, SETTLE_MS);
    return () => clearTimeout(timer);
    // `onSettled` is intentionally excluded: modes declare it inline, so
    // including it would restart the wait on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active, ready]);

  return { ready };
}
