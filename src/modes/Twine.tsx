import { useEffect, useState } from 'react';
import type { ModeProps } from './types';
import { Ring } from '../components/Ring';
import { Result } from '../components/Result';
import { colorAt } from '../lib/colors';
import { useRound } from '../lib/useRound';
import { revealFor, visibleAfterPick } from '../lib/reveal';
import { hapticLight } from '../lib/haptics';
import { playTick } from '../lib/sound';

const REEL_MS = 2200;
/** Length the pick's string is reeled down to, and the gap between each rank. */
const SHORTEST_PX = 46;
const STEP_PX = 78;

/**
 * Tug of Twine. A string runs from every finger down to the bottom edge. They
 * get reeled in, and the shortest one belongs to the pick.
 *
 * The lengths are assigned from the draw, not measured off the screen — a
 * finger nearer the bottom edge must not have better odds than one at the top.
 * The string is the storytelling; the ranking underneath it is uniform.
 */
export function Twine({ settings, hint }: ModeProps) {
  const [progress, setProgress] = useState(0);
  const round = useRound({
    soundEnabled: settings.soundEnabled,
    hapticsEnabled: settings.hapticsEnabled,
    onStart: () => setProgress(0),
  });
  const { phase, ranking, touches, beep, buzz, finish } = round;

  useEffect(() => {
    if (phase !== 'running') return;
    const started = performance.now();
    let frame = 0;
    let lastTick = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - started) / REEL_MS);
      // Ease-out, so the reel snaps in and then creeps to the finish.
      setProgress(1 - (1 - t) ** 3);
      const tickIndex = Math.floor(t * 8);
      if (tickIndex !== lastTick) {
        lastTick = tickIndex;
        beep(() => playTick(3));
        buzz(hapticLight);
      }
      if (t < 1) frame = requestAnimationFrame(step);
      else finish();
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [phase, beep, buzz, finish]);

  const done = phase === 'done';
  const visible = done ? visibleAfterPick(touches, settings.outcome, ranking) : touches;

  /**
   * How much string a player is left holding once the reel stops — rank 0 the
   * shortest, then a fixed step per place. Measured in pixels rather than as a
   * fraction of the drop to the edge, so the lengths stay comparable by eye no
   * matter where on the screen the fingers landed.
   */
  function remainingFor(id: number, y: number, h: number): number {
    const rank = ranking.findIndex((t) => t.id === id);
    if (rank === -1) return h - y;
    return Math.min(SHORTEST_PX + rank * STEP_PX, Math.max(24, h - y));
  }

  return (
    <div className="mode-surface twine-surface" {...round.handlers}>
      <svg className="twine-layer" aria-hidden="true">
        {visible.map((touch) => {
          const color = colorAt(touch.colorIndex);
          const h = window.innerHeight;
          // The loose end climbs from the bottom edge towards the finger as the
          // reel pulls it in; where it stops is the player's draw.
          const pulled = phase === 'gathering' ? 0 : progress;
          const endY = h - (h - (touch.y + remainingFor(touch.id, touch.y, h))) * pulled;
          return (
            <line
              key={touch.id}
              x1={touch.x}
              y1={touch.y}
              x2={touch.x}
              y2={endY}
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.75}
            />
          );
        })}
      </svg>

      {visible.map((touch) => (
        <Ring
          key={touch.id}
          touch={touch}
          {...(done ? revealFor(touch, { outcome: settings.outcome, ranking, teamCount: settings.teamCount }) : {})}
        />
      ))}

      {phase === 'gathering' && hint}
      {done && (
        <Result outcome={settings.outcome} ranking={ranking} teamCount={settings.teamCount} onAgain={round.reset} />
      )}
    </div>
  );
}
