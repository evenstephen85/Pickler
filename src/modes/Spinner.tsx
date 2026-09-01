import { useEffect, useState } from 'react';
import type { ModeProps } from './types';
import { Ring } from '../components/Ring';
import { Result } from '../components/Result';
import { colorAt } from '../lib/colors';
import { useRound } from '../lib/useRound';
import { revealFor, visibleAfterPick } from '../lib/reveal';
import { hapticLight } from '../lib/haptics';
import { playTick } from '../lib/sound';

const SPIN_MS = 3000;
/** Full turns before the needle starts hunting for its target. */
const TURNS = 4;

/**
 * Spinner. A needle sweeps out from the middle of the screen, slows like a
 * roulette wheel, and comes to rest pointing at one finger.
 *
 * It is aimed at the drawn winner from the first frame — the deceleration is
 * fitted to land there — so where people put their fingers never changes
 * anyone's odds.
 */
export function Spinner({ settings, hint }: ModeProps) {
  const [angle, setAngle] = useState(-Math.PI / 2);
  const [target, setTarget] = useState<number | null>(null);
  // Fixed when the round starts rather than read per frame — a rotation
  // mid-spin is not worth chasing, and a stable centre keeps the spin effect
  // from restarting on every render.
  const [centre, setCentre] = useState(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
  const round = useRound({
    soundEnabled: settings.soundEnabled,
    hapticsEnabled: settings.hapticsEnabled,
    onStart: (ranking) => {
      setTarget(ranking[0]?.id ?? null);
      setCentre({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    },
  });
  const { phase, ranking, touches, beep, buzz, finish } = round;

  useEffect(() => {
    if (phase !== 'running' || target === null) return;
    const winner = touches.find((t) => t.id === target);
    if (!winner) return;

    const from = angle;
    const bearing = Math.atan2(winner.y - centre.y, winner.x - centre.x);
    // Wind forward a whole number of turns, then stop on the winner's bearing.
    const to = from + TURNS * Math.PI * 2 + ((bearing - from) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

    const started = performance.now();
    let frame = 0;
    let lastTick = -1;

    const step = (now: number) => {
      const t = Math.min(1, (now - started) / SPIN_MS);
      const eased = 1 - (1 - t) ** 4;
      const next = from + (to - from) * eased;
      setAngle(next);
      // One click per eighth-turn, which naturally slows with the needle.
      const tickIndex = Math.floor(next / (Math.PI / 4));
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
    // `angle` is the starting point, read once; including it would restart the
    // spin on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, target, centre, beep, buzz, finish]);

  const done = phase === 'done';
  const visible = done ? visibleAfterPick(touches, settings.outcome, ranking) : touches;
  const reach = Math.min(window.innerWidth, window.innerHeight) * 0.42;

  return (
    <div className="mode-surface" {...round.handlers}>
      {phase !== 'gathering' && (
        <svg className="spinner-layer" aria-hidden="true">
          <line
            x1={centre.x}
            y1={centre.y}
            x2={centre.x + Math.cos(angle) * reach}
            y2={centre.y + Math.sin(angle) * reach}
            stroke={done && ranking[0] ? colorAt(ranking[0].colorIndex) : '#ffffff'}
            strokeWidth={5}
            strokeLinecap="round"
          />
          <circle cx={centre.x} cy={centre.y} r={9} fill="#ffffff" />
        </svg>
      )}

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
