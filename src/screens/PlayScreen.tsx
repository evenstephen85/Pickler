import { useState } from 'react';
import type { Mode, Settings } from '../types';
import { TouchPick } from '../modes/TouchPick';
import { BackIcon, InfoIcon } from '../components/icons';

interface PlayScreenProps {
  mode: Mode;
  settings: Settings;
  onExit: () => void;
}

export function PlayScreen({ mode, settings, onExit }: PlayScreenProps) {
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="play-screen">
      {/* Floating controls rather than a header band, so the play surface keeps
          the full height of the screen for fingers. */}
      <div className="play-controls">
        <button className="icon-button ghost" onClick={onExit} aria-label="Back to menu">
          <BackIcon />
        </button>
        <button
          className="icon-button ghost"
          onClick={() => setShowRules(true)}
          aria-label={`How ${mode.name} works`}
        >
          <InfoIcon />
        </button>
      </div>

      {mode.id === 'touch-pick' && (
        <TouchPick soundEnabled={settings.soundEnabled} hapticsEnabled={settings.hapticsEnabled} />
      )}

      {showRules && (
        <div className="sheet-backdrop" onClick={() => setShowRules(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2 className="sheet-title">{mode.name}</h2>
            <ol className="rules-list">
              {mode.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
            <button className="primary-button" onClick={() => setShowRules(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
