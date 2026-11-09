'use client';

import { useEffect, useRef } from 'react';
import type { FilterOption } from './filter-defs';

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

interface FilterPopoverProps {
  open: boolean;
  title: string;
  placeholder: string;
  options: FilterOption[];
  value: string;
  anchorRect: DOMRect | null;
  alwaysOn?: boolean;
  onSelect: (nextValue: string) => void;
  onClose: () => void;
}

export function FilterPopover({
  open,
  title,
  placeholder,
  options,
  value,
  anchorRect,
  alwaysOn = false,
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

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={`${title} filter`}
      className="fixed z-50 hidden min-w-[240px] overflow-y-auto overscroll-contain border border-border-strong bg-bg-elevated sm:block"
      style={{
        ...placement,
        left: anchorRect.left,
        borderRadius: 10,
        padding: 6,
        boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
      }}
    >
      {!alwaysOn && (
        <OptionButton
          label={placeholder}
          active={!value}
          onClick={() => {
            onSelect('');
            onClose();
          }}
        />
      )}

      {options.map((option) => (
        <OptionButton
          key={option.value}
          label={option.label}
          active={value === option.value}
          onClick={() => {
            onSelect(option.value);
            onClose();
          }}
        />
      ))}
    </div>
  );
}

interface OptionButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function OptionButton({ label, active, onClick }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between text-left text-[13px]"
      style={{
        padding: '8px 10px',
        borderRadius: 6,
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
      <span>{label}</span>
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
