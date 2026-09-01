import { useState } from 'react';
import type { Mode, Settings } from '../types';
import { TouchPick } from '../modes/TouchPick';
import { Straw } from '../modes/Straw';
import { Spinner } from '../modes/Spinner';
import { HotPotato } from '../modes/HotPotato';
import { Bumper } from '../modes/Bumper';
import { Dvd } from '../modes/Dvd';
import { Dice } from '../modes/Dice';
import { Hint } from '../components/Hint';
import { BackIcon, InfoIcon } from '../components/icons';
import { OUTCOME_LABELS } from '../lib/outcome';

interface PlayScreenProps {
  mode: Mode;
  settings: Settings;
  onExit: () => void;
}

const MODE_COMPONENTS = {
  'touch-pick': TouchPick,
  straw: Straw,
  spinner: Spinner,
  potato: HotPotato,
  bumper: Bumper,
  dvd: Dvd,
  dice: Dice,
} as const;

export function PlayScreen({ mode, settings, onExit }: PlayScreenProps) {
  const [showRules, setShowRules] = useState(false);
  const Game = MODE_COMPONENTS[mode.id];

  return (
    <div className="play-screen">
      {/* Floating controls rather than a header band, so the play surface keeps
          the full height of the screen for fingers. */}
      <div className="play-controls">
        <button className="icon-button ghost" onClick={onExit} aria-label="Back to menu">
          <BackIcon />
        </button>
        <span className="play-outcome">{OUTCOME_LABELS[settings.outcome]}</span>
        <button
          className="icon-button ghost"
          onClick={() => setShowRules(true)}
          aria-label={`How ${mode.name} works`}
        >
          <InfoIcon />
        </button>
      </div>

      <Game settings={settings} hint={<Hint />} />

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
