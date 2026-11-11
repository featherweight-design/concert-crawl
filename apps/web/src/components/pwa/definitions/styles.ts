/** The B+ blue-to-pink sweep, the same pair as a sheet's top edge. */
export const PWA_GRADIENT =
  'linear-gradient(90deg, var(--signal), var(--accent))';

/** A control edged in the sweep: fill on the padding box, sweep on the border. */
export const gradientEdge = (fill: string) =>
  `linear-gradient(${fill}, ${fill}) padding-box, ${PWA_GRADIENT} border-box`;

/** Mono caps for the sheets' eyebrows. */
export const EYEBROW_STYLE = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
} as const satisfies React.CSSProperties;

/** The full-width primary button the B+ sheets close on. */
export const SHEET_PRIMARY_CLASS =
  'inline-flex min-h-[48px] w-full items-center justify-center rounded-xl px-4 text-[15px] font-extrabold text-fg-on-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1';
