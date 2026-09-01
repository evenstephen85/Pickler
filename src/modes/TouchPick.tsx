import { useCallback, useEffect, useRef, useState } from 'react';
import type { Touch } from '../types';
import { colorAt } from '../lib/colors';
import { useTouches } from '../lib/useTouches';
import { pickOne } from '../lib/rng';
import { hapticHeavy, hapticLight, hapticWinner } from '../lib/haptics';
import { playJoin, playLeave, playTick, playWinner } from '../lib/sound';

/** How long the set of fingers must stay unchanged before the pick begins. */
const SETTLE_MS = 2600;
/** Beats of the countdown, and the gap between them. */
const COUNTDOWN_BEATS = 3;
const BEAT_MS = 620;
/** Fewer than this and there is nothing to decide. */
const MIN_PLAYERS = 2;

type Phase =
  | { kind: 'gathering' }
  | { kind: 'counting'; beat: number }
  | { kind: 'winner'; touch: Touch };

type Props = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
};

export function TouchPick({ soundEnabled, hapticsEnabled }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'gathering' });

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
      if (all.length > 0) beep(playLeave);
      // Someone bailed out mid-countdown. Abort rather than pick from a field
      // that no longer exists — handled here, at the lift, so the countdown
      // effect stays a pure timer.
      setPhase((current) =>
        current.kind === 'counting' && all.length < MIN_PLAYERS ? { kind: 'gathering' } : current,
      );
    },
    [beep],
  );

  const { touches, clear, handlers } = useTouches({
    accepting: phase.kind === 'gathering',
    onAdd,
    onRemove,
  });

  // The countdown effect must not re-run every time a fingertip jitters, but it
  // still needs the live field at the moment it fires — so the beat reads the
  // touches through a ref instead of taking them as a dependency.
  const touchesRef = useRef(touches);
  useEffect(() => {
    touchesRef.current = touches;
  }, [touches]);

  const playerCount = touches.length;
  const ready = playerCount >= MIN_PLAYERS;

  // The settle timer is keyed on the *set* of fingers: any join or lift produces
  // a new key, React tears the old timer down, and the wait starts over. That is
  // the whole "wait until nobody else is joining" rule, with no bookkeeping.
  const touchKey = touches.map((t) => t.id).sort((a, b) => a - b).join(',');

  useEffect(() => {
    if (phase.kind !== 'gathering' || !ready) return;
    const timer = setTimeout(() => setPhase({ kind: 'counting', beat: COUNTDOWN_BEATS }), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [phase.kind, touchKey, ready]);

  // Countdown: one beat at a time, so a finger lifted mid-count can still abort.
  useEffect(() => {
    if (phase.kind !== 'counting') return;

    beep(() => playTick(phase.beat));
    buzz(hapticHeavy);

    const timer = setTimeout(() => {
      setPhase((current) => {
        if (current.kind !== 'counting') return current;
        if (current.beat > 1) return { kind: 'counting', beat: current.beat - 1 };
        return { kind: 'winner', touch: pickOne(touchesRef.current) };
      });
    }, BEAT_MS);
    return () => clearTimeout(timer);
  }, [phase, beep, buzz]);

  useEffect(() => {
    if (phase.kind !== 'winner') return;
    beep(playWinner);
    buzz(hapticWinner);
  }, [phase.kind, beep, buzz]);

  // Everyone has let go after a result: reset for the next round.
  useEffect(() => {
    if (phase.kind === 'winner' && playerCount === 0) {
      const timer = setTimeout(() => setPhase({ kind: 'gathering' }), 400);
      return () => clearTimeout(timer);
    }
  }, [phase.kind, playerCount]);

  function reset() {
    clear();
    setPhase({ kind: 'gathering' });
  }

  const winnerId = phase.kind === 'winner' ? phase.touch.id : null;
  const visible = winnerId === null ? touches : touches.filter((t) => t.id === winnerId);

  return (
    <div className="mode-surface" {...handlers}>
      {visible.map((touch) => (
        <Ring
          key={touch.id}
          touch={touch}
          pulsing={phase.kind === 'counting'}
          won={touch.id === winnerId}
        />
      ))}

      {phase.kind === 'gathering' && (
        <p className="mode-hint" data-no-boop>
          {playerCount === 0
            ? 'Everybody put a finger on the screen'
            : ready
              ? 'Hold still…'
              : 'Waiting for one more finger'}
        </p>
      )}

      {phase.kind === 'winner' && (
        <div className="mode-result" data-no-boop>
          <p className="mode-result-label" style={{ color: colorAt(phase.touch.colorIndex) }}>
            You're up
          </p>
          <button className="mode-again" onClick={reset}>
            Go again
          </button>
        </div>
      )}
    </div>
  );
}

function Ring({ touch, pulsing, won }: { touch: Touch; pulsing: boolean; won: boolean }) {
  const color = colorAt(touch.colorIndex);
  return (
    <div
      className={`ring${pulsing ? ' pulsing' : ''}${won ? ' won' : ''}`}
      style={{
        transform: `translate3d(${touch.x}px, ${touch.y}px, 0)`,
        '--ring-color': color,
      } as React.CSSProperties}
    />
  );
}
