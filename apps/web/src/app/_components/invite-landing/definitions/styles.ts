/** The B+ cyan-to-pink sweep, through the violet the two mix to. */
export const INVITE_GRADIENT =
  'linear-gradient(90deg, var(--signal), color-mix(in oklch, var(--signal), var(--accent)), var(--accent))';

/** Mono caps for eyebrows, labels and the count line. */
export const MONO_CAPS = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
} as const satisfies React.CSSProperties;
