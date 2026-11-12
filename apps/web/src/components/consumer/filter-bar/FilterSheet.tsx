'use client';

import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalDialog } from '@/lib/hooks/useModalDialog';
import { useOnPhone, useSheetDrag } from '@/lib/hooks/useSheetDrag';
import type { FilterOption } from './filter-defs';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { CheckboxMark } from './CheckboxMark';

const copy = CONSUMER_COPY.filterBar;

interface FilterSheetProps {
  open: boolean;
  title: string;
  placeholder: string;
  options: FilterOption[];
  value: string;
  alwaysOn?: boolean;
  /**
   * Multi-select (Where and Vibe, addendum 2 item 6). Each option row becomes
   * a checkbox that toggles its value and leaves the sheet open; the
   * placeholder row still clears the dimension and closes. The B+ phone sheet
   * that replaces this one is B6b.
   */
  multi?:
    | { selected: readonly string[]; onToggle: (value: string) => void }
    | undefined;
  onSelect: (nextValue: string) => void;
  onClose: () => void;
}

export function FilterSheet({
  open,
  title,
  placeholder,
  options,
  value,
  alwaysOn = false,
  multi,
  onSelect,
  onClose,
}: FilterSheetProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const onPhone = useOnPhone();
  // Tab trap, Escape and focus return only while the sheet is actually showing:
  // the venue filter bar keeps it mounted but hidden (`sm:hidden`) at desktop
  // width while the popover is open, and a trap on a hidden dialog would block
  // Tab on the page.
  useModalDialog(dialogRef, open && onPhone, onClose);
  const drag = useSheetDrag(onClose, open);

  // Never rendered by the server (it only opens after a tap), so `document` is
  // always there once this gets past the early return.
  if (!open) return null;

  // Portalled to the body, as ModalShell is: the chip strip lives beside the
  // venue and event cards inside scrolling, positioned ancestors, and a sheet
  // rendered in place can end up in their stacking context, with the cards'
  // whole-card links answering taps meant for the sheet. z-[90] is the shared
  // dialog band, above the persistent chrome.
  return createPortal(
    <div className="fixed inset-0 z-[90] sm:hidden">
      <button
        type="button"
        className="absolute inset-0"
        style={{ background: 'var(--scrim)' }}
        aria-label={copy.filterSheet.closeAriaLabel}
        onClick={onClose}
      />

      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} filter`}
        className="sheet-edge absolute [--sheet-bg:var(--bg-elevated)] bottom-0 left-1/2 -translate-x-1/2 w-full rounded-t-[20px]"
        style={{
          maxWidth: 402,
          paddingTop: 8,
          paddingBottom: 28,
          boxShadow: '0 -20px 60px rgba(0,0,0,0.4)',
          ...drag.sheetStyle,
        }}
        onTransitionEnd={drag.onSheetTransitionEnd}
      >
        {/* The handle and the title are the drag-down grab zone. */}
        <div
          {...drag.zoneProps}
          className="flex justify-center"
          style={{ ...drag.zoneProps.style, padding: '8px 0 4px' }}
        >
          <div className="h-1 w-9 rounded-full bg-border-strong" />
        </div>

        <div
          {...drag.zoneProps}
          style={{
            ...drag.zoneProps.style,
            padding: '10px 20px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
          }}
        >
          {title}
        </div>

        <div className="max-h-[52vh] overflow-y-auto">
          {!alwaysOn && (
            <OptionButton
              label={placeholder}
              active={multi ? multi.selected.length === 0 : !value}
              onClick={() => {
                onSelect('');
                onClose();
              }}
            />
          )}
          {options.map((option) =>
            multi ? (
              <OptionButton
                key={option.value}
                label={option.label}
                active={multi.selected.includes(option.value)}
                checkbox
                onClick={() => multi.onToggle(option.value)}
              />
            ) : (
              <OptionButton
                key={option.value}
                label={option.label}
                active={value === option.value}
                onClick={() => {
                  onSelect(option.value);
                  onClose();
                }}
              />
            ),
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}

interface OptionButtonProps {
  label: string;
  active: boolean;
  /** A multi-select row: checkbox semantics and the drawn checkbox. */
  checkbox?: boolean;
  onClick: () => void;
}

function OptionButton({
  label,
  active,
  checkbox = false,
  onClick,
}: OptionButtonProps) {
  return (
    <button
      type="button"
      role={checkbox ? 'checkbox' : undefined}
      aria-checked={checkbox ? active : undefined}
      onClick={onClick}
      className="flex w-full items-center justify-between text-left"
      style={{
        padding: '13px 20px',
        fontSize: 16,
        color: active ? 'var(--fg)' : 'var(--fg-muted)',
        fontWeight: active ? 700 : 500,
        background: active ? 'var(--surface-1)' : 'transparent',
      }}
    >
      <span>{label}</span>
      {checkbox ? (
        <CheckboxMark checked={active} />
      ) : active ? (
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
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
