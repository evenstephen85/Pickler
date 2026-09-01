import type { Mode } from '../types';

export const MODES: Mode[] = [
  {
    id: 'touch-pick',
    name: 'Touch & Pick',
    tagline: 'Rings pulse out a countdown.',
    rules: [
      'Everybody puts one finger anywhere on the screen.',
      'When nobody new has joined for a moment, the rings pulse out a countdown — hold still.',
      'On the last beat, the pick is revealed.',
    ],
  },
  {
    id: 'straw',
    name: 'Short Straw',
    tagline: 'Draw from the bundle. Shortest one loses.',
    rules: [
      'Everybody takes hold of a straw from the bundle in the middle.',
      'The straws are drawn out a tug at a time — it stops and starts, so you cannot call it early.',
      'Whoever ends up holding the short straw is the pick.',
      'In teams, the straws re-tie themselves into one knot per team.',
    ],
  },
  {
    id: 'spinner',
    name: 'Spinner',
    tagline: 'A needle slows and stops on someone.',
    rules: [
      'Everybody puts a finger down.',
      'A needle spins out from the middle and slows like a roulette wheel.',
      'In teams, one needle comes out per member of the smaller team, all in that team’s color.',
    ],
  },
  {
    id: 'potato',
    name: 'Hot Potato',
    tagline: 'A glow flies around, faster and faster.',
    rules: [
      'Everybody puts a finger down.',
      'A glowing potato flies from finger to finger, speeding up as it goes.',
      'Whoever is holding it when it stops is the pick.',
      'In teams, there is one potato per team, each in that team’s color.',
    ],
  },
  {
    id: 'bumper',
    name: 'Bumper Rings',
    tagline: 'Drive your ring. Crash people out.',
    rules: [
      'Your ring stays on your finger — you drive it.',
      'Slide into somebody and you might knock them out. You might just bounce off.',
      'Keep crashing until one ring is left.',
    ],
  },
  {
    id: 'dvd',
    name: 'Corner Bounce',
    tagline: 'Rings drift. First to nail a corner.',
    rules: [
      'Everybody puts a finger down, then lets go — the rings take off on their own.',
      'They bounce around the walls like the old DVD screensaver.',
      'First ring to nail a corner is the pick; after that, second, third and so on.',
    ],
  },
  {
    id: 'dice',
    name: 'Dice Roll',
    tagline: 'A die tumbles out of every finger.',
    rules: [
      'Everybody puts a finger down.',
      'A die tumbles out of each one and settles on a number.',
      'Highest roll goes first, and the rest fall in behind it.',
      'There is never a tie at the top — the places are decided first, then the faces are handed out to match.',
    ],
  },
];

export function modeById(id: string): Mode | undefined {
  return MODES.find((m) => m.id === id);
}
