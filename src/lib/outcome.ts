import type { Touch } from '../types';

/** What a round hands back once the picking animation is done. */
export type Outcome = 'one' | 'order' | 'teams';

export const OUTCOME_LABELS: Record<Outcome, string> = {
  one: 'Pick one',
  order: 'Turn order',
  teams: 'Split teams',
};

export const TEAM_NAMES = ['Team 1', 'Team 2', 'Team 3', 'Team 4'] as const;
export const MIN_TEAMS = 2;
export const MAX_TEAMS = 4;

/**
 * Every game produces the same thing: a ranking, most-picked first. What the
 * player asked for is then read off that one list — the winner is rank 0, the
 * turn order is the whole list, and teams are dealt from it. Keeping the games
 * to one job means a new game never has to reimplement any of this.
 */
export type Ranking = Touch[];

/**
 * Deals a ranking round-robin into teams. The ranking is already random, so
 * dealing in order keeps the team sizes as even as they can be without
 * introducing a second draw.
 */
export function teamsFrom(ranking: Ranking, teamCount: number): Touch[][] {
  const teams: Touch[][] = Array.from({ length: teamCount }, () => []);
  ranking.forEach((touch, i) => teams[i % teamCount].push(touch));
  return teams;
}

/** Which team a player landed in, by their position in the ranking. */
export function teamIndexOf(ranking: Ranking, id: number, teamCount: number): number {
  return ranking.findIndex((t) => t.id === id) % teamCount;
}

/** Team colors are taken from the first player dealt into each team. */
export function teamColorIndex(ranking: Ranking, teamIndex: number): number {
  return ranking[teamIndex]?.colorIndex ?? 0;
}
