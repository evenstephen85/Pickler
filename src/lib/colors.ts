/**
 * Ring colors, in assignment order. Hues are spread far enough apart that any
 * two rings on screen at once read as clearly different colors — including for
 * the most common forms of color blindness, which is why there is no
 * red-next-to-green pairing early in the list.
 */
export const PLAYER_COLORS = [
  '#ff2e63', // rose
  '#00e5ff', // cyan
  '#ffd400', // amber
  '#7c4dff', // violet
  '#00e676', // green
  '#ff6d00', // orange
  '#ff4dff', // magenta
  '#18ffff', // aqua
  '#c6ff00', // lime
  '#448aff', // blue
] as const;

export function colorAt(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}
