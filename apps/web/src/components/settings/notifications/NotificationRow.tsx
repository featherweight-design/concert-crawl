import type { CSSProperties, ReactNode } from 'react';

// The B+ Notifications cards (`more-s-settings_m`, `more-s-d_notifications`):
// one card, one label and one detail style for every switch row in the section.

export const ROW_CARD =
  'flex min-h-[44px] items-center justify-between gap-3 rounded-2xl border border-border bg-surface-1 px-4 py-3.5';
export const ROW_LABEL =
  'text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-fg';
export const ROW_DETAIL = 'text-[13px] leading-snug text-fg-muted';

/**
 * A sub-group label inside the section. `h3`, not `h2`: "Notifications" is the
 * section's own `h2` and labels it via `aria-labelledby`, so a sibling `h2`
 * here would flatten the outline and claim these rows sit beside the section
 * rather than inside it.
 */
export const GroupHeading = ({ text }: { text: string }) => (
  <h3
    className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle"
    style={{ fontFamily: 'var(--font-mono)' }}
  >
    {text}
  </h3>
);

/** The pill-shaped call to action: the signal-to-accent pair with a soft glow. */
export const CTA_CLASS =
  'inline-flex min-h-[44px] w-fit items-center justify-center rounded-xl px-5 py-2.5 text-[15px] font-bold text-fg-on-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:opacity-60';
export const CTA_STYLE: CSSProperties = {
  background: 'linear-gradient(90deg, var(--signal), var(--accent))',
  boxShadow: '0 6px 18px color-mix(in oklch, var(--accent) 28%, transparent)',
};

/** An icon tile for the empty and blocked cards. */
export const IconTile = ({ children }: { children: ReactNode }) => (
  <span
    aria-hidden
    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-strong bg-surface-2 text-signal"
  >
    {children}
  </span>
);
