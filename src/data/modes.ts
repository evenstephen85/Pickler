import type { Mode } from '../types';

export const MODES: Mode[] = [
  {
    id: 'touch-pick',
    name: 'Touch & Pick',
    tagline: 'Everyone holds a finger down. One ring survives.',
    rules: [
      'Everybody puts one finger anywhere on the black screen.',
      'A colored ring appears around each finger.',
      'When nobody new has joined for a moment, the rings start to pulse — hold still.',
      'On the last beat every ring but one disappears. That finger is the pick.',
      'Lift your fingers to go again.',
    ],
  },
];

export function modeById(id: string): Mode | undefined {
  return MODES.find((m) => m.id === id);
}
