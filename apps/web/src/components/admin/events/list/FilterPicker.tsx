'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Check, Search } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminSheet, useIsPhone } from '@/components/admin/primitives';
import { showCount } from './events-rules';

const COPY = ADMIN_COPY.eventsList;

/**
 * A pill on `06/events`; `on` draws the board's selected Upcoming edge, which
 * a chosen filter reuses.
 */
export const chipStyle = (on: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  flex: 'none',
  height: 36,
  padding: '0 14px',
  borderRadius: 999,
  fontSize: 13.5,
  fontWeight: on ? 700 : 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  color: on ? 'var(--fg)' : 'var(--fg-muted)',
  ...(on
    ? {
        border: '1px solid transparent',
        background:
          'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(90deg, var(--signal), var(--accent)) border-box',
      }
    : {
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
      }),
});

/** The count after No price and Hidden (`06/events`). */
export const ChipCount = ({ count }: { count: number }) => (
  <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>
    {count.toLocaleString('en-US')}
  </span>
);

export interface PickerOption {
  key: string;
  label: string;
  count: number;
  icon?: ReactNode;
}

const footButton = (primary: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  height: 28,
  padding: '0 12px',
  borderRadius: 9,
  fontSize: 12.5,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  ...(primary
    ? {
        color: 'var(--signal)',
        background: 'color-mix(in srgb, var(--signal) 12%, transparent)',
        border: '1px solid color-mix(in srgb, var(--signal) 30%, transparent)',
      }
    : {
        color: 'var(--fg-muted)',
        background: 'transparent',
        border: '1px solid transparent',
      }),
});

/** The popover's (or sheet's) contents: search, checkbox rows, Clear and Show N. */
const PickerBody = ({
  options,
  chosen,
  setChosen,
  search,
  all,
  onApply,
  sheet,
}: {
  options: readonly PickerOption[];
  chosen: string[];
  setChosen: (next: string[]) => void;
  search: string | undefined;
  all: number;
  onApply: () => void;
  sheet: boolean;
}) => {
  const [text, setText] = useState('');
  const needle = text.trim().toLowerCase();
  const shown =
    needle === ''
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(needle));
  const countOf = (key: string) =>
    options.find((option) => option.key === key)?.count ?? 0;
  const toggle = (key: string) =>
    setChosen(
      chosen.includes(key)
        ? chosen.filter((each) => each !== key)
        : [...chosen, key],
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {search !== undefined && (
        <div style={{ padding: '4px 2px 6px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 36,
              padding: '0 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface-1)',
              color: 'var(--fg-subtle)',
            }}
          >
            <Search size={15} strokeWidth={1.7} aria-hidden="true" />
            <input
              type="search"
              value={text}
              onChange={(evt) => setText(evt.target.value)}
              placeholder={search}
              aria-label={search}
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 13,
                color: 'var(--fg)',
              }}
            />
          </label>
        </div>
      )}
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          maxHeight: sheet ? undefined : 240,
          overflowY: 'auto',
        }}
      >
        {shown.map((option) => {
          const on = chosen.includes(option.key);
          return (
            <li key={option.key}>
              <label
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minHeight: sheet ? 44 : undefined,
                  padding: '8px 10px',
                  borderRadius: 9,
                  cursor: 'pointer',
                  fontSize: 13.5,
                  color: 'var(--fg)',
                  background: on ? 'var(--surface-2)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(option.key)}
                  style={{ position: 'absolute', opacity: 0, width: 1 }}
                />
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                    width: 16,
                    height: 16,
                    borderRadius: 5,
                    border: on ? 'none' : '1.5px solid var(--border-strong)',
                    background: on ? 'var(--signal)' : 'transparent',
                    color: 'var(--bg)',
                  }}
                >
                  {on && <Check size={12} strokeWidth={3} />}
                </span>
                {option.icon}
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {option.label}
                </span>
                <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
                  {option.count.toLocaleString('en-US')}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 10px 4px',
          marginTop: 4,
          borderTop: '1px solid var(--border)',
        }}
      >
        <button
          type="button"
          style={footButton(false)}
          onClick={() => setChosen([])}
        >
          {COPY.clear}
        </button>
        <button type="button" style={footButton(true)} onClick={onApply}>
          {COPY.show(showCount(chosen, countOf, all))}
        </button>
      </div>
    </div>
  );
};

/**
 * Any venue and Any status (`06/venue-filter`, `06/status-filter`): a
 * multi-select popover on desktop and an `AdminSheet` with the same contents
 * on the phone (4b#23). Ticks wait for Show N; closing without it drops them.
 * The chip keeps its label once something is chosen and only takes the
 * selected edge: the chosen label is held for Design.
 */
export const FilterPicker = ({
  label,
  testId,
  options,
  selected,
  search,
  all,
  onApply,
}: {
  label: string;
  /** On the popover or sheet; the chip carries `<testId>-chip`. */
  testId: string;
  options: readonly PickerOption[];
  selected: readonly string[];
  /** The search field's placeholder; the status list has none. */
  search?: string;
  /** The rows on this side, for Show N with nothing ticked. */
  all: number;
  onApply: (keys: string[]) => void;
}) => {
  const isPhone = useIsPhone();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const apply = () => {
    onApply(chosen);
    setOpen(false);
  };

  // The desktop popover closes on a click outside it and on Escape, handing
  // focus back to its chip. The phone sheet has its own trap.
  useEffect(() => {
    if (!open || isPhone) return undefined;
    popoverRef.current
      ?.querySelector<HTMLElement>('input, button')
      ?.focus({ preventScroll: true });
    const onPointer = (evt: MouseEvent) => {
      if (evt.target instanceof Node && !wrapRef.current?.contains(evt.target))
        setOpen(false);
    };
    const onKey = (evt: KeyboardEvent) => {
      if (evt.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, isPhone]);

  const body = (
    <PickerBody
      options={options}
      chosen={chosen}
      setChosen={setChosen}
      search={search}
      all={all}
      onApply={apply}
      sheet={isPhone}
    />
  );

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 'none' }}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid={`${testId}-chip`}
        style={chipStyle(selected.length > 0)}
        onClick={() => {
          if (!open) setChosen([...selected]);
          setOpen(!open);
        }}
      >
        {label}
      </button>
      {open &&
        (isPhone ? (
          <AdminSheet onClose={() => setOpen(false)} title={label}>
            <div data-testid={testId}>{body}</div>
          </AdminSheet>
        ) : (
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={label}
            data-testid={testId}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              zIndex: 30,
              width: search === undefined ? 280 : 300,
              padding: 8,
              borderRadius: 14,
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-elevated)',
              boxShadow: '0 18px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            {body}
          </div>
        ))}
    </div>
  );
};
