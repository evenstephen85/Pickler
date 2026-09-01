import type { ModeId } from '../types';
import { PLAYER_COLORS } from '../lib/colors';

/**
 * A small picture of what each game does, drawn as inline SVG so the menu
 * carries no image files and every tile stays crisp at any size. Each one is a
 * still frame of the moment that makes the game recognisable.
 */
export function ModePreview({ mode }: { mode: ModeId }) {
  return (
    <svg className="mode-preview" viewBox="0 0 100 68" aria-hidden="true">
      {mode === 'touch-pick' && <TouchPickArt />}
      {mode === 'straw' && <StrawArt />}
      {mode === 'spinner' && <SpinnerArt />}
      {mode === 'potato' && <PotatoArt />}
      {mode === 'bumper' && <BumperArt />}
      {mode === 'dvd' && <DvdArt />}
      {mode === 'dice' && <DiceArt />}
      {mode === 'keno' && <KenoArt />}
    </svg>
  );
}

const [ROSE, CYAN, AMBER, VIOLET] = PLAYER_COLORS;

/** Three rings mid-countdown, one of them flaring. */
function TouchPickArt() {
  return (
    <>
      <circle cx="26" cy="24" r="11" fill="none" stroke={CYAN} strokeWidth="2.5" opacity="0.5" />
      <circle cx="72" cy="20" r="11" fill="none" stroke={AMBER} strokeWidth="2.5" opacity="0.5" />
      <circle cx="48" cy="45" r="15" fill="none" stroke={ROSE} strokeWidth="3.5" />
      <circle cx="48" cy="45" r="20" fill="none" stroke={ROSE} strokeWidth="1.5" opacity="0.45" />
    </>
  );
}

/** Straws of different lengths hanging out of a bundle. */
function StrawArt() {
  const straws = [
    { x: 26, len: 13 },
    { x: 40, len: 27 },
    { x: 54, len: 21 },
    { x: 68, len: 32 },
  ];
  return (
    <>
      <ellipse cx="47" cy="14" rx="26" ry="7" fill="#c9a227" opacity="0.35" />
      {straws.map((s) => (
        <line
          key={s.x}
          x1={s.x}
          y1="14"
          x2={s.x}
          y2={14 + s.len}
          stroke="#d9b24c"
          strokeWidth="4"
          strokeLinecap="round"
        />
      ))}
      <line x1="26" y1="14" x2="26" y2="27" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

/** A needle stopped on one of the rings. */
function SpinnerArt() {
  return (
    <>
      <circle cx="50" cy="34" r="24" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.25" />
      <circle cx="76" cy="34" r="8" fill="none" stroke={ROSE} strokeWidth="2.5" />
      <circle cx="34" cy="14" r="7" fill="none" stroke={CYAN} strokeWidth="2.5" opacity="0.5" />
      <circle cx="30" cy="52" r="7" fill="none" stroke={AMBER} strokeWidth="2.5" opacity="0.5" />
      <line x1="50" y1="34" x2="72" y2="34" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="34" r="4" fill="#ffffff" />
    </>
  );
}

/** The potato in flight between two fingers. */
function PotatoArt() {
  return (
    <>
      <circle cx="22" cy="42" r="9" fill="none" stroke={CYAN} strokeWidth="2.5" opacity="0.45" />
      <circle cx="78" cy="24" r="9" fill="none" stroke={AMBER} strokeWidth="2.5" opacity="0.45" />
      <path d="M28 39 Q50 20 71 27" fill="none" stroke="#ffffff" strokeWidth="1.4" strokeDasharray="3 4" opacity="0.5" />
      <circle cx="52" cy="28" r="7" fill="#ffffff" />
      <circle cx="52" cy="28" r="12" fill="#ffffff" opacity="0.18" />
    </>
  );
}

/** Two rings meeting, with a spark where they touch. */
function BumperArt() {
  return (
    <>
      <circle cx="36" cy="34" r="14" fill="none" stroke={ROSE} strokeWidth="3" />
      <circle cx="64" cy="34" r="14" fill="none" stroke={VIOLET} strokeWidth="3" />
      <path d="M50 22 L50 46 M43 28 L57 40 M57 28 L43 40" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      <circle cx="82" cy="52" r="8" fill="none" stroke={AMBER} strokeWidth="2.5" opacity="0.35" />
    </>
  );
}

/** A grid of numbers with one of them called. */
function KenoArt() {
  const cells = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      const called = row === 1 && col === 3;
      const claimed = (row === 0 && col === 1) || (row === 2 && col === 4);
      cells.push(
        <rect
          key={`${row}-${col}`}
          x={14 + col * 13}
          y={16 + row * 13}
          width="10"
          height="10"
          rx="2"
          fill={called ? ROSE : claimed ? CYAN : 'none'}
          opacity={called ? 1 : claimed ? 0.7 : 1}
          stroke={called ? ROSE : claimed ? CYAN : '#ffffff'}
          strokeWidth={called ? 2.5 : 1.2}
          strokeOpacity={called || claimed ? 1 : 0.3}
        />,
      );
    }
  }
  return <>{cells}</>;
}

/** Two dice, one of them the high roll. */
function DiceArt() {
  return (
    <>
      <rect x="18" y="20" width="26" height="26" rx="5" fill="none" stroke={CYAN} strokeWidth="2.5" opacity="0.5" />
      <circle cx="31" cy="33" r="3" fill={CYAN} opacity="0.5" />
      <rect x="54" y="16" width="32" height="32" rx="6" fill="none" stroke={ROSE} strokeWidth="3" />
      {[[63, 24], [77, 24], [63, 32], [77, 32], [63, 40], [77, 40]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.4" fill={ROSE} />
      ))}
    </>
  );
}

/** A ring arriving in the corner of the box. */
function DvdArt() {
  return (
    <>
      <rect x="8" y="8" width="84" height="52" rx="3" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.28" />
      <path d="M62 44 L79 20" stroke={CYAN} strokeWidth="1.4" strokeDasharray="3 4" opacity="0.55" />
      <path d="M40 20 L62 44" stroke={CYAN} strokeWidth="1.4" strokeDasharray="3 4" opacity="0.3" />
      <circle cx="82" cy="18" r="9" fill="none" stroke={CYAN} strokeWidth="3" />
      <path d="M92 8 L92 16 M84 8 L92 8" stroke={AMBER} strokeWidth="2.5" strokeLinecap="round" />
    </>
  );
}
