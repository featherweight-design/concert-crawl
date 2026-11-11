// B+ crews (B14): the two pill buttons every crews surface draws, so the list,
// the crew home, the invite landing and the crew lens cannot drift apart.

/** The B+ cyan-to-pink sweep, through the violet the two mix to. */
export const CREW_GRADIENT =
  'linear-gradient(90deg, var(--signal), color-mix(in oklch, var(--signal), var(--accent)), var(--accent))';

const pillBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  minHeight: 44,
  padding: '0 18px',
  borderRadius: 999,
  fontFamily: 'var(--font-ui)',
  fontSize: 13.5,
  fontWeight: 700,
  letterSpacing: '-0.005em',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

/**
 * The crew row's frame, shared by CrewRow and CrewRowSkeleton so the loading
 * list resolves without a shift.
 */
export const CREW_ROW = {
  minHeight: 72,
  radius: 16,
  patch: 52,
  gap: (wide: boolean) => (wide ? 15 : 13),
  padding: (wide: boolean) =>
    wide ? '14px 18px 14px 15px' : '14px 14px 14px 15px',
} as const;

export const pillPrimary: React.CSSProperties = {
  ...pillBase,
  background: CREW_GRADIENT,
  border: 'none',
  color: 'var(--fg-on-accent)',
  boxShadow:
    '0 6px 18px -8px color-mix(in oklch, var(--signal) 60%, transparent)',
};

export const pillGhost: React.CSSProperties = {
  ...pillBase,
  background: 'transparent',
  border: '1px solid var(--border-strong)',
  color: 'var(--fg)',
};

/**
 * A card whose border runs cyan to pink (the invite landing). The fill is
 * painted on the padding box and the gradient on the border box, so the edge
 * follows the radius without a pseudo-element.
 */
export const gradientEdgeCard: React.CSSProperties = {
  border: '1px solid transparent',
  background:
    'linear-gradient(var(--surface-1), var(--surface-1)) padding-box, linear-gradient(135deg, var(--signal), color-mix(in oklch, var(--accent) 40%, var(--border)) 70%, var(--accent)) border-box',
};
