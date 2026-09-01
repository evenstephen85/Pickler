import { useEffect, useRef, useState } from 'react';
import type { Touch } from '../types';
import type { ModeProps } from './types';
import { Result } from '../components/Result';
import { LeadIn } from '../components/LeadIn';
import { colorAt } from '../lib/colors';
import { useRound } from '../lib/useRound';
import { useLeadIn } from '../lib/useLeadIn';
import { revealFor, visibleAfterPick } from '../lib/reveal';
import { CORNERS, planFlight, positionAt } from '../lib/dvd';
import type { Box, Corner, Flight } from '../lib/dvd';
import { hapticHeavy, hapticMedium } from '../lib/haptics';
import { playTick, playEliminate } from '../lib/sound';

/**
 * How far the corners sit in from the edges. Asymmetric on purpose: the top
 * has to clear the back/info buttons and the bottom has to clear the result
 * banner, or a logo lands underneath the UI and can't be read.
 */
const INSET_X = 62;
const INSET_TOP = 88;
const INSET_BOTTOM = 152;
/** Seconds until the first corner, and the gap between each one after it. */
const FIRST_HIT_S = 4.2;
const GAP_S = 1.9;
const SPEED = 210;
/** How far a landed logo is nudged so stacked ones stay readable. */
const STACK_OFFSET = 30;

/**
 * Corner Bounce. Everyone's logo drifts off around the walls like the old DVD
 * screensaver, and whoever nails a corner first is the pick.
 *
 * The bouncing is real: constant speed, honest reflections off all four walls.
 * The flights are *planned* so the corners come up in the order the draw
 * already decided — and, in teams, so that everybody on a team lands in the
 * same corner. See `lib/dvd.ts` for how the corner is chosen.
 */
