import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

/**
 * Plays on every launch and takes no tap — the timers carry it through. It
 * makes no sound: audio is still locked this early (nothing has been touched
 * yet), so a sound here would be silently dropped anyway.
 */
export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase('hold'), 450);
    const outTimer = setTimeout(() => setPhase('out'), 1900);
    const finishTimer = setTimeout(onFinish, 2400);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(outTimer);
      clearTimeout(finishTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`splash splash-${phase}`}>
      <div className="splash-rings" aria-hidden="true">
        <span style={{ '--i': 0 } as React.CSSProperties} />
        <span style={{ '--i': 1 } as React.CSSProperties} />
        <span style={{ '--i': 2 } as React.CSSProperties} />
      </div>
      <div className="splash-title">PICKLER</div>
      <div className="splash-subtitle">by MyCrew</div>
    </div>
  );
}
