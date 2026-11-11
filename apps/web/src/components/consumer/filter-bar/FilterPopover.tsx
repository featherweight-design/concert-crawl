'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import type { FilterOption } from './filter-defs';

const copy = CONSUMER_COPY.filterBar.popover;

const ANCHOR_GAP = 6;
const VIEWPORT_MARGIN = 16;
const MIN_ROOM_BELOW = 240;

export type PopoverPlacement =
  { top: number; maxHeight: number } | { bottom: number; maxHeight: number };

/**
 * Opens the menu below its chip, its height capped to the room between the
 * chip and the viewport's bottom margin. It flips above the chip, capped to
 * the room above, only when the room below is under MIN_ROOM_BELOW and the
 * room above is larger.
 */
export const getPopoverPlacement = (
  anchorRect: Pick<DOMRect, 'top' | 'bottom'>,
  viewportHeight: number,
): PopoverPlacement => {
  const roomBelow = Math.max(
    0,
    viewportHeight - anchorRect.bottom - ANCHOR_GAP - VIEWPORT_MARGIN,
  );
  const roomAbove = Math.max(0, anchorRect.top - ANCHOR_GAP - VIEWPORT_MARGIN);
  if (roomBelow < MIN_ROOM_BELOW && roomAbove > roomBelow) {
    return {
      bottom: viewportHeight - anchorRect.top + ANCHOR_GAP,
      maxHeight: roomAbove,
    };
  }
  return { top: anchorRect.bottom + ANCHOR_GAP, maxHeight: roomBelow };
};

/**
 * The popover's left edge: under its anchor, pulled back inside the viewport
 * margin when a wide popover (the two-column Where list) would overrun it.
 */
export const getPopoverLeft = (
  anchorLeft: number,
  width: number,
  viewportWidth: number,
): number => {
  const maxLeft = viewportWidth - width - VIEWPORT_MARGIN;
  return Math.max(VIEWPORT_MARGIN, Math.min(anchorLeft, maxLeft));
};

interface FilterPopoverProps {
  open: boolean;
  title: string;
  options: FilterOption[];
  value: string;
  anchorRect: DOMRect | null;
  alwaysOn?: boolean;
  /** One line under the title. */
  sub?: string | undefined;
  /** A fixed width, kept inside the viewport. Omitted, the menu sizes to fit. */
  width?: number;
  /** A leading mark per option row, such as a genre's dot. */
  renderLeading?: ((option: FilterOption) => ReactNode) | undefined;
  /** Replaces the option list, for a body that is not a plain list. */
  children?: ReactNode | undefined;
  onSelect: (nextValue: string) => void;
  onClose: () => void;
}

export function FilterPopover({
  open,
  title,
  options,
  value,
  anchorRect,
  alwaysOn = false,
  sub,
  width,
  renderLeading,
  children,
  onSelect,
  onClose,
}: FilterPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (popoverRef.current?.contains(target)) return;
      onClose();
    };

    // The menu is fixed where the chip was when it opened, so any scroll that
    // moves the chip (the page, or the chip strip scrolling sideways) or a
    // resize would leave it floating. Closing is simpler than following the
    // chip. Scroll events do not bubble, so the listener captures, and it
    // ignores the menu's own list scrolling. A resize that only changes the
    // height (a soft keyboard or browser toolbar) keeps the menu open.
    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && popoverRef.current?.contains(target)) {
        return;
      }
      onClose();
    };
    const openWidth = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth !== openWidth) onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onResize);
    };
  }, [open, onClose]);

  if (!open || !anchorRect) return null;

  const placement = getPopoverPlacement(anchorRect, window.innerHeight);
  const fittedWidth =
    width === undefined
      ? undefined
      : Math.min(width, window.innerWidth - VIEWPORT_MARGIN * 2);
  const left =
    fittedWidth === undefined
      ? anchorRect.left
      : getPopoverLeft(anchorRect.left, fittedWidth, window.innerWidth);

  // The single-select rows apply and close at once, as the sheet does; the
  // header's Clear is the way back to the resting value.
  const pick = (nextValue: string) => {
    onSelect(nextValue);
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={`${title} filter`}
      className="sheet-edge fixed z-50 hidden min-w-[240px] flex-col overscroll-contain [--sheet-bg:var(--bg-elevated)] sm:flex"
      style={{
        ...placement,
        left,
        width: fittedWidth,
        borderRadius: 14,
        boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
      }}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '-0.01em',
              color: 'var(--fg)',
            }}
          >
            {title}
          </span>
          {sub && (
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 12.5,
                color: 'var(--fg-muted)',
              }}
            >
              {sub}
            </span>
          )}
        </div>
        {!alwaysOn && (
          <button
            type="button"
            onClick={() => pick('')}
            className="shrink-0 cursor-pointer rounded-md px-1 text-[12.5px] font-semibold text-fg-muted transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {copy.clear}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
        {children ??
          options.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              leading={renderLeading?.(option)}
              active={value === option.value}
              onClick={() => pick(option.value)}
            />
          ))}
      </div>
    </div>
  );
}

interface OptionButtonProps {
  label: string;
  active: boolean;
  leading?: ReactNode;
  onClick: () => void;
}

export function OptionButton({
  label,
  active,
  leading,
  onClick,
}: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex w-full cursor-pointer items-center gap-2.5 text-left text-[13.5px]"
      style={{
        padding: '9px 10px',
        borderRadius: 8,
        color: active ? 'var(--fg)' : 'var(--fg-muted)',
        fontWeight: active ? 700 : 500,
        background: active ? 'var(--surface-2)' : 'transparent',
      }}
      onMouseEnter={(event) => {
        if (active) return;
        event.currentTarget.style.background = 'var(--overlay-hover)';
      }}
      onMouseLeave={(event) => {
        if (active) return;
        event.currentTarget.style.background = 'transparent';
      }}
    >
      {leading}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {active ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M2 6.5l2.5 2.5L10 3.5"
            stroke="var(--signal)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}
