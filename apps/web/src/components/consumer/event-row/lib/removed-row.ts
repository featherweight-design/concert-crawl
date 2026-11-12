import type { CSSProperties } from 'react';

// A No longer listed row, from addendum-3 `02/nll-row-browse-d`:
// background:#11162E (surface-1); border:1.5px dashed #2C3661 (border-strong).
// The class list already draws the dashed style and the surface-1 fill; this
// sets the weight and colour the board gives the edge.
export const REMOVED_CARD_STYLE: CSSProperties = {
  borderWidth: 1.5,
  borderColor: 'var(--border-strong)',
};

// The source line under the chip: JetBrains Mono 9px, 0.08em, caps, fg-muted
// (addendum-3 README: raised to fg-muted for 4.5:1 on both grounds).
export const REMOVED_SOURCE_LINE_STYLE: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  lineHeight: 1.35,
  margin: '6px 0 0',
};
