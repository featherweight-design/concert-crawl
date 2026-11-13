'use client';

// The phone filter row (B+ B6b, `bp-f-filt_m_rest`, `bp-f-filt_m_active`,
// `browse-active-320.html`): one Filters pill with a count of what is on, and
// under it a removable chip per active filter.

import type { ReactNode, Ref } from 'react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { IconSliders, PHONE_PILL_CLASS, phonePillStyle } from './chrome';

const copy = CONSUMER_COPY.filterBar;

interface FiltersButtonProps {
  /** Active filters, the crew lens included; 0 draws the pill at rest. */
  count: number;
  open: boolean;
  onOpen: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
}

export const FiltersButton = ({
  count,
  open,
  onOpen,
  buttonRef,
}: FiltersButtonProps) => (
  <button
    ref={buttonRef}
    type="button"
    onClick={onOpen}
    aria-haspopup="dialog"
    aria-expanded={open}
    aria-label={copy.phone.filtersAria(count)}
    data-testid="filters-button"
    className={`${PHONE_PILL_CLASS} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal`}
    style={phonePillStyle(count > 0, 'filters')}
  >
    <IconSliders />
    {copy.phone.filters}
    {count > 0 && (
      <span
        aria-hidden
        data-testid="filters-count"
        className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[11px] font-extrabold"
        style={{ background: 'var(--signal)', color: 'var(--fg-on-accent)' }}
      >
        {count}
      </span>
    )}
  </button>
);

export interface PhoneChip {
  key: string;
  label: string;
  /** A crew patch, venue tiles or genre dots, as the bar's segments draw. */
  leading: ReactNode;
  onRemove: () => void;
}

const IconRemove = () => (
  <svg width="9" height="9" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M4 4l8 8M12 4l-8 8"
      stroke="var(--fg-muted)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * The active filters, each a chip that removes itself: 30px, the `s2` fill
 * and a `border-strong` edge, 12.5px bold, a 16px mark and a 9px ✕. The row
 * scrolls sideways and runs to the screen's edge, as the board crops it.
 */
export const PhoneFilterChips = ({ chips }: { chips: PhoneChip[] }) => (
  <div
    data-testid="phone-filter-chips"
    className="-mr-4 flex gap-1.5 overflow-x-auto pr-4 scrollbar-none"
  >
    {chips.map((chip) => (
      <button
        key={chip.key}
        type="button"
        onClick={chip.onRemove}
        aria-label={copy.segment.clearAria(chip.label)}
        className="inline-flex h-[30px] shrink-0 cursor-pointer items-center gap-[7px] rounded-full border border-border-strong bg-surface-2 px-2.5 text-[12.5px] font-bold whitespace-nowrap text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        {chip.leading}
        <span className="max-w-[160px] truncate">{chip.label}</span>
        <IconRemove />
      </button>
    ))}
  </div>
);
