import { useEffect, useState } from 'react';
import type { ModeProps } from './types';
import { Ring } from '../components/Ring';
import { Result } from '../components/Result';
import { useRound } from '../lib/useRound';
import { revealFor, visibleAfterPick } from '../lib/reveal';
import { teamsFrom } from '../lib/outcome';
import { colorAt } from '../lib/colors';
import { hapticLight } from '../lib/haptics';
import { playTick } from '../lib/sound';

const PULL_MS = 4200;
/**
 * Length the short straw is drawn down to, and the gap between each place.
 * The shortest has to clear the ring drawn around the finger, or the whole
 * point of the reveal is hidden underneath it.
 */
const SHORTEST_PX = 112;
const STEP_PX = 62;
/** A long straw may be drawn out past the bundle rather than be cut short. */
const REACH_ALLOWANCE = 1.6;

/**
 * The pull is deliberately uneven: a tug, a pause, another tug. A smooth
 * ease-out lets everyone see who is winning halfway through, which takes all
 * the fun out of it — these surges keep it in doubt until the last one.
 */
const SURGES = [
  { span: 0.16, gain: 0.30 },
  { span: 0.13, gain: 0.02 },
  { span: 0.20, gain: 0.33 },
  { span: 0.14, gain: 0.03 },
  { span: 0.19, gain: 0.24 },
  { span: 0.18, gain: 0.08 },
];

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Maps elapsed 0-1 onto pulled 0-1, in fits and starts. */
function pullProgress(t: number): number {
  let elapsed = 0;
  let pulled = 0;
  for (const surge of SURGES) {
    if (t <= elapsed + surge.span) {
      return pulled + surge.gain * smoothstep((t - elapsed) / surge.span);
    }
    elapsed += surge.span;
    pulled += surge.gain;
  }
  return 1;
}

/**
 * Short Straw. Everyone takes hold of a straw from the bundle in the middle of
 * the table; they get drawn out one tug at a time, and whoever ends up holding
 * the short one is the pick.
 *
 * The lengths come from the draw, not from where anyone put their finger — the
 * straw is the storytelling, the ranking underneath it is uniform.
 */
export function Straw({ settings, hint }: ModeProps) {
  const [progress, setProgress] = useState(0);
  const round = useRound({
    soundEnabled: settings.soundEnabled,
    hapticsEnabled: settings.hapticsEnabled,
    onStart: () => setProgress(0),
  });
  const { phase, ranking, shown, beep, buzz, finish } = round;

  useEffect(() => {
    if (phase !== 'running') return;
    const started = performance.now();
    let frame = 0;
    let lastSurge = -1;

    const step = (now: number) => {
      const t = Math.min(1, (now - started) / PULL_MS);
      const pulled = pullProgress(t);
      setProgress(pulled);
      // One creak of the bundle per surge, rather than a steady tick.
      const surge = Math.floor(pulled * SURGES.length);
      if (surge !== lastSurge) {
        lastSurge = surge;
        beep(() => playTick(2));
        buzz(hapticLight);
      }
      if (t < 1) frame = requestAnimationFrame(step);
      else finish();
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [phase, beep, buzz, finish]);

  const done = phase === 'done';
  const visible = done ? visibleAfterPick(shown, settings.outcome, ranking) : shown;
  const knot = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const showTeamWeb = done && settings.outcome === 'teams';

  /**
   * How much straw a player is left holding — rank 0 the shortest, then a fixed
   * step per place. Measured in pixels rather than as a fraction of the reach
   * to the bundle, so the lengths stay comparable by eye wherever the fingers
   * landed.
   */
  function remainingFor(id: number, x: number, y: number): number {
    const rank = ranking.findIndex((t) => t.id === id);
    const reach = Math.hypot(knot.x - x, knot.y - y);
    if (rank === -1) return reach;
    // Capped generously rather than at the bundle itself: clamping every long
    // straw to the same reach would make two places look like a tie.
    return Math.min(SHORTEST_PX + rank * STEP_PX, reach * REACH_ALLOWANCE);
  }

  /** A straw with a little sag in it, so it reads as straw and not as a wire. */
  function strawPath(x: number, y: number, tipX: number, tipY: number, bend: number): string {
    const midX = (x + tipX) / 2;
    const midY = (y + tipY) / 2;
    const dx = tipX - x;
    const dy = tipY - y;
    const len = Math.hypot(dx, dy) || 1;
    // Push the control point sideways to the straw's own direction.
    return `M ${x} ${y} Q ${midX + (-dy / len) * bend} ${midY + (dx / len) * bend} ${tipX} ${tipY}`;
  }

  return (
    <div className="mode-surface straw-surface" {...round.handlers}>
      <svg className="straw-layer" aria-hidden="true">
        <defs>
          <filter id="paper-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" />
            <feComponentTransfer result="grain">
              <feFuncA type="linear" slope="0.14" />
            </feComponentTransfer>
            <feComposite in="grain" in2="SourceGraphic" operator="over" />
          </filter>
        </defs>
        <rect className="paper-grain" width="100%" height="100%" filter="url(#paper-grain)" />

        {/* The bundle everyone is drawing from, until the straws are all out. */}
        {!showTeamWeb && progress < 1 && (
          <g className="bundle" opacity={1 - progress * 0.85}>
            <circle cx={knot.x} cy={knot.y} r={26} />
            <circle cx={knot.x} cy={knot.y} r={17} />
          </g>
        )}

        {showTeamWeb
          ? teamsFrom(ranking, settings.teamCount).map((team, teamIndex) => {
              // Each team gets a knot of its own, at the middle of its members,
              // with a straw running out to every one of them.
              const hub = {
                x: team.reduce((sum, t) => sum + t.x, 0) / team.length,
                y: team.reduce((sum, t) => sum + t.y, 0) / team.length,
              };
              const color = colorAt(team[0].colorIndex);
              return (
                <g key={teamIndex}>
                  {team.map((member) => (
                    <path
                      key={member.id}
                      className="straw"
                      d={strawPath(member.x, member.y, hub.x, hub.y, 14)}
                      stroke={color}
                    />
                  ))}
                  <circle className="team-hub" cx={hub.x} cy={hub.y} r={11} fill={color} />
                </g>
              );
            })
          : shown.map((touch) => {
              const reach = Math.hypot(knot.x - touch.x, knot.y - touch.y) || 1;
              const remaining =
                phase === 'gathering'
                  ? reach
                  : reach + (remainingFor(touch.id, touch.x, touch.y) - reach) * progress;
              const ux = (knot.x - touch.x) / reach;
              const uy = (knot.y - touch.y) / reach;
              const tipX = touch.x + ux * remaining;
              const tipY = touch.y + uy * remaining;
              return (
                <g key={touch.id}>
                  <path className="straw shadow" d={strawPath(touch.x, touch.y, tipX, tipY, 10)} />
                  <path className="straw" d={strawPath(touch.x, touch.y, tipX, tipY, 10)} />
                  {/* Whose hand is on this straw. In 'pick one' the losing rings
                      are gone, and without these the straws float unowned. */}
                  <circle
                    className="straw-grip"
                    cx={touch.x}
                    cy={touch.y}
                    r={9}
                    fill={colorAt(touch.colorIndex)}
                  />
                </g>
              );
            })}
      </svg>

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
