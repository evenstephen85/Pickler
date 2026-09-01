import { useCallback, useEffect, useRef, useState } from 'react';
import type { Ranking } from './outcome';
import { shuffled } from './rng';
import { hapticWinner } from './haptics';
import { playWinner } from './sound';

export type RoundPhase = 'gathering' | 'running' | 'done';

type Options = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
};

/**
 * The part of a round that has nothing to do with how players joined: drawing
 * the ranking, holding the phase, and freezing the field when the result lands.
 *
 * Split out from `useRound` because not every game collects players the same
 * way — Keno has people tap a number and take their hand off again, rather than
 * holding a finger down — but every game still draws its result the same way.
 *
 * The draw happens the moment the round starts, not at the end of the
 * animation. That is deliberate: a game is then free to animate *towards* a
 * result that is already fixed, which is what keeps a spinner's needle or a
 * straw's length honest instead of decorative.
 */
export function useDraw({ soundEnabled, hapticsEnabled }: Options) {
  const [phase, setPhase] = useState<RoundPhase>('gathering');
  const [ranking, setRanking] = useState<Ranking>([]);
  /**
   * The field as it stood the moment the result landed, so a player taking
   * their hand away doesn't take the answer off the screen with it.
   */
  const [frozen, setFrozen] = useState<Ranking>([]);
  const phaseRef = useRef<RoundPhase>('gathering');

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

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

  /** Draws the ranking and moves the round into its animation. */
  const start = useCallback((players: Ranking): Ranking => {
    const drawn = shuffled(players);
    setRanking(drawn);
    setPhase('running');
    return drawn;
  }, []);

  /** A game calls this when its animation has finished playing out the draw. */
  const finish = useCallback(
    (positions: Ranking) => {
      setPhase((current) => {
        if (current !== 'running') return current;
        setFrozen(positions);
        beep(playWinner);
        buzz(hapticWinner);
        return 'done';
      });
    },
    [beep, buzz],
  );

  /** Drops back to gathering — used when a round loses too many players. */
  const abort = useCallback(() => {
    setPhase((current) => (current === 'running' ? 'gathering' : current));
  }, []);

  const clearDraw = useCallback(() => {
    setRanking([]);
    setFrozen([]);
    setPhase('gathering');
  }, []);

  return { phase, phaseRef, ranking, frozen, beep, buzz, start, finish, abort, clearDraw };
}
