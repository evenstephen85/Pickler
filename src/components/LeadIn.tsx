/** The big 3-2-1-GO over a play surface. `beat` of 0 means GO. */
export function LeadIn({ beat, note }: { beat: number | null; note?: string }) {
  if (beat === null) return null;
  return (
    <div className="lead-in" data-no-boop>
      <span key={beat} className="lead-in-beat">
        {beat === 0 ? 'GO' : beat}
      </span>
      {note && <span className="lead-in-note">{note}</span>}
    </div>
  );
}
