import type { ReactNode } from 'react';
import type { Settings } from '../types';

export type ModeProps = {
  settings: Settings;
  /** The shared "put a finger down" prompt, rendered while gathering players. */
  hint: ReactNode;
};
