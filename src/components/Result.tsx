import type { Ranking } from '../lib/outcome';
import type { Outcome } from '../lib/outcome';
import { colorAt } from '../lib/colors';
import { TEAM_NAMES, teamsFrom } from '../lib/outcome';

interface ResultProps {
  outcome: Outcome;
  ranking: Ranking;
  teamCount: number;
  onAgain: () => void;
}

/**
 * The end of a round, in whichever shape was asked for. Deliberately neutral
 * wording — "You're up" reads the same whether the pick is a prize or a chore.
 */
export function Result({ outcome, ranking, teamCount, onAgain }: ResultProps) {
  return (
    <div className="mode-result" data-no-boop>
      {outcome === 'one' && ranking[0] && (
        <p className="mode-result-label" style={{ color: colorAt(ranking[0].colorIndex) }}>
          You're up
        </p>
      )}

      {outcome === 'order' && <p className="mode-result-label">Turn order</p>}

      {outcome === 'teams' && (
        <div className="team-legend">
          {teamsFrom(ranking, teamCount).map((team, i) => (
            <span key={TEAM_NAMES[i]} className="team-chip" style={{ color: colorAt(team[0]?.colorIndex ?? 0) }}>
              {TEAM_NAMES[i]} · {team.length}
            </span>
          ))}
        </div>
      )}

      <button className="mode-again" onClick={onAgain}>
        Go again
      </button>
    </div>
  );
}
