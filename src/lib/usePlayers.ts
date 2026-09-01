import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Touch } from '../types';
import { PLAYER_COLORS } from './colors';
import { keyLabel, keySpot } from './keyboard';

type Options = {
  /** While false, new players are ignored — used once a pick is under way. */
  accepting: boolean;
  /**
   * Once a round is under way a lift never drops anybody: the ring stays put at
   * the last place the finger was. Nobody should lose their place in a draw
   * because they shifted their grip.
   */
  keepReleased: boolean;
  onAdd?: (touch: Touch, all: Touch[]) => void;
  onRemove?: (touch: Touch, all: Touch[]) => void;
};

/** Keyboard players get ids below this, so they can never collide with a pointerId. */
const KEY_ID_BASE = -1000;

/**
 * How long a lifted finger keeps its place while players are still gathering.
 * Real hands on real glass flicker — a finger rolls, the digitizer drops it for
 * 40ms, and the browser reports a fresh pointer. Without this grace period every
 * one of those restarted the "has everybody joined yet" wait, and a busy board
 * could sit there forever without ever starting a round.
 */
const RELEASE_GRACE_MS = 1400;

/** A new finger this close to a just-lifted one is treated as the same player. */
const RECLAIM_RADIUS = 120;

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
export function usePlayers({ accepting, keepReleased, onAdd, onRemove }: Options) {
  const [touches, setTouches] = useState<Touch[]>([]);
  const dropTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const cancelDrop = useCallback((id: number) => {
    const timer = dropTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      dropTimers.current.delete(id);
    }
  }, []);

  const add = useCallback(
    (id: number, x: number, y: number, key?: string) => {
      setTouches((prev) => {
        if (prev.some((t) => t.id === id && !t.released)) return prev;

        // A finger coming straight back down where one just left is the same
        // player picking their grip back up, not a new one.
        const reclaimable = prev
          .filter((t) => t.released)
          .map((t) => ({ t, distance: key ? 0 : Math.hypot(t.x - x, t.y - y) }))
          .filter(({ t, distance }) => (key ? t.label === keyLabel(key) : distance <= RECLAIM_RADIUS))
          .sort((a, b) => a.distance - b.distance)[0];

        if (reclaimable) {
          cancelDrop(reclaimable.t.id);
          return prev.map((t) =>
            t.id === reclaimable.t.id
              ? { ...t, id, released: false, ...(key ? {} : { x, y }) }
              : t,
          );
        }

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
    [onAdd, cancelDrop],
  );

  /** Actually drops a player — only ever called after the grace window. */
  const drop = useCallback(
    (id: number) => {
      dropTimers.current.delete(id);
      setTouches((prev) => {
        const gone = prev.find((t) => t.id === id);
        if (!gone || !gone.released) return prev;
        const next = prev.filter((t) => t.id !== id);
        onRemove?.(gone, next);
        return next;
      });
    },
    [onRemove],
  );

  const release = useCallback(
    (id: number) => {
      setTouches((prev) => {
        const found = prev.find((t) => t.id === id);
        if (!found || found.released) return prev;
        return prev.map((t) => (t.id === id ? { ...t, released: true } : t));
      });
      // Once a round is running the ring simply stays where it was left.
      if (keepReleased) return;
      cancelDrop(id);
      dropTimers.current.set(id, setTimeout(() => drop(id), RELEASE_GRACE_MS));
    },
    [keepReleased, cancelDrop, drop],
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
      if (i === -1 || prev[i].released) return prev;
      const next = prev.slice();
      next[i] = { ...next[i], x: e.clientX, y: e.clientY };
      return next;
    });
  }, []);

  const handlePointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => release(e.pointerId), [release]);

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
      release(idFor(e.code));
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
  }, [accepting, add, release]);

  // Nothing should outlive the component — a pending drop firing after unmount
  // would set state on a component that is gone.
  useEffect(() => {
    const timers = dropTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const clear = useCallback(() => {
    dropTimers.current.forEach(clearTimeout);
    dropTimers.current.clear();
    setTouches([]);
  }, []);

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
