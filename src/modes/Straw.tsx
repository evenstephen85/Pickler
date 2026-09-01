import { useEffect, useState } from 'react';
import type { Touch } from '../types';
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
const SHORTEST_PX = 90;
/** Slack coiled in the knot on top of the longest straw, so every straw shrinks. */
const TANGLE_PX = 90;

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

/**
 * Where the bundle sits: the point on screen that is furthest from every hand,
 * found by scoring a coarse grid on distance-to-the-nearest-player. Parking it
 * dead centre put it under somebody's palm as often as not; this way the straws
 * always have somewhere to run to.
 */
function knotSpot(players: Touch[]): { x: number; y: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const fallback = { x: w / 2, y: h / 2 };
  if (players.length === 0) return fallback;

  const margin = 110;
  let best = fallback;
  let bestScore = -Infinity;
  for (let gx = 0; gx <= 8; gx++) {
    for (let gy = 0; gy <= 12; gy++) {
      const x = margin + (gx / 8) * (w - margin * 2);
      const y = margin + (gy / 12) * (h - margin * 2);
      const nearest = Math.min(...players.map((p) => Math.hypot(p.x - x, p.y - y)));
      if (nearest > bestScore) {
        bestScore = nearest;
        best = { x, y };
      }
    }
  }
  return best;
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
  const knot = knotSpot(shown);
  const showTeamWeb = done && settings.outcome === 'teams';

  /**
   * The places are spread between the shortest straw and whatever the player
   * closest to the bundle can actually hold. Sizing the longest straw to that
   * reach — rather than to a fixed step per place — is what keeps the drawn
   * lengths honest: a straw longer than its own reach would have to be capped,
   * and two capped straws look like a tie.
   */
  const reachOf = (t: Touch) => Math.hypot(knot.x - t.x, knot.y - t.y);
  const tightest = shown.length > 0 ? Math.min(...shown.map(reachOf)) : 400;
  const longest = Math.max(SHORTEST_PX + 60, tightest * 0.92);
  const stepPx = ranking.length > 1 ? (longest - SHORTEST_PX) / (ranking.length - 1) : 0;

  /**
   * Everybody starts holding the same amount of straw — more than the longest
   * anybody will end up with. That is what makes the pull read correctly:
   * every straw only ever gets *shorter*, and they all start even, so no one
   * can tell anything from the opening frame.
   */
  const startLength = longest + TANGLE_PX;

  /**
   * How much straw a player is left holding — rank 0 the shortest, then a fixed
   * step per place. Measured in pixels rather than as a fraction of the reach
   * to the bundle, so the lengths stay comparable by eye wherever the fingers
   * landed.
   */
  function remainingFor(id: number): number {
    const rank = ranking.findIndex((t) => t.id === id);
    if (rank === -1) return startLength;
    return SHORTEST_PX + rank * stepPx;
  }

  /**
   * A straw from the hand towards the bundle, as a single arc.
   *
   * The bow is a *ratio* of the straw's own length rather than a fixed number
   * of pixels. That matters more than it looks: with a fixed bow, a short
   * straw gained proportionally more drawn length than a long one, and the
   * places came out in the wrong order on screen even though the draw
   * underneath was right. Scaling it keeps every straw's drawn length
   * proportional to the length it is meant to be showing.
   *
   * Any length over the straight-line distance to the bundle has to go
   * somewhere, so it goes into a wider bow — which is what makes the straws
   * arc over each other and pile into a tangle in the middle at the start,
   * before the pull draws them out straight.
   */
  function strawPath(touch: Touch, length: number, toward = knot): string {
    const dx = toward.x - touch.x;
    const dy = toward.y - touch.y;
    const reach = Math.hypot(dx, dy) || 1;
    const ux = dx / reach;
    const uy = dy / reach;

    const chord = Math.min(length, reach);
    const surplus = Math.max(0, length - chord);
    // Each straw leans its own way, so no two lie on top of each other.
    const lean = touch.colorIndex % 2 === 0 ? 1 : -1;
    const bow = ((0.10 + (touch.colorIndex % 3) * 0.015) * chord + surplus * 0.45) * lean;

    const tipX = touch.x + ux * chord;
    const tipY = touch.y + uy * chord;
    const midX = (touch.x + tipX) / 2 + -uy * bow;
    const midY = (touch.y + tipY) / 2 + ux * bow;

    return `M ${touch.x} ${touch.y} Q ${midX} ${midY} ${tipX} ${tipY}`;
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
            {/* A coil rather than a target: three loops at different tilts so
                the middle reads as tangled straw. */}
            <ellipse cx={knot.x} cy={knot.y} rx={30} ry={20} transform={`rotate(-18 ${knot.x} ${knot.y})`} />
            <ellipse cx={knot.x} cy={knot.y} rx={24} ry={15} transform={`rotate(34 ${knot.x} ${knot.y})`} />
            <ellipse cx={knot.x} cy={knot.y} rx={15} ry={11} transform={`rotate(72 ${knot.x} ${knot.y})`} />
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
                      d={strawPath(member, Math.hypot(hub.x - member.x, hub.y - member.y), hub)}
                      stroke={color}
                    />
                  ))}
                  <circle className="team-hub" cx={hub.x} cy={hub.y} r={11} fill={color} />
                </g>
              );
            })
          : shown.map((touch) => {
              // Only ever shrinks: from the shared starting length down to
              // whatever this player's draw left them holding.
              const length =
                phase === 'gathering'
                  ? startLength
                  : startLength + (remainingFor(touch.id) - startLength) * progress;
              const d = strawPath(touch, length);
              return (
                <g key={touch.id}>
                  <path className="straw shadow" d={d} />
                  <path className="straw" d={d} />
                  {/* Whose hand is on this straw. In 'pick one' the losing rings
                      are gone, and without these the straws float unowned. */}
                  <circle
                    className="straw-grip"
                    cx={touch.x}
                    cy={touch.y}
                    r={10}
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
