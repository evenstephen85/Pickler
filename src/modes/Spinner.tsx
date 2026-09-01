import { useEffect, useRef, useState } from 'react';
import type { ModeProps } from './types';
import { Ring } from '../components/Ring';
import { Result } from '../components/Result';
import { colorAt } from '../lib/colors';
import { useRound } from '../lib/useRound';
import { revealFor, visibleAfterPick } from '../lib/reveal';
import { teamsFrom } from '../lib/outcome';
import { hapticLight } from '../lib/haptics';
import { playTick } from '../lib/sound';

const SPIN_MS = 3000;
/** Full turns before a needle starts hunting for its target. */
const TURNS = 4;
/** Each extra needle takes a little longer, so they land one after another. */
const STAGGER_MS = 500;

type Needle = { targetId: number; color: string; angle: number };

/**
 * Spinner. Needles sweep out from the middle of the screen, slow like a
 * roulette wheel, and come to rest pointing at a finger.
 *
 * In teams mode there is one needle per member of the *smallest* team, all in
 * that team's color: name the short team and everyone else knows where they
 * stand.
 *
 * A needle re-aims at its target on every frame rather than at the bearing the
 * target had when the spin began, so it follows a finger that moves and still
 * comes to rest pointing right at it. Which finger it is was fixed by the draw
 * before the first frame, so tracking changes nothing about the odds.
 */
export function Spinner({ settings, hint }: ModeProps) {
  const [needles, setNeedles] = useState<Needle[]>([]);
  const [centre, setCentre] = useState(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
  const round = useRound({
    soundEnabled: settings.soundEnabled,
    hapticsEnabled: settings.hapticsEnabled,
    onStart: (ranking) => {
      setCentre({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      if (settings.outcome === 'teams') {
        const teams = teamsFrom(ranking, settings.teamCount);
        // The smallest team, and the earliest of them on a tie.
        const smallest = teams.reduce((best, team) => (team.length < best.length ? team : best), teams[0]);
        const color = colorAt(smallest[0].colorIndex);
        setNeedles(smallest.map((t) => ({ targetId: t.id, color, angle: -Math.PI / 2 })));
      } else {
        setNeedles([{ targetId: ranking[0].id, color: '#ffffff', angle: -Math.PI / 2 }]);
      }
    },
  });
  const { phase, ranking, touches, shown, beep, buzz, finish } = round;

  // The live field, read inside the animation so a needle can follow a finger
  // that moves without the spin restarting every time one twitches.
  const touchesRef = useRef(touches);
  useEffect(() => {
    touchesRef.current = touches;
  }, [touches]);

  useEffect(() => {
    if (phase !== 'running' || needles.length === 0) return;

    const targets = needles.map((n) => n.targetId);
    const colors = needles.map((n) => n.color);
    const from = -Math.PI / 2;
    const durations = targets.map((_, i) => SPIN_MS + i * STAGGER_MS);
    const total = Math.max(...durations);
    const started = performance.now();
    let frame = 0;
    let lastTick = -1;

    /** Where a target is right now, falling back to where it was drawn. */
    const bearingOf = (id: number) => {
      const at = touchesRef.current.find((t) => t.id === id) ?? ranking.find((t) => t.id === id);
      if (!at) return from;
      return Math.atan2(at.y - centre.y, at.x - centre.x);
    };

    const step = (now: number) => {
      const elapsed = now - started;
      const next = targets.map((targetId, i) => {
        const t = Math.min(1, elapsed / durations[i]);
        const eased = 1 - (1 - t) ** 4;
        // Whole turns plus however far round the target is *now*. Both terms
        // are scaled by the same easing, so the needle lands on the live
        // bearing exactly as it stops.
        const sweep = (((bearingOf(targetId) - from) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        return {
          targetId,
          color: colors[i],
          angle: from + (TURNS * Math.PI * 2 + sweep) * eased,
        };
      });
      setNeedles(next);

      // One click per eighth-turn of the lead needle, which naturally slows
      // down with it.
      const tickIndex = Math.floor(next[0].angle / (Math.PI / 4));
      if (tickIndex !== lastTick) {
        lastTick = tickIndex;
        beep(() => playTick(3));
        buzz(hapticLight);
      }

      if (elapsed < total) frame = requestAnimationFrame(step);
      else finish();
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // `needles` carries the live angles, which change every frame; the spin is
    // set up once per round from the targets fixed at the start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, ranking, centre, beep, buzz, finish]);

  const done = phase === 'done';
  const visible = done ? visibleAfterPick(shown, settings.outcome, ranking) : shown;
  const reach = Math.min(window.innerWidth, window.innerHeight) * 0.42;

  return (
    <div className="mode-surface" {...round.handlers}>
      {phase !== 'gathering' && (
        <svg className="spinner-layer" aria-hidden="true">
          {needles.map((needle, i) => (
            <line
              key={i}
              x1={centre.x}
              y1={centre.y}
              x2={centre.x + Math.cos(needle.angle) * reach}
              y2={centre.y + Math.sin(needle.angle) * reach}
              stroke={needle.color}
              strokeWidth={5}
              strokeLinecap="round"
            />
          ))}
          <circle cx={centre.x} cy={centre.y} r={9} fill="#ffffff" />
        </svg>
      )}

      {visible.map((touch) => (
        <Ring
          key={touch.id}
          touch={touch}
          label={touch.label}
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
