/**
 * The maths behind the DVD-corner game.
 *
 * A ring bouncing off four walls at constant speed is easiest to reason about
 * "unfolded": let it travel in a straight line forever and fold the position
 * back into the box with a triangle wave. In unfolded space a wall bounce is
 * simply the coordinate passing a multiple of the box's width — so a *corner*
 * hit is both coordinates passing a multiple at the same instant.
 *
 * That gives an exact way to schedule one: pick the moment a player should hit
 * a corner, pick how many wall-lengths they cover getting there, and the
 * velocity falls out. Everybody genuinely bounces; the corners just arrive in
 * the order the draw already decided.
 */

export type Box = { width: number; height: number };

export type Flight = {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  /** When this ring reaches its corner, in seconds from the start. */
  hitAt: number;
};

/** Folds an unfolded coordinate back into [0, span] with a triangle wave. */
export function fold(value: number, span: number): number {
  if (span <= 0) return 0;
  const period = span * 2;
  const wrapped = ((value % period) + period) % period;
  return wrapped <= span ? wrapped : period - wrapped;
}

/**
 * Which corner a flight ends in: 0 is the low edge of that axis (left / top),
 * 1 is the high edge (right / bottom).
 */
export type Corner = { cx: 0 | 1; cy: 0 | 1 };

export const CORNERS: Corner[] = [
  { cx: 0, cy: 0 },
  { cx: 1, cy: 1 },
  { cx: 1, cy: 0 },
  { cx: 0, cy: 1 },
];

/**
 * Builds a flight that starts at (x0, y0) and lands exactly on `corner` at
 * `hitAt` seconds, moving at roughly `speed` pixels per second.
 *
 * The unfolded coordinate has to cover a whole number of box-lengths, and the
 * *parity* of that number decides which end it lands on: an even count folds
 * back to 0, an odd one to the far edge. So picking the corner is just picking
 * the parity.
 */
export function planFlight(
  x0: number,
  y0: number,
  box: Box,
  hitAt: number,
  speed: number,
  corner: Corner,
): Flight {
  const lengths = (start: number, span: number, end: 0 | 1) => {
    const wanted = (speed * hitAt) / Math.SQRT2;
    let count = Math.max(1, Math.round((wanted + start) / span));
    // Even lands on the near edge, odd on the far one.
    if (count % 2 !== end) count += 1;
    return (count * span - start) / hitAt;
  };

  return {
    x0,
    y0,
    vx: lengths(x0, box.width, corner.cx),
    vy: lengths(y0, box.height, corner.cy),
    hitAt,
  };
}

/** Where a flight is at time `t` (seconds), folded back inside the box. */
export function positionAt(flight: Flight, t: number, box: Box): { x: number; y: number } {
  return {
    x: fold(flight.x0 + flight.vx * t, box.width),
    y: fold(flight.y0 + flight.vy * t, box.height),
  };
}
