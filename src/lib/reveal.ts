import type { Touch } from '../types';
import type { Outcome, Ranking } from './outcome';
import { colorAt } from './colors';
import { teamsFrom } from './outcome';

type RevealInput = {
  outcome: Outcome;
  ranking: Ranking;
  teamCount: number;
};

export type RingReveal = {
  color?: string;
  label?: string;
  dimmed?: boolean;
  won?: boolean;
};

/**
 * How a ring should look once the result is in — the one place that turns a
 * ranking into what the player actually sees, so every game reveals a 'pick
 * one' or a 'split teams' the same way.
 */
export function revealFor(touch: Touch, { outcome, ranking, teamCount }: RevealInput): RingReveal {
  const rank = ranking.findIndex((t) => t.id === touch.id);
  if (rank === -1) return {};

  if (outcome === 'order') {
    return { label: String(rank + 1), won: rank === 0 };
  }

  if (outcome === 'teams') {
    const teams = teamsFrom(ranking, teamCount);
    const teamIndex = rank % teamCount;
    return {
      color: colorAt(teams[teamIndex][0].colorIndex),
      label: String(teamIndex + 1),
    };
  }

  // 'one' — the pick keeps its ring, everybody else's is taken away. Returning
  // `dimmed` rather than dropping them from the list lets a game fade them out.
  return rank === 0 ? { won: true } : { dimmed: true };
}

/** For 'pick one', the losing rings are removed outright rather than faded. */
export function visibleAfterPick(touches: Touch[], outcome: Outcome, ranking: Ranking): Touch[] {
  if (outcome !== 'one' || ranking.length === 0) return touches;
  return touches.filter((t) => t.id === ranking[0].id);
}
