import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Touch } from '../types';
import type { ModeProps } from './types';
import { Result } from '../components/Result';
import { colorAt, PLAYER_COLORS } from '../lib/colors';
import { useDraw } from '../lib/useDraw';
import { MIN_PLAYERS, useSettle } from '../lib/useSettle';
import { revealFor } from '../lib/reveal';
import { randomIndex } from '../lib/rng';
import { hapticHeavy, hapticLight } from '../lib/haptics';
import { playJoin, playLeave, playTick } from '../lib/sound';

const NUMBERS = 40;
/** How long the marquee dwells on a number, at the start and at the end. */
const FIRST_STEP_MS = 55;
const LAST_STEP_MS = 260;
/** Numbers the marquee travels over before it settles on each call. */
const RUN_LENGTH = 26;

/**
 * Keno. Everybody claims a number on the board, then a highlight runs over the
 * grid, slowing down, and stops on the number that's been drawn.
 *
 * This is the one game where you don't hold your finger down: you tap your
 * number and take your hand back, the way you'd mark a keno card. Tap it again
 * to give it up. That is why it drives `useDraw` off its own claims rather than
 * going through `useRound`, which tracks held fingers.
 */
export function Keno({ settings }: ModeProps) {
  /** Claimed numbers, keyed by the 1-based number on the board. */
  const [claims, setClaims] = useState<Map<number, Touch>>(new Map());
  const [marquee, setMarquee] = useState<number | null>(null);
  const [called, setCalled] = useState<number[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);

  const draw = useDraw({
    soundEnabled: settings.soundEnabled,
    hapticsEnabled: settings.hapticsEnabled,
  });
  const { phase, ranking, frozen, beep, buzz, start, finish, clearDraw } = draw;

  const players = [...claims.values()].sort((a, b) => a.downAt - b.downAt);
  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  });

  /** The centre of a cell on screen, so the result can be laid out over it. */
  const cellCentre = useCallback((number: number) => {
    const cell = boardRef.current?.querySelector<HTMLElement>(`[data-number="${number}"]`);
    if (!cell) return { x: 0, y: 0 };
    const box = cell.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }, []);

  const toggle = useCallback(
    (number: number) => {
      setClaims((prev) => {
        const next = new Map(prev);
        if (next.has(number)) {
          next.delete(number);
          beep(playLeave);
          return next;
        }
        if (next.size >= PLAYER_COLORS.length) return prev;
        const used = new Set([...next.values()].map((t) => t.colorIndex));
        let colorIndex = 0;
        while (used.has(colorIndex)) colorIndex++;
        const at = cellCentre(number);
        next.set(number, {
          id: number,
          x: at.x,
          y: at.y,
          colorIndex,
          downAt: performance.now(),
          label: String(number),
        });
        beep(() => playJoin(next.size));
        buzz(hapticLight);
        return next;
      });
    },
    [beep, buzz, cellCentre],
  );

  function handleCell(e: ReactPointerEvent<HTMLButtonElement>) {
    if (phase !== 'gathering') return;
    const number = Number(e.currentTarget.dataset.number);
    if (Number.isFinite(number)) toggle(number);
  }

  // Desktop: a key claims a free number, and the same key gives it back.
  const keyClaims = useRef(new Map<string, number>());
  useEffect(() => {
    if (phase !== 'gathering') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'Escape' || e.code === 'Tab') return;
      const held = keyClaims.current.get(e.code);
      if (held !== undefined) {
        keyClaims.current.delete(e.code);
        toggle(held);
        return;
      }
      const free = Array.from({ length: NUMBERS }, (_, i) => i + 1).filter((n) => !claims.has(n));
      if (free.length === 0) return;
      const number = free[randomIndex(free.length)];
      keyClaims.current.set(e.code, number);
      toggle(number);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, claims, toggle]);

  useSettle(players, phase === 'gathering', () => {
    setCalled([]);
    start(playersRef.current);
  });

  // The call: for 'pick one' only the winner is drawn; the other outcomes need
  // every number, called in the order the draw already fixed.
  useEffect(() => {
    if (phase !== 'running' || ranking.length === 0) return;
    const toCall = settings.outcome === 'one' ? ranking.slice(0, 1) : ranking;

    let callIndex = 0;
    let step = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const target = toCall[callIndex];
      if (step >= RUN_LENGTH) {
        // Landed. Lock this number in and move on to the next call.
        setMarquee(null);
        setCalled((prev) => [...prev, target.id]);
        beep(() => playTick(1));
        buzz(hapticHeavy);
        callIndex++;
        step = 0;
        if (callIndex >= toCall.length) {
          finish(ranking.map((p) => ({ ...p, ...cellCentre(p.id) })));
          return;
        }
        timer = setTimeout(tick, 620);
        return;
      }

      // Runs over unclaimed numbers too, so the marquee sweeps the whole board
      // rather than hopping between the players.
      const spot = step === RUN_LENGTH - 1 ? target.id : 1 + randomIndex(NUMBERS);
      setMarquee(spot);
      beep(() => playTick(3));
      buzz(hapticLight);

      const t = step / (RUN_LENGTH - 1);
      step++;
      timer = setTimeout(tick, FIRST_STEP_MS + (LAST_STEP_MS - FIRST_STEP_MS) * t * t);
    };

    tick();
    return () => clearTimeout(timer);
  }, [phase, ranking, settings.outcome, beep, buzz, finish, cellCentre]);

  const done = phase === 'done';
  const shown = done ? frozen : players;
  const owners = new Map(shown.map((t) => [t.id, t]));

  function reset() {
    setClaims(new Map());
    setCalled([]);
    setMarquee(null);
    keyClaims.current.clear();
    clearDraw();
  }

  return (
    <div className="mode-surface keno-surface">
      <div className="keno-board" ref={boardRef}>
        {Array.from({ length: NUMBERS }, (_, i) => i + 1).map((number) => {
          const owner = owners.get(number);
          const reveal =
            done && owner
              ? revealFor(owner, {
                  outcome: settings.outcome,
                  ranking,
                  teamCount: settings.teamCount,
                })
              : {};
          const isCalled = called.includes(number);
          const color = reveal.color ?? (owner ? colorAt(owner.colorIndex) : undefined);
          const className = [
            'keno-cell',
            owner ? 'claimed' : '',
            marquee === number ? 'marquee' : '',
            isCalled ? 'called' : '',
            reveal.dimmed ? 'passed' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={number}
              type="button"
              data-number={number}
              className={className}
              onPointerDown={handleCell}
              style={color ? ({ '--cell-color': color } as React.CSSProperties) : undefined}
              aria-label={owner ? `Number ${number}, taken` : `Take number ${number}`}
              data-no-boop
            >
              <span className="keno-number">{number}</span>
              {reveal.label && <span className="keno-badge">{reveal.label}</span>}
            </button>
          );
        })}
      </div>

      {phase === 'gathering' && (
        <p className="mode-hint" data-no-boop>
          {players.length < MIN_PLAYERS ? 'Everybody tap a number' : 'Hands off — drawing soon'}
        </p>
      )}
      {done && (
        <Result outcome={settings.outcome} ranking={ranking} teamCount={settings.teamCount} onAgain={reset} />
      )}
    </div>
  );
}
