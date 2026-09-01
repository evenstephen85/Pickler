import { useCallback, useEffect, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Touch } from '../types';
import { PLAYER_COLORS } from './colors';
import { keyLabel, keySpot } from './keyboard';

type Options = {
  /** While false, new players are ignored — used once a pick is under way. */
  accepting: boolean;
  onAdd?: (touch: Touch, all: Touch[]) => void;
  onRemove?: (touch: Touch, all: Touch[]) => void;
};

/** Keyboard players get ids below this, so they can never collide with a pointerId. */
const KEY_ID_BASE = -1000;

/**
 * Keys that mean something else. Everything else — letters, digits, punctuation
 * — is fair game, so each person at a desk can claim their own key.
 */
const RESERVED_KEYS = new Set([
  'Escape', 'Tab', 'Enter', 'NumpadEnter', 'Backspace', 'Delete',
  'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
  'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'CapsLock',
]);

/** Keeps a ring clear of the screen edges when it is placed for a player. */
const EDGE_MARGIN = 84;

/**
 * Where a keyboard player's ring sits: the same spot on screen that their key
 * occupies on the keyboard, so the people holding Q, W and E see three rings
 * across the top in that order. A key we don't have a position for falls back
 * to a slot on a circle.
 */
function keyPosition(code: string, colorIndex: number): { x: number; y: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const spot = keySpot(code);
  if (spot) {
    return {
      x: EDGE_MARGIN + spot.nx * (w - EDGE_MARGIN * 2),
      y: EDGE_MARGIN + spot.ny * (h - EDGE_MARGIN * 2),
    };
  }
  const angle = (colorIndex / PLAYER_COLORS.length) * Math.PI * 2 - Math.PI / 2;
  const radius = Math.min(w, h) * 0.32;
  return { x: w / 2 + Math.cos(angle) * radius, y: h / 2 + Math.sin(angle) * radius };
}

/**
 * Tracks every player in a round, from either input:
 *
 *  - **Touch**, via Pointer Events — the real thing. Pointer Events rather than
 *    Touch Events because setPointerCapture keeps a finger's moves reporting to
 *    this element even if it slides over another one.
 *  - **Held keyboard keys**, for desktop, where there is only ever one pointer.
 *    Hold a key to be in the round, let go to drop out — exactly like a finger.
 *
 * Colors are handed out by lowest free slot, not by arrival count, so when
 * someone lifts and comes back the palette doesn't drift.
 */
export function usePlayers({ accepting, onAdd, onRemove }: Options) {
  const [touches, setTouches] = useState<Touch[]>([]);

  const add = useCallback(
    (id: number, x: number, y: number, key?: string) => {
      setTouches((prev) => {
        if (prev.some((t) => t.id === id)) return prev;
        if (prev.length >= PLAYER_COLORS.length) return prev;
        const used = new Set(prev.map((t) => t.colorIndex));
        let colorIndex = 0;
        while (used.has(colorIndex)) colorIndex++;
        const at = key ? keyPosition(key, colorIndex) : { x, y };
        const touch: Touch = {
          id,
          x: at.x,
          y: at.y,
          colorIndex,
          downAt: performance.now(),
          label: key ? keyLabel(key) : undefined,
        };
        const next = [...prev, touch];
        onAdd?.(touch, next);
        return next;
      });
    },
    [onAdd],
  );

  const remove = useCallback(
    (id: number) => {
      setTouches((prev) => {
        const gone = prev.find((t) => t.id === id);
        if (!gone) return prev;
        const next = prev.filter((t) => t.id !== id);
        onRemove?.(gone, next);
        return next;
      });
    },
    [onRemove],
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!accepting) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      add(e.pointerId, e.clientX, e.clientY);
    },
    [accepting, add],
  );

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    setTouches((prev) => {
      const i = prev.findIndex((t) => t.id === e.pointerId);
      if (i === -1) return prev;
      const next = prev.slice();
      next[i] = { ...next[i], x: e.clientX, y: e.clientY };
      return next;
    });
  }, []);

  const handlePointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => remove(e.pointerId), [remove]);

  // Keyboard players. `code` is the identity, not `key`, so a held key that
  // starts repeating (or arrives shifted) is still the same player.
  useEffect(() => {
    const idFor = (code: string) => {
      let hash = 0;
      for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) | 0;
      return KEY_ID_BASE - Math.abs(hash % 100000);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (RESERVED_KEYS.has(e.code)) return;
      if (!accepting) return;
      e.preventDefault();
      add(idFor(e.code), 0, 0, e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (RESERVED_KEYS.has(e.code)) return;
      remove(idFor(e.code));
    };
    // A browser tab that loses focus never delivers the keyup, which would
    // strand a ring on screen forever.
    const onBlur = () => setTouches((prev) => prev.filter((t) => t.id > KEY_ID_BASE));

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [accepting, add, remove]);

  const clear = useCallback(() => setTouches([]), []);

  return {
    touches,
    clear,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  };
}
