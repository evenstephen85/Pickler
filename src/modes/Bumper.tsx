import { useEffect, useRef, useState } from 'react';
import type { ModeProps } from './types';
import { Ring } from '../components/Ring';
import { Result } from '../components/Result';
import { useRound } from '../lib/useRound';
import { revealFor, visibleAfterPick } from '../lib/reveal';
import { hapticHeavy } from '../lib/haptics';
import { playEliminate } from '../lib/sound';

const RADIUS = 66;
const SPEED = 0.22;
/** If nothing has collided by now, everything is drawn towards the middle. */
const HERD_AFTER_MS = 2500;

type Body = { id: number; x: number; y: number; vx: number; vy: number };

/**
 * Bumper Rings. The rings come off their fingers, drift around the screen, and
 * knock each other out on contact until one is left.
 *
 * A note on fairness, because this is the mode where it is easy to get wrong:
 * deciding a collision on the spot is *not* fair — a ring that happens to start
 * in a corner meets fewer rings than one in the middle, so position would leak
 * into the odds. (Eliminating both rings in a collision, as a fix, only trades
 * one bias for another.) So the draw is made up front, uniformly, and a
 * collision knocks out whichever of the two rings the draw already placed
 * lower. The crashes are the show; the result underneath them is even.
 */
export function Bumper({ settings, hint }: ModeProps) {
  const [bodies, setBodies] = useState<Body[]>([]);
  const [out, setOut] = useState<number[]>([]);
  const bodiesRef = useRef<Body[]>([]);
  const round = useRound({
    soundEnabled: settings.soundEnabled,
    hapticsEnabled: settings.hapticsEnabled,
    onStart: (ranking) => {
      const seeded = ranking.map((t) => {
        const heading = Math.random() * Math.PI * 2;
        return { id: t.id, x: t.x, y: t.y, vx: Math.cos(heading) * SPEED, vy: Math.sin(heading) * SPEED };
      });
      bodiesRef.current = seeded;
      setBodies(seeded);
      setOut([]);
    },
  });
  const { phase, ranking, touches, beep, buzz, finish } = round;

  useEffect(() => {
    if (phase !== 'running' || ranking.length === 0) return;

    const rankOf = new Map(ranking.map((t, i) => [t.id, i]));
    const eliminated = new Set<number>();
    const started = performance.now();
    let last = started;
    let frame = 0;

    const step = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const w = window.innerWidth;
      const h = window.innerHeight;

      const live = bodiesRef.current.filter((b) => !eliminated.has(b.id));

      for (const b of live) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        // Bounce off the edges.
        if (b.x < RADIUS) { b.x = RADIUS; b.vx = Math.abs(b.vx); }
        if (b.x > w - RADIUS) { b.x = w - RADIUS; b.vx = -Math.abs(b.vx); }
        if (b.y < RADIUS) { b.y = RADIUS; b.vy = Math.abs(b.vy); }
        if (b.y > h - RADIUS) { b.y = h - RADIUS; b.vy = -Math.abs(b.vy); }
        // Nudge everything towards the middle if the rings are being shy, so a
        // round always ends.
        if (now - started > HERD_AFTER_MS) {
          b.vx += ((w / 2 - b.x) / w) * 0.0016 * dt;
          b.vy += ((h / 2 - b.y) / h) * 0.0016 * dt;
        }
      }

      outer: for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
          const a = live[i];
          const b = live[j];
          if (Math.hypot(a.x - b.x, a.y - b.y) > RADIUS * 2) continue;
          // The draw decides; the crash only chooses when.
          const loser = (rankOf.get(a.id) ?? 0) > (rankOf.get(b.id) ?? 0) ? a : b;
          const winner = loser === a ? b : a;
          eliminated.add(loser.id);
          setOut((prev) => [...prev, loser.id]);
          beep(playEliminate);
          buzz(hapticHeavy);
          // Kick the survivor away so the pair doesn't stay overlapped.
          const away = Math.atan2(winner.y - loser.y, winner.x - loser.x);
          winner.vx = Math.cos(away) * SPEED;
          winner.vy = Math.sin(away) * SPEED;
          break outer;
        }
      }

      setBodies(bodiesRef.current.map((b) => ({ ...b })));

      if (live.length - eliminated.size <= 1 && eliminated.size >= ranking.length - 1) {
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
  const positioned = touches.map((t) => {
    const body = running || done ? bodies.find((b) => b.id === t.id) : undefined;
    return body ? { ...t, x: body.x, y: body.y } : t;
  });
  const visible = done ? visibleAfterPick(positioned, settings.outcome, ranking) : positioned;

  return (
    <div className="mode-surface" {...round.handlers}>
      {visible.map((touch) => (
        <Ring
          key={touch.id}
          touch={touch}
          dimmed={running && out.includes(touch.id)}
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
