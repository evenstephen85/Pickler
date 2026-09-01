import type { Mode, ModeId, Settings } from '../types';
import { MODES } from '../data/modes';
import { InfoIcon, SoundOffIcon, SoundOnIcon } from '../components/icons';

interface MenuScreenProps {
  settings: Settings;
  onPick: (id: ModeId) => void;
  onShowRules: () => void;
  onToggleSound: () => void;
}

export function MenuScreen({ settings, onPick, onShowRules, onToggleSound }: MenuScreenProps) {
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
            onClick={onToggleSound}
            aria-label={settings.soundEnabled ? 'Turn sound off' : 'Turn sound on'}
          >
            {settings.soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
          </button>
          <button className="icon-button" onClick={onShowRules} aria-label="How it works">
            <InfoIcon />
          </button>
        </div>
      </header>

      <p className="menu-lead">Pick a way to pick.</p>

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
    <button className="mode-card" onClick={() => onPick(mode.id)}>
      <span className="mode-card-name">{mode.name}</span>
      <span className="mode-card-tagline">{mode.tagline}</span>
    </button>
  );
}
