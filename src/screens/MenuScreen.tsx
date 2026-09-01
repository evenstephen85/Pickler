import type { Mode, ModeId, Settings } from '../types';
import { MODES } from '../data/modes';
import { InfoIcon, SoundOffIcon, SoundOnIcon } from '../components/icons';
import { ModePreview } from '../components/ModePreview';
import { MAX_TEAMS, MIN_TEAMS, OUTCOME_LABELS } from '../lib/outcome';
import type { Outcome } from '../lib/outcome';

interface MenuScreenProps {
  settings: Settings;
  onPick: (id: ModeId) => void;
  onShowRules: () => void;
  onChange: (patch: Partial<Settings>) => void;
}

const OUTCOMES: Outcome[] = ['one', 'order', 'teams'];

export function MenuScreen({ settings, onPick, onShowRules, onChange }: MenuScreenProps) {
  return (
    <div className="screen menu-screen">
      <header className="menu-header">
        <div>
          <h1 className="menu-title">PICKLER</h1>
          <p className="menu-subtitle">by MyCrew</p>
        </div>
        <div className="menu-actions">
          <button
            className="icon-button"
            onClick={() => onChange({ soundEnabled: !settings.soundEnabled })}
            aria-label={settings.soundEnabled ? 'Turn sound off' : 'Turn sound on'}
          >
            {settings.soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
          </button>
          <button className="icon-button" onClick={onShowRules} aria-label="How it works">
            <InfoIcon />
          </button>
        </div>
      </header>

      <div className="segmented" role="group" aria-label="What to pick">
        {OUTCOMES.map((outcome) => (
          <button
            key={outcome}
            className={`segment${settings.outcome === outcome ? ' selected' : ''}`}
            onClick={() => onChange({ outcome })}
            aria-pressed={settings.outcome === outcome}
          >
            {OUTCOME_LABELS[outcome]}
          </button>
        ))}
      </div>

      {settings.outcome === 'teams' && (
        <div className="team-count">
          <span>How many teams?</span>
          <div className="segmented compact">
            {Array.from({ length: MAX_TEAMS - MIN_TEAMS + 1 }, (_, i) => MIN_TEAMS + i).map((n) => (
              <button
                key={n}
                className={`segment${settings.teamCount === n ? ' selected' : ''}`}
                onClick={() => onChange({ teamCount: n })}
                aria-pressed={settings.teamCount === n}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mode-list">
        {MODES.map((mode) => (
          <ModeCard key={mode.id} mode={mode} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}

function ModeCard({ mode, onPick }: { mode: Mode; onPick: (id: ModeId) => void }) {
  return (
    <button className="mode-card" onClick={() => onPick(mode.id)} title={mode.tagline}>
      <ModePreview mode={mode.id} />
      <span className="mode-card-name">{mode.name}</span>
    </button>
  );
}
