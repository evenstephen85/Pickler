import type { Mode } from '../types';

export const MODES: Mode[] = [
  {
    id: 'touch-pick',
    name: 'Touch & Pick',
    tagline: 'Everyone holds a finger down. One ring survives.',
    rules: [
      'Everybody puts one finger anywhere on the black screen.',
      'A colored ring appears around each finger.',
      'When nobody new has joined for a moment, the rings pulse out a countdown — hold still.',
      'On the last beat, the pick is revealed.',
      'Lift your fingers to go again.',
    ],
  },
  {
    id: 'twine',
    name: 'Tug of Twine',
    tagline: 'Strings get reeled in. Shortest one wins.',
    rules: [
      'Everybody puts a finger down — a string drops from each one to the bottom of the screen.',
      'Once the field settles, the strings are reeled in.',
      'The string that ends up shortest belongs to the pick.',
      'Where you put your finger makes no difference to the odds — the lengths come from the draw, not from the screen.',
    ],
  },
  {
    id: 'spinner',
    name: 'Spinner',
    tagline: 'A needle sweeps around and stops on someone.',
    rules: [
      'Everybody puts a finger down.',
      'A needle spins out from the middle of the screen and slows like a roulette wheel.',
      'Wherever it stops, that finger is the pick.',
    ],
  },
  {
    id: 'potato',
    name: 'Hot Potato',
    tagline: 'A glow hops around, faster and faster. Then it stops.',
    rules: [
      'Everybody puts a finger down.',
      'A white glow jumps from finger to finger, speeding up as it goes.',
      'Whoever is holding it when it stops is the pick.',
    ],
  },
  {
    id: 'bumper',
    name: 'Bumper Rings',
    tagline: 'Rings come loose, crash, and knock each other out.',
    rules: [
      'Everybody puts a finger down.',
      'The rings come off your fingers and drift around the screen.',
      'When two rings crash, one of them is knocked out.',
      'The last ring left is the pick. You can lift your fingers once the rings are loose.',
    ],
  },
];

export function modeById(id: string): Mode | undefined {
  return MODES.find((m) => m.id === id);
}
