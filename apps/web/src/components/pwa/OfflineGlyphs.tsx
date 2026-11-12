// The two tiles that head the offline page (B+ `bp-s-offline_m`,
// `bp-s-offline_empty_m`): a warm rounded square with a soft glow. Decorative,
// so aria-hidden: the eyebrow and heading say what happened.

const TILE_STYLE = {
  width: 84,
  height: 84,
  borderRadius: 22,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--warning)',
  border: '1px solid color-mix(in oklch, var(--warning) 45%, transparent)',
  background: 'color-mix(in oklch, var(--warning) 10%, var(--surface-1))',
  boxShadow: '0 0 48px color-mix(in oklch, var(--warning) 18%, transparent)',
} as const;

/** A struck-through signal: there is a cache, but no network. */
export const NoSignalTile = () => (
  <span aria-hidden="true" style={TILE_STYLE}>
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <path
        d="M6 15c9-8 23-8 32 0"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.35"
        data-testid="signal-arc-outer"
      />
      <path
        d="M12 21.5c6-5 14-5 20 0"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.65"
        data-testid="signal-arc-middle"
      />
      <path
        d="M17.5 27c3-2.5 6-2.5 9 0"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        data-testid="signal-arc-inner"
      />
      <circle cx="22" cy="33" r="2.6" fill="currentColor" />
      <path
        d="M8 7l28 30"
        stroke="var(--danger)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  </span>
);

/**
 * A tile with a lone dot: nothing saved yet. Same build as the error mark's
 * dark core (halo, solid ring, dark core), drawn in the tile's own 84px space
 * so it sits upper right of the centre.
 */
export const NothingCachedTile = () => (
  <span aria-hidden="true" style={TILE_STYLE}>
    <svg width="84" height="84" viewBox="0 0 84 84" fill="none">
      <circle
        data-testid="core-halo"
        cx="56"
        cy="27.5"
        r="11.5"
        fill="var(--warning)"
        opacity="0.22"
      />
      <circle
        data-testid="core-ring"
        cx="56"
        cy="27.5"
        r="6.9"
        fill="var(--warning)"
        opacity="0.42"
      />
      <circle
        data-testid="core-dot"
        cx="56"
        cy="27.5"
        r="4"
        fill="var(--border)"
      />
    </svg>
  </span>
);
