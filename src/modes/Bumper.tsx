import { useEffect, useRef, useState } from 'react';
import type { ModeProps } from './types';
import { Ring } from '../components/Ring';
import { Result } from '../components/Result';
import { LeadIn } from '../components/LeadIn';
import { useRound } from '../lib/useRound';
import { useLeadIn } from '../lib/useLeadIn';
import { revealFor, visibleAfterPick } from '../lib/reveal';
import { hapticHeavy, hapticLight, hapticMedium } from '../lib/haptics';
import { playEliminate, playTick } from '../lib/sound';

const RADIUS = 66;
/** A crash only counts as a hit this often, so one long graze isn't ten hits. */
const HIT_COOLDOWN_MS = 450;
/** Chance a crash actually knocks somebody out. The rest are near misses. */
const KNOCKOUT_CHANCE = 0.45;
/** Speed of a self-driving ring, in pixels per millisecond. */
const DRIFT_SPEED = 0.22;
/** If nothing has collided by now, self-driving rings are herded inwards. */
const HERD_AFTER_MS = 2500;

type Body = { id: number; x: number; y: number; vx: number; vy: number };

/**
 * Bumper Rings. Your ring stays on your finger and you drive it — slide into
 * somebody and you might knock them out, or you might just bounce off. Keep
 * crashing until one ring is left.
 *
 * On a keyboard there is nothing to drive with: a held key has a fixed spot on
 * screen, so nobody could ever reach anybody. When every player is on a key the
 * rings drive themselves instead, drifting and bouncing off the walls the way
 * this game originally worked.
 *
 * A note on fairness, because this is the mode where it is easy to get wrong:
 * deciding a crash on the spot is *not* fair — a player who charges around
 * meets more rings than one who sits still, so hustle would leak into the odds.
 * (Eliminating both rings in a collision only trades one bias for another.) So
 * the draw is made up front, uniformly, and a crash that lands knocks out
 * whichever of the two rings the draw already placed lower. The driving and the
 * crashing are real; the result underneath them is even.
 */
