import { useEffect, useState } from 'react';
import type { ModeProps } from './types';
import { Ring } from '../components/Ring';
import { Result } from '../components/Result';
import { colorAt } from '../lib/colors';
import { useRound } from '../lib/useRound';
import { revealFor, visibleAfterPick } from '../lib/reveal';
import { randomIndex } from '../lib/rng';
import { hapticLight, hapticMedium } from '../lib/haptics';
import { playTick } from '../lib/sound';

/** How long a die tumbles before it settles, and the stagger between them. */
const TUMBLE_MS = 1500;
const STAGGER_MS = 320;
/** Pips a die can show. Highest roll takes it. */
const FACES = 6;

type Die = { id: number; face: number; settled: boolean; spin: number };

/**
 * Dice Roll. A die tumbles out of every finger and settles on a number —
 * highest roll goes first, and the rest fall in behind it.
 *
 * The faces are dealt from the draw rather than rolled independently, which is
 * what guarantees there is never a tie at the top: the ranking is decided
 * first, then each player is handed the face that matches their place.
 */
export function Dice({ settings, hint }: ModeProps) {
  const [dice, setDice] = useState<Die[]>([]);
  const round = useRound({
    soundEnabled: settings.soundEnabled,
    hapticsEnabled: settings.hapticsEnabled,
  });
  const { phase, ranking, shown, beep, buzz, finish } = round;

  useEffect(() => {
    if (phase !== 'running' || ranking.length === 0) return;

    // Highest face to the pick, then down the ranking. With more players than
    // faces the tail shares the lowest number — the places are still read off
    // the draw, so nothing is decided by a tie.
    const faceFor = (rank: number) => Math.max(1, FACES - rank);
    const started = performance.now();
    let frame = 0;
    let settledCount = 0;

    const step = (now: number) => {
      const elapsed = now - started;
      const next = ranking.map((player, rank) => {
        const settleAt = TUMBLE_MS + rank * STAGGER_MS;
        const settled = elapsed >= settleAt;
        return {
          id: player.id,
          face: settled ? faceFor(rank) : 1 + randomIndex(FACES),
          settled,
          spin: settled ? 0 : (elapsed / 90 + rank) % 4,
        };
      });
      setDice(next);

      const nowSettled = next.filter((d) => d.settled).length;
      if (nowSettled > settledCount) {
        settledCount = nowSettled;
        beep(() => playTick(2));
        buzz(nowSettled === 1 ? hapticMedium : hapticLight);
      }

      if (settledCount >= ranking.length) {
        finish();
        return;
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [phase, ranking, beep, buzz, finish]);

  const done = phase === 'done';
  const running = phase === 'running';
  const visible = done ? visibleAfterPick(shown, settings.outcome, ranking) : shown;
  const shownDice = done ? dice.filter((d) => visible.some((t) => t.id === d.id)) : dice;

  return (
    <div className="mode-surface" {...round.handlers}>
      {visible.map((touch) => (
        <Ring
          key={touch.id}
          touch={touch}
          label={touch.label}
          dimmed={running}
          {...(done ? revealFor(touch, { outcome: settings.outcome, ranking, teamCount: settings.teamCount }) : {})}
        />
      ))}

      {(running || done) &&
        shownDice.map((die) => {
          const at = (running ? shown : visible).find((t) => t.id === die.id);
          if (!at) return null;
          return (
            <Face
              key={die.id}
              face={die.face}
              color={colorAt(at.colorIndex)}
              settled={die.settled}
              spin={die.spin}
              x={at.x}
              y={at.y}
            />
          );
        })}

      {phase === 'gathering' && hint}
      {done && (
        <Result outcome={settings.outcome} ranking={ranking} teamCount={settings.teamCount} onAgain={round.reset} />
      )}
    </div>
  );
}

/** Pip layout for each face, on a 3x3 grid. */
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

function Face({
  face, color, settled, spin, x, y,
}: {
  face: number; color: string; settled: boolean; spin: number; x: number; y: number;
}) {
  return (
    <div
      className={`die${settled ? ' settled' : ''}`}
      style={{
        transform: `translate3d(${x}px, ${y}px, 0) rotate(${spin * 90}deg)`,
        '--die-color': color,
      } as React.CSSProperties}
    >
      <svg viewBox="0 0 60 60" aria-hidden="true">
        {PIPS[face].map(([px, py]) => (
          <circle key={`${px}-${py}`} cx={12 + px * 18} cy={12 + py * 18} r="5.5" />
        ))}
      </svg>
    </div>
  );
}
