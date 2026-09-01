import { useEffect, useState } from 'react';
import type { ModeProps } from './types';
import { Ring } from '../components/Ring';
import { Result } from '../components/Result';
import { useRound } from '../lib/useRound';
import { revealFor, visibleAfterPick } from '../lib/reveal';
import { hapticHeavy } from '../lib/haptics';
import { playTick } from '../lib/sound';

const COUNTDOWN_BEATS = 3;
const BEAT_MS = 620;

/**
 * The classic. Everyone holds a finger down, the rings beat out a countdown,
 * and on the last beat the draw is revealed.
 */
export function TouchPick({ settings, hint }: ModeProps) {
  const [beat, setBeat] = useState(0);
  const round = useRound({
    soundEnabled: settings.soundEnabled,
    hapticsEnabled: settings.hapticsEnabled,
    onStart: () => setBeat(COUNTDOWN_BEATS),
  });
  const { phase, ranking, shown, beep, buzz, finish } = round;

  // One beat at a time, so a finger lifted mid-count can still abort the round.
  useEffect(() => {
    if (phase !== 'running' || beat === 0) return;
    beep(() => playTick(beat));
    buzz(hapticHeavy);
    const timer = setTimeout(() => {
      if (beat > 1) setBeat(beat - 1);
      else {
        setBeat(0);
        finish();
      }
    }, BEAT_MS);
    return () => clearTimeout(timer);
  }, [phase, beat, beep, buzz, finish]);

  const done = phase === 'done';
  const visible = done ? visibleAfterPick(shown, settings.outcome, ranking) : shown;

  return (
    <div className="mode-surface" {...round.handlers}>
      {visible.map((touch) => (
        <Ring
          key={touch.id}
          touch={touch}
          label={touch.label}
          pulsing={phase === 'running'}
          {...(done ? revealFor(touch, { outcome: settings.outcome, ranking, teamCount: settings.teamCount }) : {})}
        />
      ))}

      {phase === 'gathering' && hint}
      {done && (
        <Result
          outcome={settings.outcome}
          ranking={ranking}
          teamCount={settings.teamCount}
          onAgain={round.reset}
        />
      )}
    </div>
  );
}
