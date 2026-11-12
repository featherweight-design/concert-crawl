import type { CSSProperties } from 'react';

/** The board's gradient outline: signal into accent, fading to the border. */
export const gradientBorder = (fill: string): CSSProperties => ({
  border: '1px solid transparent',
  background: `linear-gradient(${fill}, ${fill}) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box`,
});

/** The cyan-tint primary ("Use selected", "Pick"). */
export const TINT_BUTTON: CSSProperties = {
  background: 'color-mix(in oklab, var(--signal) 12%, transparent)',
  color: 'var(--signal)',
  border: '1px solid color-mix(in oklab, var(--signal) 30%, transparent)',
  fontWeight: 600,
  borderRadius: 9,
};

/** The phone's secondary ("Search"). */
export const SECONDARY_BUTTON: CSSProperties = {
  background: 'var(--surface-2)',
  color: 'var(--fg)',
  border: '1px solid var(--border-strong)',
  fontWeight: 600,
  borderRadius: 9,
};

/** A desktop row button: 30px, 12.5px. */
export const ROW_BUTTON: CSSProperties = {
  height: 30,
  padding: '0 12px',
  fontSize: 12.5,
  fontWeight: 600,
  borderRadius: 9,
};

/** A phone row button: 36px, 13px, sharing the row. */
export const PHONE_BUTTON: CSSProperties = {
  flex: 1,
  height: 36,
  fontSize: 13,
};

/** Reads as unavailable until the search lands (4c C). */
export const PENDING: CSSProperties = { opacity: 0.55, cursor: 'not-allowed' };

/** A photo the API doesn't have yet: the board's plain tile. */
export const PHOTO_PLACEHOLDER =
  'linear-gradient(135deg, var(--border), color-mix(in oklab, var(--accent) 45%, transparent))';

export const ELLIPSIS: CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
