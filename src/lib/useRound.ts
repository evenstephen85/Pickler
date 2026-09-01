import { useCallback, useEffect, useRef } from 'react';
import type { Touch } from '../types';
import type { Ranking } from './outcome';
import { usePlayers } from './usePlayers';
import { MIN_PLAYERS, useSettle } from './useSettle';
import { useDraw } from './useDraw';
import { hapticLight } from './haptics';
import { playJoin, playLeave } from './sound';

export type { RoundPhase } from './useDraw';

type Options = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  /** Called once the field has settled — the game's own animation starts here. */
  onStart?: (ranking: Ranking) => void;
};

/**
 * What the held-finger games share: collecting players, waiting for the field
 * to settle, and handing the draw to `useDraw`. Keno skips this one and drives
 * `useDraw` from its own tap-to-claim board instead.
 */
export function useRound({ soundEnabled, hapticsEnabled, onStart }: Options) {
  const draw = useDraw({ soundEnabled, hapticsEnabled });
  const { phase, phaseRef, ranking, frozen, beep, buzz, start, finish, abort, clearDraw } = draw;

  const onAdd = useCallback(
    (_touch: Touch, all: Touch[]) => {
      beep(() => playJoin(all.length));
      buzz(hapticLight);
    },
    [beep, buzz],
  );

  const onRemove = useCallback(
    (_touch: Touch, all: Touch[]) => {
      if (all.length > 0 && phaseRef.current === 'gathering') beep(playLeave);
      // Someone bailed out mid-round. Abort rather than pick from a field that
      // no longer exists — handled here, at the lift, so the games' timers stay
      // pure timers.
      if (all.length < MIN_PLAYERS) abort();
    },
    [beep, abort, phaseRef],
  );

  const { touches, clear, handlers } = usePlayers({
    accepting: phase === 'gathering',
    // Once the draw is under way a lift leaves the ring where it was, so
    // nobody loses their place by shifting their grip mid-round.
    keepReleased: phase !== 'gathering',
    onAdd,
    onRemove,
  });

  /** Players whose finger is still down — what the driven games care about. */
  const live = touches.filter((t) => !t.released);

  // The games' animations must not restart every time a fingertip jitters, but
  // they still need the live field when they fire — so they read it via a ref
  // rather than taking it as a dependency.
  const touchesRef = useRef(touches);
  useEffect(() => {
    touchesRef.current = touches;
  }, [touches]);

  const { ready } = useSettle(touches, phase === 'gathering', () => {
    // The draw has to happen on its own line. Written as
    // `onStart?.(start(...))` the optional call short-circuits when a game
    // doesn't pass an onStart -- and JavaScript never evaluates the arguments
    // of a call it skips, so the round silently never started. That is exactly
    // what ailed the two games that had no onStart of their own.
    const drawn = start(touchesRef.current);
    onStart?.(drawn);
  });

  /**
   * Games that leave the rings on the fingers can call this with nothing; the
   * ones that move them (Bumper Rings, Corner Bounce) pass the positions they
   * were actually drawing.
   */
  const finishRound = useCallback(
    (positions?: Ranking) => finish(positions ?? touchesRef.current),
    [finish],
  );

  const reset = useCallback(() => {
    clear();
    clearDraw();
  }, [clear, clearDraw]);

  // A finished round stays on screen until somebody asks for another one.
  // There is deliberately no timer here: reading a turn order off the rings
  // takes as long as it takes.
  const shown = phase === 'done' ? frozen : touches;

  return { phase, ranking, touches, live, shown, ready, handlers, beep, buzz, finish: finishRound, reset };
}
