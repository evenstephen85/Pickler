import { useCallback, useEffect, useRef, useState } from 'react';
import type { Touch } from '../types';
import type { Ranking } from './outcome';
import { shuffled } from './rng';
import { usePlayers } from './usePlayers';
import { MIN_PLAYERS, useSettle } from './useSettle';
import { hapticLight, hapticWinner } from './haptics';
import { playJoin, playLeave, playWinner } from './sound';

export type RoundPhase = 'gathering' | 'running' | 'done';

type Options = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  /** Called once the field has settled — the game's own animation starts here. */
  onStart?: (ranking: Ranking) => void;
};

/**
 * Everything the five games share: collecting players, waiting for the field to
 * settle, drawing the ranking, and resetting when everyone lets go.
 *
 * The draw happens the moment the round starts, not at the end of the
 * animation. That is deliberate — every game is then free to animate *towards*
 * a result that is already fixed, which is what keeps a spinner's needle or a
 * string's length honest instead of decorative.
 */
export function useRound({ soundEnabled, hapticsEnabled, onStart }: Options) {
  const [phase, setPhase] = useState<RoundPhase>('gathering');
  const [ranking, setRanking] = useState<Ranking>([]);
  /**
   * The field as it stood the moment the result landed. Lifting a finger
   * removes it from the live list, which used to take the result off the
   * screen with it — so once a round is done the rings are drawn from this
   * snapshot instead, and everyone can take their hands away and still read
   * the turn order.
   */
  const [frozen, setFrozen] = useState<Ranking>([]);
  const phaseRef = useRef<RoundPhase>('gathering');

  const beep = useCallback(
    (fn: () => void) => {
      if (soundEnabled) fn();
    },
    [soundEnabled],
  );
  const buzz = useCallback(
    (fn: () => void) => {
      if (hapticsEnabled) fn();
    },
    [hapticsEnabled],
  );

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
      setPhase((current) => (current === 'running' && all.length < MIN_PLAYERS ? 'gathering' : current));
    },
    [beep],
  );

  const { touches, clear, handlers } = usePlayers({ accepting: phase === 'gathering', onAdd, onRemove });

  // The games' animations must not restart every time a fingertip jitters, but
  // they still need the live field when they fire — so they read it via a ref
  // rather than taking it as a dependency.
  const touchesRef = useRef(touches);
  useEffect(() => {
    touchesRef.current = touches;
  }, [touches]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const { ready } = useSettle(touches, phase === 'gathering', () => {
    const drawn = shuffled(touchesRef.current);
    setRanking(drawn);
    setPhase('running');
    onStart?.(drawn);
  });

  /** A game calls this when its animation has finished playing out the draw. */
  const finish = useCallback(
    (positions?: Ranking) => {
      setPhase((current) => {
        if (current !== 'running') return current;
        // Prefer the positions the game was actually drawing (Bumper Rings has
        // moved them a long way from the fingers), and fall back to the live
        // field for the games that leave the rings where they were put.
        setFrozen(positions ?? touchesRef.current);
        beep(playWinner);
        buzz(hapticWinner);
        return 'done';
      });
    },
    [beep, buzz],
  );

  const reset = useCallback(() => {
    clear();
    setRanking([]);
    setFrozen([]);
    setPhase('gathering');
  }, [clear]);

  // A finished round stays on screen until somebody asks for another one.
  // There is deliberately no timer here: reading a turn order off the rings
  // takes as long as it takes.
  const shown = phase === 'done' ? frozen : touches;

  return { phase, ranking, touches, shown, ready, handlers, beep, buzz, finish, reset };
}
