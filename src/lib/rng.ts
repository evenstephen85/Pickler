/**
 * Uniform random integer in [0, n). Math.random() alone is fine for a party
 * game, but every draw in this app goes through here so the fairness rules
 * live in one place and can be tested.
 */
export function randomIndex(n: number): number {
  return Math.floor(Math.random() * n);
}

export function pickOne<T>(items: readonly T[]): T {
  return items[randomIndex(items.length)];
}

/** Fisher-Yates, returning a new array. */
export function shuffled<T>(items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
