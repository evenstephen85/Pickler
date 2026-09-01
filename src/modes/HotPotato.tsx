import { useEffect, useState } from 'react';
import type { Touch } from '../types';
import type { ModeProps } from './types';
import { Ring } from '../components/Ring';
import { Result } from '../components/Result';
import { colorAt } from '../lib/colors';
import { useRound } from '../lib/useRound';
import { revealFor, visibleAfterPick } from '../lib/reveal';
import { randomIndex } from '../lib/rng';
import { teamsFrom } from '../lib/outcome';
import { hapticMedium } from '../lib/haptics';
import { playTick } from '../lib/sound';

/** The hop starts lazy and ends frantic. */
const FIRST_HOP_MS = 340;
const LAST_HOP_MS = 90;
const HOPS = 24;

type Potato = {
  /** Which team this potato is finding, and the color it flies in. */
  color: string;
  /** Where it is right now, in screen pixels. */
  x: number;
  y: number;
  /** The ring it is flying from and to, so the dot can travel between them. */
  fromId: number;
  toId: number;
  /** 0-1 through the current hop. */
  t: number;
};

/**
 * Hot Potato. A glow flies from finger to finger, faster and faster, and
 * whoever is holding it when the music stops is the pick.
 *
 * In teams mode there is one potato per team, each in that team's color, and
 * each lands on a member of its own team — so the split is revealed by where
 * the potatoes come to rest rather than announced afterwards.
 */
export function HotPotato({ settings, hint }: ModeProps) {
  const [potatoes, setPotatoes] = useState<Potato[]>([]);
  const round = useRound({
    soundEnabled: settings.soundEnabled,
    hapticsEnabled: settings.hapticsEnabled,
  });
  const { phase, ranking, shown, beep, buzz, finish } = round;

  useEffect(() => {
    if (phase !== 'running' || ranking.length === 0) return;

    // One potato per team, or a single one for the other outcomes.
    const teams = settings.outcome === 'teams' ? teamsFrom(ranking, settings.teamCount) : [ranking];
    const positionOf = (id: number) => ranking.find((t) => t.id === id) ?? ranking[0];

    // Each potato wanders its own random path and lands on its own team's first
    // member. The path is drawn up front so the landing is never in doubt, but
    // the route to it is genuine misdirection — no repeats back-to-back.
    const paths = teams.map((team) => {
      const hops: Touch[] = [];
      let last: Touch | null = null;
      for (let i = 0; i < HOPS - 1; i++) {
        let next = ranking[randomIndex(ranking.length)];
        if (last && ranking.length > 1) {
          while (next.id === last.id) next = ranking[randomIndex(ranking.length)];
        }
        hops.push(next);
        last = next;
      }
      hops.push(team[0]);
      return hops;
    });

    let hop = 0;
    let frame = 0;
    let hopStart = performance.now();

    const durationFor = (index: number) => {
      const progress = index / (HOPS - 1);
      return FIRST_HOP_MS + (LAST_HOP_MS - FIRST_HOP_MS) * progress * progress;
    };

    const step = (now: number) => {
      const duration = durationFor(hop);
      const t = Math.min(1, (now - hopStart) / duration);

      setPotatoes(
        paths.map((path, i) => {
          const from = hop === 0 ? path[0] : path[hop - 1];
          const to = path[hop];
          const fromAt = positionOf(from.id);
          const toAt = positionOf(to.id);
          // Ease the flight so the dot accelerates away and settles in.
          const e = t < 0.5 ? 2 * t * t : 1 - (1 - t) ** 2 * 2;
          return {
            color:
              settings.outcome === 'teams'
                ? colorAt(teams[i][0].colorIndex)
                : '#ffffff',
            x: fromAt.x + (toAt.x - fromAt.x) * e,
            y: fromAt.y + (toAt.y - fromAt.y) * e,
            fromId: from.id,
            toId: to.id,
            t,
          };
        }),
      );

      if (t >= 1) {
        beep(() => playTick(3));
        buzz(hapticMedium);
        if (hop >= HOPS - 1) {
          finish();
          return;
        }
        hop++;
        hopStart = now;
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [phase, ranking, settings.outcome, settings.teamCount, beep, buzz, finish]);

  const done = phase === 'done';
  const running = phase === 'running';
  const holders = new Set(potatoes.map((p) => p.toId));
  const visible = done ? visibleAfterPick(shown, settings.outcome, ranking) : shown;

  return (
    <div className="mode-surface" {...round.handlers}>
      {visible.map((touch) => (
        <Ring
          key={touch.id}
          touch={touch}
          label={touch.label}
          dimmed={running && !holders.has(touch.id)}
          {...(done ? revealFor(touch, { outcome: settings.outcome, ranking, teamCount: settings.teamCount }) : {})}
        />
      ))}

      {running &&
        potatoes.map((potato, i) => (
          <div
            key={i}
            className="potato"
            style={{
              transform: `translate3d(${potato.x}px, ${potato.y}px, 0)`,
              '--potato-color': potato.color,
            } as React.CSSProperties}
          />
        ))}

      {phase === 'gathering' && hint}
      {done && (
        <Result outcome={settings.outcome} ranking={ranking} teamCount={settings.teamCount} onAgain={round.reset} />
      )}
    </div>
  );
}
