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
        d="M6 17c9-8 23-8 32 0M12 24c6-5 14-5 20 0"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="22" cy="31" r="3" fill="currentColor" />
      <path
        d="M8 7l28 30"
        stroke="var(--danger)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  </span>
);

/** A tile with a lone dot: nothing saved yet. */
export const NothingCachedTile = () => (
  <span aria-hidden="true" style={TILE_STYLE}>
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <circle
        cx="27"
        cy="15"
        r="7"
        fill="color-mix(in oklch, var(--warning) 45%, transparent)"
      />
      <circle cx="27" cy="15" r="3.4" fill="var(--bg)" />
    </svg>
  </span>
);
