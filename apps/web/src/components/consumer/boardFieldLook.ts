import type { CSSProperties } from 'react';

// The B+ price-sheet look for form fields (design boards more-p-submit_m,
// more-p-submit_two_m, more-p-submit_d). It is opt-in through a `look="board"`
// prop on ChipGroup, SPNumberField and VendorField, because the counter sheet
// and the dispute form share those components and are drawn separately (U3).

export type FieldLook = 'plain' | 'board';

// Sentence-case Inter question above a chip row, in place of the mono caps
// eyebrow the older sheets use.
export const boardGroupLabelStyle = (error: boolean): CSSProperties => ({
  fontFamily: 'var(--font-ui)',
  fontSize: 15,
  fontWeight: 700,
  color: error ? 'var(--warning)' : 'var(--fg)',
  letterSpacing: '-0.01em',
});

// Chip: 14px semibold Inter, a little taller than the plain chip. An unselected
// chip reads muted; a chip that is taken in another tier card is struck through.
export const boardChipClass = ({
  active,
  disabled,
  invalid,
  struck = false,
}: {
  active: boolean;
  disabled: boolean;
  invalid: boolean;
  struck?: boolean;
}): string =>
  [
    'inline-flex items-center gap-1.5 rounded-full border px-3 py-[7px] text-sm font-semibold transition-colors',
    struck
      ? 'border-border text-fg-subtle line-through cursor-not-allowed opacity-70'
      : disabled
        ? 'border-border text-fg-muted cursor-not-allowed opacity-60'
        : active
          ? 'border-signal text-signal bg-signal/10'
          : invalid
            ? 'border-warning text-fg-muted hover:border-fg-muted'
            : 'border-border-strong text-fg-muted hover:border-fg-muted',
  ].join(' ');
