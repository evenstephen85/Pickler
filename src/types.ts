export type Screen = 'splash' | 'menu' | 'rules' | 'play';

/** One finger on the glass, tracked from pointerdown to pointerup. */
export type Touch = {
  /** PointerEvent.pointerId — stable for the life of the contact. */
  id: number;
  x: number;
  y: number;
  /** Index into PLAYER_COLORS; assigned on touch-down and never reused while held. */
  colorIndex: number;
  /** When the finger went down, for ordering and "who was first" tie-breaks. */
  downAt: number;
  /** The key a desktop player is holding, drawn inside their ring. */
  label?: string;
  /**
   * The finger is off the glass but the player is still in the round — either
   * inside the grace window while gathering, or because the round has started
   * and a lift no longer drops anybody. The position stops updating, so the
   * ring simply stays where the finger last was.
   */
  released?: boolean;
};

export type ModeId = 'touch-pick' | 'straw' | 'bumper' | 'spinner' | 'potato' | 'dvd' | 'dice' | 'keno';

export type Mode = {
  id: ModeId;
  name: string;
  tagline: string;
  /** Shown on the rules screen and from the in-game info button. */
  rules: string[];
};

export type Settings = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  /** What a round hands back: one pick, a full turn order, or teams. */
  outcome: 'one' | 'order' | 'teams';
  /** How many teams to split into when outcome is 'teams'. */
  teamCount: number;
  /** Set once the player has seen the rules screen on first launch. */
  onboarded: boolean;
};
