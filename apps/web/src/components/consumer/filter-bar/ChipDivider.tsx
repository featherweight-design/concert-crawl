// The hairline between two segments of the desktop filter bar (B+ B6a). Each
// scope segment renders its OWN trailing rule rather than the bar placing
// them, so a segment that returns null while its entitlement resolves can
// never leave an orphaned rule behind: the My artists segment owns the rule
// after it.
export const SegmentDivider = () => (
  <span
    aria-hidden
    className="my-3 w-px shrink-0 self-stretch"
    style={{ background: 'var(--border)' }}
  />
);
