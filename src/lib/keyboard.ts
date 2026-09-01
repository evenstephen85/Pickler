/**
 * Where each key sits on a real keyboard, as a row index and a column offset
 * within that row. Desktop players are placed on screen in roughly the same
 * arrangement as the keys they are holding, so a glance at the screen tells you
 * which ring is yours without hunting for your color.
 */
const ROWS: string[][] = [
  ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0'],
  ['KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP'],
  ['KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','Semicolon'],
  ['KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','Comma','Period','Slash'],
  ['Space'],
];

/** The stagger of a real keyboard, in key widths. */
const ROW_OFFSETS = [0, 0.35, 0.6, 0.95, 3.5];
const ROW_WIDTH = 10.5;

export type KeySpot = { nx: number; ny: number };

/** Normalised 0-1 position of a key, or null if it isn't one we place. */
export function keySpot(code: string): KeySpot | null {
  for (let row = 0; row < ROWS.length; row++) {
    const col = ROWS[row].indexOf(code);
    if (col === -1) continue;
    const span = code === 'Space' ? 5 : 1;
    return {
      nx: (ROW_OFFSETS[row] + col + span / 2) / ROW_WIDTH,
      ny: (row + 0.5) / ROWS.length,
    };
  }
  return null;
}

/** The character to draw inside a keyboard player's ring. */
export function keyLabel(code: string): string {
  if (code === 'Space') return '␣';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const punctuation: Record<string, string> = {
    Semicolon: ';', Comma: ',', Period: '.', Slash: '/',
    Quote: "'", BracketLeft: '[', BracketRight: ']',
    Minus: '-', Equal: '=', Backslash: '\\', Backquote: '`',
  };
  return punctuation[code] ?? '?';
}
