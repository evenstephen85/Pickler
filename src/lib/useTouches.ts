import { useCallback, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Touch } from '../types';
import { PLAYER_COLORS } from './colors';

type Options = {
  /** While false, new fingers are ignored — used once a pick is under way. */
  accepting: boolean;
  onAdd?: (touch: Touch, all: Touch[]) => void;
  onRemove?: (touch: Touch, all: Touch[]) => void;
};

/**
 * Tracks every finger on the glass via Pointer Events.
 *
 * Pointer Events rather than Touch Events because they cover mouse and pen for
 * free, which is the only way to try the app on a desktop — and because
 * setPointerCapture keeps a finger's moves reporting to this element even if it
 * slides over another one.
 *
 * Colors are handed out by lowest free slot, not by arrival count, so when
 * someone lifts a finger and puts it back down the palette doesn't drift.
 */
export function useTouches({ accepting, onAdd, onRemove }: Options) {
  const [touches, setTouches] = useState<Touch[]>([]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!accepting) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setTouches((prev) => {
        if (prev.some((t) => t.id === e.pointerId)) return prev;
        if (prev.length >= PLAYER_COLORS.length) return prev;
        const used = new Set(prev.map((t) => t.colorIndex));
        let colorIndex = 0;
        while (used.has(colorIndex)) colorIndex++;
        const touch: Touch = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          colorIndex,
          downAt: performance.now(),
        };
        const next = [...prev, touch];
        onAdd?.(touch, next);
        return next;
      });
    },
    [accepting, onAdd],
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

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      setTouches((prev) => {
        const gone = prev.find((t) => t.id === e.pointerId);
        if (!gone) return prev;
        const next = prev.filter((t) => t.id !== e.pointerId);
        onRemove?.(gone, next);
        return next;
      });
    },
    [onRemove],
  );

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
