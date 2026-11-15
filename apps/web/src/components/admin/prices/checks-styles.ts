import type { CSSProperties } from 'react';

/** The phone's kind label (`06/price-checks-mobile`, `23/checks-resolved-detail-m`). */
export const kindTag: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  flex: 'none',
  height: 18,
  padding: '0 7px',
  borderRadius: 5,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: '0.12em',
  lineHeight: 1,
  textTransform: 'uppercase',
  color: 'var(--accent)',
  border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
};

/** Ticket page (and the sheet's Open show): outline, with its icon. */
export const ticketStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '0 12px',
  borderRadius: 9,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  color: 'var(--fg)',
  background: 'var(--surface-2)',
  border: '1px solid var(--border-strong)',
  textDecoration: 'none',
};

export const smallLabel: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--fg-subtle)',
};
