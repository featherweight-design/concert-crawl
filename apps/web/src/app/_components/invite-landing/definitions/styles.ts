/** The B+ cyan-to-pink sweep, through the violet the two mix to. */
export const INVITE_GRADIENT =
  'linear-gradient(90deg, var(--signal), color-mix(in oklch, var(--signal), var(--accent)), var(--accent))';

/**
 * The Redeem button's fill, as invite-320 draws it: 135deg, cyan to a softened
 * pink. The end stop is no token (the accent is #FF7BD4), so both stops are
 * fixed board colours.
 */
export const REDEEM_GRADIENT = 'linear-gradient(135deg, #7AE6FF, #de96df)'; // fwd-allow-hex: board art colour

/**
 * The invite code field's border: cyan to pink at 135deg, fading to the border
 * colour at the bottom right (invite-320 field).
 */
export const INVITE_FIELD_BORDER =
  'linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border))';

/** The field's soft cyan drop shadow (invite-320 field). */
export const INVITE_FIELD_SHADOW =
  '0 18px 50px color-mix(in srgb, var(--signal) 12%, transparent)';

/**
 * The page's ambient wash (invite-320 root): violet from the top-left, cyan
 * from the bottom-right, over a ground that deepens downward. The ground uses
 * the theme's tokens, so Light keeps its light page as inv-light draws it.
 */
export const INVITE_PAGE_WASH = [
  'radial-gradient(1100px 650px at 0% 0%, rgba(188, 119, 242, 0.15), transparent 65%)', // fwd-allow-hex: board art colour
  'radial-gradient(900px 650px at 100% 100%, color-mix(in srgb, var(--signal) 9%, transparent), transparent 60%)',
  'linear-gradient(180deg, var(--bg-elevated), var(--bg))',
].join(', ');

/** Mono caps for eyebrows, labels and the count line. */
export const MONO_CAPS = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
} as const satisfies React.CSSProperties;

/**
 * The landing pages' keyboard focus ring. `all: 'unset'` on the public
 * landing's CTAs strips the browser's default ring along with everything else,
 * so every interactive element on both landings restores this one. Matches the
 * ring used across the consumer surfaces.
 */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal';
