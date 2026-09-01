/**
 * The prompt shown while a round is gathering players. Touch devices get the
 * finger version; anything else is being played at a desk, where there is only
 * one pointer and holding keys is how you get more than one player.
 */
export function Hint() {
  const touchCapable = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  return (
    <p className="mode-hint" data-no-boop>
      {touchCapable ? 'Everybody put a finger on the screen' : 'Everybody hold down a key'}
    </p>
  );
}
