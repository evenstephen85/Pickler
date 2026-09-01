interface RulesScreenProps {
  onDone: () => void;
}

/**
 * The one-time "how this works" pass, shown before the menu on a first visit
 * and reachable afterwards from the info button on the menu.
 */
export function RulesScreen({ onDone }: RulesScreenProps) {
  return (
    <div className="screen rules-screen">
      <h1 className="rules-title">How Pickler works</h1>

      <div className="rules-body">
        <p>
          Somebody has to go first. Somebody has to say the prayer, take out the
          trash, or pick the restaurant. Pickler decides, and nobody gets to
          argue with a phone.
        </p>
        <ol className="rules-list">
          <li>Put the phone flat where everyone can reach it.</li>
          <li>Pick a game from the menu.</li>
          <li>Everybody gets a finger on the screen.</li>
          <li>Hold still and let it choose.</li>
        </ol>
        <p>
          No touchscreen? On a computer everybody holds down their own key
          instead — one key each, held down, exactly like a finger.
        </p>
        <p className="rules-note">
          Every game is fair — every finger has exactly the same chance, every
          time. The result stays up until you tap “Go again”, so you can lift
          your hands and still read it.
        </p>
        <p className="rules-note">
          On an iPhone, the Ring/Silent switch mutes the sounds even with the
          volume up — that’s Safari, not the app.
        </p>
      </div>

      <button className="primary-button" onClick={onDone}>
        Got it
      </button>
    </div>
  );
}
