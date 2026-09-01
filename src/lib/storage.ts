import type { Settings } from '../types';

const KEYS = {
  settings: 'pickler.settings.v1',
} as const;

export const defaultSettings: Settings = {
  soundEnabled: true,
  hapticsEnabled: true,
  onboarded: false,
};

function read<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode, quota) — the app still works, it just
    // won't remember the settings or that the rules have been seen.
  }
}

export function loadSettings(): Settings {
  return read<Settings>(KEYS.settings, defaultSettings);
}

export function saveSettings(settings: Settings) {
  write(KEYS.settings, settings);
}
