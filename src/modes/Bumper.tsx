import { useEffect, useRef, useState } from 'react';
import type { ModeProps } from './types';
import { Ring } from '../components/Ring';
import { Result } from '../components/Result';
import { useRound } from '../lib/useRound';
import { revealFor, visibleAfterPick } from '../lib/reveal';
import { hapticHeavy, hapticLight } from '../lib/haptics';
import { playEliminate, playTick } from '../lib/sound';

const RADIUS = 66;
/** A crash only counts as a hit this often, so one long graze isn't ten hits. */
const HIT_COOLDOWN_MS = 450;
/** Chance a crash actually knocks somebody out. The rest are near misses. */
const KNOCKOUT_CHANCE = 0.45;

/**
 * Bumper Rings. The rings stay on your fingers — you drive them. Slide into
 * somebody and you might knock them out; you might just bounce off. Keep
 * crashing until one ring is left.
 *
 * A note on fairness, because this is the mode where it is easy to get wrong:
 * deciding a crash on the spot is *not* fair — a player who charges around
 * meets more rings than one who sits still, so hustle would leak into the
 * odds. (Eliminating both rings in a collision only trades one bias for
 * another.) So the draw is made up front, uniformly, and a crash that lands
 * knocks out whichever of the two rings the draw already placed lower. The
 * driving and the crashing are real; the result underneath them is even.
 */
export function Bumper({ settings, hint }: ModeProps) {
  const [out, setOut] = useState<number[]>([]);
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number }[]>([]);
  const lastHitRef = useRef(0);
  const sparkIdRef = useRef(0);
  const round = useRound({
    soundEnabled: settings.soundEnabled,
    hapticsEnabled: settings.hapticsEnabled,
    onStart: () => setOut([]),
  });
  const { phase, ranking, touches, shown, beep, buzz, finish } = round;

  // Knocked-out players take their fingers off, which would otherwise take
  // their rings off the screen too. Their last position is kept so the final
  // turn order or team split can still show everybody.
  const seenRef = useRef(new Map<number, { x: number; y: number }>());
  useEffect(() => {
    for (const t of touches) seenRef.current.set(t.id, { x: t.x, y: t.y });
  }, [touches]);

  // Collisions are checked against the live finger positions on every frame the
  // rings move, rather than on a physics tick — the players are the physics.
  useEffect(() => {
    if (phase !== 'running' || ranking.length === 0) return;

    const rankOf = new Map(ranking.map((t, i) => [t.id, i]));
    const live = touches.filter((t) => !out.includes(t.id));

    if (live.length <= 1) {
      finish(ranking.map((t) => ({ ...t, ...(seenRef.current.get(t.id) ?? { x: t.x, y: t.y }) })));
      return;
    }

    const now = performance.now();
    if (now - lastHitRef.current < HIT_COOLDOWN_MS) return;

    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i];
        const b = live[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) > RADIUS * 2) continue;

        lastHitRef.current = now;
        const at = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const sparkId = sparkIdRef.current++;
        setSparks((prev) => [...prev, { id: sparkId, ...at }]);
        setTimeout(() => setSparks((prev) => prev.filter((s) => s.id !== sparkId)), 500);

        // Most crashes are just a bump. When one does land, the draw decides
        // who goes — never the collision itself.
        if (Math.random() > KNOCKOUT_CHANCE) {
          beep(() => playTick(1));
          buzz(hapticLight);
          return;
        }
        const loser = (rankOf.get(a.id) ?? 0) > (rankOf.get(b.id) ?? 0) ? a : b;
        setOut((prev) => (prev.includes(loser.id) ? prev : [...prev, loser.id]));
        beep(playEliminate);
        buzz(hapticHeavy);
        return;
      }
    }
  }, [phase, touches, out, ranking, beep, buzz, finish]);

  const done = phase === 'done';
  const running = phase === 'running';
  const visible = done ? visibleAfterPick(shown, settings.outcome, ranking) : shown;

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

      {phase === 'gathering' && hint}
      {running && (
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