export function Dvd({ settings, hint }: ModeProps) {
  const [positions, setPositions] = useState<Map<number, { x: number; y: number }>>(new Map());
  const [hits, setHits] = useState<number[]>([]);
  const [live, setLive] = useState(false);
  const flightsRef = useRef<Map<number, Flight>>(new Map());
  /** Which corner each player is headed for — read during render to lay out
      the pile, so it lives in state rather than a ref. */
  const [corners, setCorners] = useState<Map<number, Corner>>(new Map());

  const round = useRound({
    soundEnabled: settings.soundEnabled,
    hapticsEnabled: settings.hapticsEnabled,
    onStart: (ranking) => {
      setHits([]);
      setLive(false);
      const box: Box = {
        width: window.innerWidth - INSET_X * 2,
        height: window.innerHeight - INSET_TOP - INSET_BOTTOM,
      };
      const flights = new Map<number, Flight>();
      const plotted = new Map<number, Corner>();
      ranking.forEach((t, rank) => {
        // In teams the corner *is* the team: two teams take opposite corners
        // so it reads as a side of the screen, three or four take one each.
        const corner =
          settings.outcome === 'teams'
            ? CORNERS[(rank % settings.teamCount) % CORNERS.length]
            : CORNERS[rank % CORNERS.length];
        plotted.set(t.id, corner);
        flights.set(
          t.id,
          planFlight(
            clamp(t.x - INSET_X, 0, box.width),
            clamp(t.y - INSET_TOP, 0, box.height),
            box,
            FIRST_HIT_S + rank * GAP_S,
            SPEED,
            corner,
          ),
        );
      });
      flightsRef.current = flights;
      setCorners(plotted);
    },
  });
  const { phase, ranking, shown, beep, buzz, finish } = round;

  const beat = useLeadIn(
    phase === 'running' && !live,
    () => setLive(true),
    (b) => {
      beep(() => playTick(b === 0 ? 0 : b));
      buzz(b === 0 ? hapticHeavy : hapticMedium);
    },
  );

  useEffect(() => {
    if (phase !== 'running' || !live || ranking.length === 0) return;

    const box: Box = {
      width: window.innerWidth - INSET_X * 2,
      height: window.innerHeight - INSET_TOP - INSET_BOTTOM,
    };
    // 'Pick one' stops at the very first corner; the other outcomes need every
    // place, so they run until the last logo lands.
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
        // A logo that has already hit its corner stays parked there.
        const at = positionAt(flight, Math.min(t, flight.hitAt), box);
        next.set(player.id, { x: at.x + INSET_X, y: at.y + INSET_TOP });

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
  }, [phase, live, ranking, settings.outcome, beep, buzz, finish]);

  const done = phase === 'done';
  const running = phase === 'running';
  const placed = (running || done ? shown : shown).map((t) => ({
    ...t,
    ...(positions.get(t.id) ?? { x: t.x, y: t.y }),
  }));
  const visible = done ? visibleAfterPick(placed, settings.outcome, ranking) : placed;

  /**
   * Logos that land in the same corner sit on top of each other, so each one
   * after the first is stepped diagonally out of the pile — otherwise a team
   * of three reads as a single logo.
   */
  const stackIndex = new Map<number, number>();
  if (running || done) {
    const perCorner = new Map<string, number>();
    for (const player of ranking) {
      const corner = corners.get(player.id);
      const key = corner ? `${corner.cx},${corner.cy}` : String(player.id);
      const seen = perCorner.get(key) ?? 0;
      stackIndex.set(player.id, seen);
      perCorner.set(key, seen + 1);
    }
  }

  return (
    <div className="mode-surface" {...round.handlers}>
      {phase === 'gathering'
        ? visible.map((touch) => (
            <div
              key={touch.id}
              className="ring"
              style={{
                transform: `translate3d(${touch.x}px, ${touch.y}px, 0)`,
                '--ring-color': colorAt(touch.colorIndex),
              } as React.CSSProperties}
            >
              {touch.label && <span className="ring-label">{touch.label}</span>}
            </div>
          ))
        : visible.map((touch) => {
            const reveal = done
              ? revealFor(touch, { outcome: settings.outcome, ranking, teamCount: settings.teamCount })
              : {};
            const corner = corners.get(touch.id);
            const step = stackIndex.get(touch.id) ?? 0;
            // Stack away from whichever corner it landed in, so a nudged logo
            // never ends up off the edge of the screen.
            const dx = corner ? (corner.cx === 0 ? 1 : -1) * step * STACK_OFFSET : 0;
            const dy = corner ? (corner.cy === 0 ? 1 : -1) * step * STACK_OFFSET : 0;
            const landed = hits.includes(touch.id);
            return (
              <Logo
                key={touch.id}
                x={touch.x + (landed ? dx : 0)}
                y={touch.y + (landed ? dy : 0)}
                // The logo always wears the player's original ring color, even
                // when the reveal recolors by team, so people can still find
                // themselves in a pile.
                color={colorAt(touch.colorIndex)}
                teamColor={reveal.color}
                badge={reveal.label}
                landed={landed}
              />
            );
          })}

      <LeadIn beat={beat} note="you can let go once they take off" />

      {phase === 'gathering' && hint}
      {running && live && (
        <p className="mode-hint" data-no-boop>
          Hands off — first to nail a corner
        </p>
      )}
      {done && (
        <Result outcome={settings.outcome} ranking={ranking} teamCount={settings.teamCount} onAgain={round.reset} />
      )}
    </div>
  );
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/** The bouncing logo itself — the letters, in the player's color. */
function Logo({
  x, y, color, teamColor, badge, landed,
}: {
  x: number; y: number; color: string; teamColor?: string; badge?: string; landed: boolean;
}) {
  return (
    <div
      className={`dvd-logo${landed ? ' landed' : ''}`}
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        '--logo-color': color,
        '--logo-team': teamColor ?? color,
      } as React.CSSProperties}
    >
      <svg viewBox="0 0 100 52" aria-hidden="true">
        <ellipse className="dvd-disc" cx="50" cy="41" rx="42" ry="8" />
        <text className="dvd-word" x="50" y="30" textAnchor="middle">DVD</text>
      </svg>
      {badge && <span className="dvd-badge">{badge}</span>}
    </div>
  );
}
