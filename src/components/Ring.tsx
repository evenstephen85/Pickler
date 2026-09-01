import type { CSSProperties } from 'react';
import type { Touch } from '../types';
import { colorAt } from '../lib/colors';

interface RingProps {
  touch: Touch;
  /** Overrides the player's own color — used when rings are recolored by team. */
  color?: string;
  pulsing?: boolean;
  won?: boolean;
  /** Faded out: still on screen, no longer in the running. */
  dimmed?: boolean;
  /** Text inside the ring — a turn-order number, or a team name. */
  label?: string;
  /** Extra pixels of radius, for games that grow or shrink a ring. */
  scale?: number;
}

export function Ring({ touch, color, pulsing, won, dimmed, label, scale = 1 }: RingProps) {
  const className = [
    'ring',
    pulsing ? 'pulsing' : '',
    won ? 'won' : '',
    dimmed ? 'dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      style={
        {
          transform: `translate3d(${touch.x}px, ${touch.y}px, 0) scale(${scale})`,
          '--ring-color': color ?? colorAt(touch.colorIndex),
        } as CSSProperties
      }
    >
      {label && <span className="ring-label">{label}</span>}
    </div>
  );
}
