import { useEffect, useRef, useState } from 'react';
import type { ModeId, Screen, Settings } from './types';
import { loadSettings, saveSettings } from './lib/storage';
import { modeById } from './data/modes';
import { playBoop, unlockAudio } from './lib/sound';
import { hideNativeStatusBar } from './lib/nativeChrome';
import { SplashScreen } from './screens/SplashScreen';
import { RulesScreen } from './screens/RulesScreen';
import { MenuScreen } from './screens/MenuScreen';
import { PlayScreen } from './screens/PlayScreen';

function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [screen, setScreen] = useState<Screen>('splash');
  const [modeId, setModeId] = useState<ModeId | null>(null);

  useEffect(() => {
    hideNativeStatusBar();
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // The browser keeps the AudioContext suspended (clock frozen) until a user
  // gesture, and anything scheduled against that frozen clock is discarded — so
  // audio is unlocked on the very first pointerdown rather than lazily when a
  // sound is wanted. Capture phase, so it fires even for handlers that stop
  // propagation.
  const unlockedRef = useRef(false);
  useEffect(() => {
    const onPointerDown = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      unlockAudio();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => window.removeEventListener('pointerdown', onPointerDown, true);
  }, []);

  // The UI boop rides on click, not pointerdown: pressing a button and dragging
  // to scroll never becomes a click, so it no longer boops at a scroll. Play
  // surfaces opt out with data-no-boop — they make their own sounds.
  const soundEnabled = settings.soundEnabled;
  useEffect(() => {
    if (!soundEnabled) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const control = target?.closest?.('button, input, [role="button"]');
      if (!control || control.matches('[data-no-boop], [data-no-boop] *')) return;
      if (control instanceof HTMLButtonElement && control.disabled) return;
      playBoop();
    };
    window.addEventListener('click', onClick, true);
    return () => window.removeEventListener('click', onClick, true);
  }, [soundEnabled]);

  function handleSplashFinish() {
    // A first-time player meets the rules before the menu; everyone else goes
    // straight to picking a game.
    setScreen(settings.onboarded ? 'menu' : 'rules');
  }

  function handleRulesDone() {
    setSettings((prev) => ({ ...prev, onboarded: true }));
    setScreen('menu');
  }

  function handlePickMode(id: ModeId) {
    setModeId(id);
    setScreen('play');
  }

  const mode = modeId ? modeById(modeId) : undefined;

  return (
    <div className="app-shell">
      {screen === 'splash' && <SplashScreen onFinish={handleSplashFinish} />}
      {screen === 'rules' && <RulesScreen onDone={handleRulesDone} />}
      {screen === 'menu' && (
        <MenuScreen
          settings={settings}
          onPick={handlePickMode}
          onShowRules={() => setScreen('rules')}
          onChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
        />
      )}
      {screen === 'play' && mode && (
        <PlayScreen mode={mode} settings={settings} onExit={() => setScreen('menu')} />
      )}
    </div>
  );
}

export default App;
