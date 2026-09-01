import { useEffect, useRef, useState } from 'react';
import type { Touch } from '../types';
import type { ModeProps } from './types';
import { Ring } from '../components/Ring';
import { Result } from '../components/Result';
import { useRound } from '../lib/useRound';
import { revealFor, visibleAfterPick } from '../lib/reveal';
import { planFlight, positionAt } from '../lib/dvd';
import type { Box, Flight } from '../lib/dvd';
import { hapticHeavy } from '../lib/haptics';
import { playTick, playEliminate } from '../lib/sound';

const RADIUS = 66;
/** Seconds until the first corner, and the gap between each one after it. */
const FIRST_HIT_S = 4.2;
const GAP_S = 1.9;
const SPEED = 210;

/**
 * Corner Bounce. Everyone's ring drifts off around the walls like the old DVD
 * screensaver, and whoever nails a corner first is the pick — or, for a turn
 * order, second, third and so on as each corner lands.
 *
 * The bouncing is real: constant speed, honest reflections off all four walls.
 * The flights are just *planned* so that the corners come up in the order the
 * draw already decided. See `lib/dvd.ts` for how.
 */
export function Dvd({ settings, hint }: ModeProps) {
  const [positions, setPositions] = useState<Map<number, { x: number; y: number }>>(new Map());
  const [hits, setHits] = useState<number[]>([]);
  const flightsRef = useRef<Map<number, Flight>>(new Map());
  const round = useRound({
    soundEnabled: settings.soundEnabled,
    hapticsEnabled: settings.hapticsEnabled,
    onStart: (ranking) => {
      const box: Box = {
        width: window.innerWidth - RADIUS * 2,
        height: window.innerHeight - RADIUS * 2,
      };
      const flights = new Map<number, Flight>();
      ranking.forEach((t, i) => {
        flights.set(
          t.id,
          planFlight(t.x - RADIUS, t.y - RADIUS, box, FIRST_HIT_S + i * GAP_S, SPEED),
        );
      });
      flightsRef.current = flights;
      setHits([]);
    },
  });
  const { phase, ranking, shown, beep, buzz, finish } = round;

  useEffect(() => {
    if (phase !== 'running' || ranking.length === 0) return;

    const box: Box = {
      width: window.innerWidth - RADIUS * 2,
      height: window.innerHeight - RADIUS * 2,
    };
    // 'Pick one' stops at the very first corner; the other outcomes need every
    // place, so they run until the last ring lands.
    const needed = settings.outcome === 'one' ? 1 : ranking.length;
    const started = performance.now();
    const landed = new Set<number>();
    let frame = 0;

    const step = (now: number) => {
      const t = (now - started) / 1000;
      const next = new Map<number, { x: number; y: number }>();

      for (const player of ranking) {
        const flight = flightsRef.current.get(player.id);
        if (!flight) continue;
        // A ring that has already hit its corner stays parked there.
        const at = positionAt(flight, Math.min(t, flight.hitAt), box);
        next.set(player.id, { x: at.x + RADIUS, y: at.y + RADIUS });

        if (t >= flight.hitAt && !landed.has(player.id)) {
          landed.add(player.id);
          setHits((prev) => (prev.includes(player.id) ? prev : [...prev, player.id]));
          beep(() => (landed.size === 1 ? playTick(1) : playEliminate()));
          buzz(hapticHeavy);
        }
      }

      setPositions(next);

      if (landed.size >= needed) {
        finish(
          ranking.map((p) => {
            const at = next.get(p.id);
            return at ? ({ ...p, ...at } as Touch) : p;
          }),
        );
        return;
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [phase, ranking, settings.outcome, beep, buzz, finish]);

  const done = phase === 'done';
  const running = phase === 'running';
  const placed = running
    ? shown.map((t) => ({ ...t, ...(positions.get(t.id) ?? { x: t.x, y: t.y }) }))
    : shown;
  const visible = done ? visibleAfterPick(placed, settings.outcome, ranking) : placed;

  return (
    <div className="mode-surface" {...round.handlers}>
      {visible.map((touch) => (
        <Ring
          key={touch.id}
          touch={touch}
          label={touch.label}
          won={running && hits[0] === touch.id}
          dimmed={running && hits.length > 0 && !hits.includes(touch.id)}
          {...(done ? revealFor(touch, { outcome: settings.outcome, ranking, teamCount: settings.teamCount }) : {})}
        />
      ))}

      {phase === 'gathering' && hint}
      {running && (
        <p className="mode-hint" data-no-boop>
          First one to nail a corner…
        </p>
      )}
      {done && (
        <Result outcome={settings.outcome} ranking={ranking} teamCount={settings.teamCount} onAgain={round.reset} />
      )}
    </div>
  );
}
