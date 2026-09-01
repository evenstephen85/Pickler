import { useEffect, useState } from 'react';
import type { ModeProps } from './types';
import { Ring } from '../components/Ring';
import { Result } from '../components/Result';
import { colorAt } from '../lib/colors';
import { useRound } from '../lib/useRound';
import { revealFor, visibleAfterPick } from '../lib/reveal';
import { hapticMedium } from '../lib/haptics';
import { playTick } from '../lib/sound';

/** The hop starts lazy and ends frantic. */
const FIRST_HOP_MS = 320;
const LAST_HOP_MS = 70;
const HOPS = 26;

/**
 * Hot Potato. A glow jumps from finger to finger, faster and faster, and
 * whoever is holding it when the music stops is the pick.
 *
 * The hop order is a shuffle that is rigged only at the very last step — the
 * final landing is the drawn winner. Everything before it is genuine
 * misdirection.
 */
export function HotPotato({ settings, hint }: ModeProps) {
  const [holderId, setHolderId] = useState<number | null>(null);
  const round = useRound({
    soundEnabled: settings.soundEnabled,
    hapticsEnabled: settings.hapticsEnabled,
  });
  const { phase, ranking, touches, beep, buzz, finish } = round;

  useEffect(() => {
    if (phase !== 'running' || ranking.length === 0) return;

    let hop = 0;
    let timer: ReturnType<typeof setTimeout>;

    const next = () => {
      // The last hop always lands on the winner; the ones before it wander.
      const landing =
        hop >= HOPS - 1
          ? ranking[0]
          : ranking[(hop * 3 + 1) % ranking.length];
      setHolderId(landing.id);
      beep(() => playTick(3));
      buzz(hapticMedium);

      if (hop >= HOPS - 1) {
        finish();
        return;
      }
      const t = hop / (HOPS - 1);
      const delay = FIRST_HOP_MS + (LAST_HOP_MS - FIRST_HOP_MS) * t * t;
      hop++;
      timer = setTimeout(next, delay);
    };

    next();
    return () => clearTimeout(timer);
  }, [phase, ranking, beep, buzz, finish]);

  const done = phase === 'done';
  const visible = done ? visibleAfterPick(touches, settings.outcome, ranking) : touches;

  return (
    <div className="mode-surface" {...round.handlers}>
      {visible.map((touch) => {
        const holding = phase === 'running' && touch.id === holderId;
        return (
          <Ring
            key={touch.id}
            touch={touch}
            color={holding ? '#ffffff' : colorAt(touch.colorIndex)}
            scale={holding ? 1.25 : 1}
            dimmed={phase === 'running' && !holding}
            {...(done ? revealFor(touch, { outcome: settings.outcome, ranking, teamCount: settings.teamCount }) : {})}
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