export function Bumper({ settings, hint }: ModeProps) {
  const [out, setOut] = useState<number[]>([]);
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number }[]>([]);
  const [live, setLive] = useState(false);
  const [drift, setDrift] = useState<Body[]>([]);
  const lastHitRef = useRef(0);
  const sparkIdRef = useRef(0);
  const driftRef = useRef<Body[]>([]);

  const round = useRound({
    soundEnabled: settings.soundEnabled,
    hapticsEnabled: settings.hapticsEnabled,
    onStart: (ranking) => {
      setOut([]);
      outRef.current = [];
      setLive(false);
      // Seeded for both paths; only used when the rings drive themselves.
      const seeded = ranking.map((t) => {
        const heading = Math.random() * Math.PI * 2;
        return { id: t.id, x: t.x, y: t.y, vx: Math.cos(heading) * DRIFT_SPEED, vy: Math.sin(heading) * DRIFT_SPEED };
      });
      driftRef.current = seeded;
      setDrift(seeded);
    },
  });
  const { phase, ranking, touches, shown, beep, buzz, finish } = round;

  // Nobody on a touchscreen means nobody can drive.
  const selfDriving = ranking.length > 0 && ranking.every((t) => t.label !== undefined);

  const beat = useLeadIn(
    phase === 'running' && !live,
    () => setLive(true),
    (b) => {
      beep(() => playTick(b === 0 ? 0 : b));
      buzz(b === 0 ? hapticHeavy : hapticMedium);
    },
  );

  // Knocked-out players take their fingers off; their last position is kept so
  // a final turn order or team split can still show everybody.
  const seenRef = useRef(new Map<number, { x: number; y: number }>());
  useEffect(() => {
    for (const t of touches) seenRef.current.set(t.id, { x: t.x, y: t.y });
  }, [touches]);

  /** Where each ring is: on its finger, or wherever it has drifted to. */
  const positionOf = (id: number, fallback: { x: number; y: number }) => {
    if (!selfDriving) return fallback;
    const body = drift.find((b) => b.id === id);
    return body ? { x: body.x, y: body.y } : fallback;
  };

  // Everything below runs on one frame loop rather than reacting to touch
  // events. Reacting to moves meant that once players converged and held
  // still, nothing re-triggered the check and the eliminations stalled
  // half-way through a round.
  const touchesRef = useRef(touches);
  useEffect(() => {
    touchesRef.current = touches;
  }, [touches]);

  const outRef = useRef<number[]>([]);
  useEffect(() => {
    outRef.current = out;
  }, [out]);

  useEffect(() => {
    if (phase !== 'running' || !live || ranking.length === 0) return;

    const rankOf = new Map(ranking.map((t, i) => [t.id, i]));
    const started = performance.now();
    let last = started;
    let frame = 0;

    const step = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (selfDriving) {
        for (const b of driftRef.current) {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.x < RADIUS) { b.x = RADIUS; b.vx = Math.abs(b.vx); }
          if (b.x > w - RADIUS) { b.x = w - RADIUS; b.vx = -Math.abs(b.vx); }
          if (b.y < RADIUS) { b.y = RADIUS; b.vy = Math.abs(b.vy); }
          if (b.y > h - RADIUS) { b.y = h - RADIUS; b.vy = -Math.abs(b.vy); }
          // Herd them together if they are being shy, so a round always ends.
          if (now - started > HERD_AFTER_MS) {
            b.vx += ((w / 2 - b.x) / w) * 0.0016 * dt;
            b.vy += ((h / 2 - b.y) / h) * 0.0016 * dt;
          }
        }
        setDrift(driftRef.current.map((b) => ({ ...b })));
      }

      /** Wherever a ring is this frame: on its finger, or on its own path. */
      const at = (id: number) => {
        if (selfDriving) {
          const body = driftRef.current.find((b) => b.id === id);
          if (body) return { x: body.x, y: body.y };
        }
        const touch = touchesRef.current.find((t) => t.id === id);
        if (touch) return { x: touch.x, y: touch.y };
        return seenRef.current.get(id) ?? { x: w / 2, y: h / 2 };
      };

      for (const player of ranking) {
        if (!selfDriving) seenRef.current.set(player.id, at(player.id));
      }

      const standing = ranking.filter((t) => !outRef.current.includes(t.id));
      if (standing.length <= 1) {
        finish(ranking.map((t) => ({ ...t, ...at(t.id) })));
        return;
      }

      if (now - lastHitRef.current >= HIT_COOLDOWN_MS) {
        outer: for (let i = 0; i < standing.length; i++) {
          for (let j = i + 1; j < standing.length; j++) {
            const a = { id: standing[i].id, ...at(standing[i].id) };
            const b = { id: standing[j].id, ...at(standing[j].id) };
            if (Math.hypot(a.x - b.x, a.y - b.y) > RADIUS * 2) continue;

            lastHitRef.current = now;
            const sparkId = sparkIdRef.current++;
            setSparks((prev) => [...prev, { id: sparkId, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }]);
            setTimeout(() => setSparks((prev) => prev.filter((sp) => sp.id !== sparkId)), 500);

            // Most crashes are just a bump. When one does land, the draw
            // decides who goes — never the collision itself.
            if (Math.random() > KNOCKOUT_CHANCE) {
              beep(() => playTick(1));
              buzz(hapticLight);
              if (selfDriving) {
                const away = Math.atan2(b.y - a.y, b.x - a.x);
                const bodyA = driftRef.current.find((x) => x.id === a.id);
                const bodyB = driftRef.current.find((x) => x.id === b.id);
                if (bodyA) { bodyA.vx = -Math.cos(away) * DRIFT_SPEED; bodyA.vy = -Math.sin(away) * DRIFT_SPEED; }
                if (bodyB) { bodyB.vx = Math.cos(away) * DRIFT_SPEED; bodyB.vy = Math.sin(away) * DRIFT_SPEED; }
              }
              break outer;
            }

            const loserId = (rankOf.get(a.id) ?? 0) > (rankOf.get(b.id) ?? 0) ? a.id : b.id;
            outRef.current = [...outRef.current, loserId];
            setOut(outRef.current);
            beep(playEliminate);
            buzz(hapticHeavy);
            break outer;
          }
        }
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [phase, live, ranking, selfDriving, beep, buzz, finish]);

  const done = phase === 'done';
  const running = phase === 'running';
  const placed = (done ? shown : touches).map((t) => ({ ...t, ...positionOf(t.id, { x: t.x, y: t.y }) }));
  const visible = done ? visibleAfterPick(placed, settings.outcome, ranking) : placed;

  return (
    <div className="mode-surface" {...round.handlers}>
      {visible.map((touch) => (
        <Ring
          key={touch.id}
          touch={touch}
          label={touch.label}
          dimmed={running && out.includes(touch.id)}
          {...(done ? revealFor(touch, { outcome: settings.outcome, ranking, teamCount: settings.teamCount }) : {})}
        />
      ))}

      {sparks.map((spark) => (
        <div key={spark.id} className="spark" style={{ transform: `translate3d(${spark.x}px, ${spark.y}px, 0)` }} />
      ))}

      <LeadIn beat={beat} note={selfDriving ? 'rings drive themselves' : 'get ready to crash'} />

      {phase === 'gathering' && hint}
      {running && live && !selfDriving && (
        <p className="mode-hint" data-no-boop>
          Crash into each other
        </p>
      )}
      {done && (
        <Result outcome={settings.outcome} ranking={ranking} teamCount={settings.teamCount} onAgain={round.reset} />
      )}
    </div>
  );
}
