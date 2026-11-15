'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  isoOf,
  monthCells,
  monthLabel,
  monthOf,
  pad,
  shiftMonth,
} from '@/components/admin/primitives/calendar';
import { inputStyle } from '@/components/admin/venues/source/source-parts';
import { fieldDate, fieldTime } from './event-detail';

const COPY = ADMIN_COPY.eventEdit.pickers;

/** The field both pickers draw as: the Show card's 40px input. */
const FIELD: CSSProperties = {
  ...inputStyle(false),
  height: 40,
  textAlign: 'left',
  cursor: 'pointer',
};

const POPOVER: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  zIndex: 20,
  borderRadius: 14,
  border: '1px solid var(--border-strong)',
  background: 'var(--bg-elevated)',
  boxShadow: '0 18px 40px rgba(0, 0, 0, 0.45)',
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

/** Closes a popover on an outside press or Escape. */
const usePopover = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  /** Closes, handing focus back to the field so it never drops to the page. */
  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (evt: PointerEvent) => {
      if (evt.target instanceof Node && !ref.current?.contains(evt.target)) {
        setOpen(false);
      }
    };
    // Captured and stopped, so Escape closes only the popover, never the
    // dialog it sits in (Postponed's New date).
    const onKey = (evt: KeyboardEvent) => {
      if (evt.key !== 'Escape') return;
      evt.stopPropagation();
      close();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, close]);
  return { open, setOpen, close, ref, trigger };
};

/**
 * A month arrow. The board draws bare 14px chevrons 28px apart, 6px in from
 * the edge; 26px-wide buttons 2px apart put each icon's centre exactly there
 * while keeping a press target, and the negative block margin keeps the
 * header row the height of its 14px label.
 */
const ARROW: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 26,
  height: 24,
  marginBlock: -5,
  padding: 0,
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  color: 'var(--fg-muted)',
  cursor: 'pointer',
};

/**
 * The board's chevron is stroke 1.8 in a 16-unit box drawn at 14px; lucide's
 * box is 24 units, so 2.7 renders the same 1.575px line.
 */
const CHEVRON_STROKE = 2.7;

/**
 * A date field (`04/date-picker-d`): a one-month popover on desktop, the OS
 * date picker on the phone behind the same field style. `min` (YYYY-MM-DD)
 * bars earlier days, as Postponed's New date does (future only); `max` bars
 * later ones, as a played show's correction does (past only).
 */
export const DateField = ({
  id,
  value,
  onChange,
  today,
  phone,
  min,
  max,
  placeholder,
  highlight = false,
  withYear,
}: {
  id: string;
  /** YYYY-MM-DD, or '' for none yet (the `placeholder` shows). */
  value: string;
  onChange: (value: string) => void;
  /** YYYY-MM-DD in Mountain Time: ringed, and Today's target. */
  today: string;
  phone: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  /** The amber border `36/postponed-passed-d` draws on New date. */
  highlight?: boolean;
  withYear: boolean;
}) => {
  const { open, setOpen, close, ref, trigger } = usePopover();
  // With no date yet, the month opens on today's.
  const anchor = value === '' ? today : value;
  const [view, setView] = useState(() => monthOf(anchor));
  const isBarred = (iso: string) =>
    (min !== undefined && iso < min) || (max !== undefined && iso > max);
  const field: CSSProperties = {
    ...FIELD,
    ...(highlight && { borderColor: 'var(--warning)' }),
  };
  const chosenRef = useRef<HTMLButtonElement>(null);
  // Focus lands on the chosen day when the month opens.
  useEffect(() => {
    if (open) chosenRef.current?.focus();
  }, [open]);

  if (phone) {
    return (
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(evt) => {
          const next = evt.target.value;
          // The OS picker honours `min` and `max`, but a typed date may not.
          if (next === '' || isBarred(next)) return;
          onChange(next);
        }}
        style={{ ...field, fontSize: 16 }}
      />
    );
  }

  const pick = (iso: string) => {
    if (isBarred(iso)) return;
    onChange(iso);
    close();
  };
  const shift = (step: number) => setView((was) => shiftMonth(was, step));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        ref={trigger}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        style={field}
      >
        {value === '' ? (
          <span style={{ color: 'var(--fg-subtle)' }}>{placeholder}</span>
        ) : (
          fieldDate(value, withYear)
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={monthLabel(view.year, view.month)}
          style={{ ...POPOVER, width: 300 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '4px 0 8px 6px',
            }}
          >
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>
              {monthLabel(view.year, view.month)}
            </span>
            <button
              type="button"
              aria-label={COPY.previousMonth}
              onClick={() => shift(-1)}
              style={ARROW}
            >
              <ChevronLeft size={14} strokeWidth={CHEVRON_STROKE} aria-hidden />
            </button>
            <button
              type="button"
              aria-label={COPY.nextMonth}
              onClick={() => shift(1)}
              style={ARROW}
            >
              <ChevronRight
                size={14}
                strokeWidth={CHEVRON_STROKE}
                aria-hidden
              />
            </button>
          </div>
          <div
            aria-hidden
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 2,
              textAlign: 'center',
            }}
          >
            {COPY.weekdays.map((day, i) => (
              <span
                // The initials repeat (two Ts, two Ss), so the slot keys them.
                key={`${day}${i}`}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  color: 'var(--fg-subtle)',
                }}
              >
                {day}
              </span>
            ))}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 2,
              marginTop: 4,
              textAlign: 'center',
            }}
          >
            {monthCells(view.year, view.month).map((day, i) => {
              if (day === null) return <span key={`blank${i}`} />;
              const iso = isoOf(view.year, view.month, day);
              const chosen = iso === value;
              const barred = isBarred(iso);
              return (
                <button
                  key={iso}
                  ref={chosen ? chosenRef : undefined}
                  type="button"
                  aria-pressed={chosen}
                  aria-current={iso === today ? 'date' : undefined}
                  aria-label={fieldDate(iso, true)}
                  disabled={barred}
                  onClick={() => pick(iso)}
                  style={{
                    height: 34,
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: chosen ? 800 : 400,
                    cursor: barred ? 'default' : 'pointer',
                    // Days before today draw muted (`04/date-picker-d`),
                    // still pickable unless barred by `min` or `max`.
                    color: chosen
                      ? 'var(--bg)'
                      : barred || iso < today
                        ? 'var(--fg-subtle)'
                        : 'var(--fg)',
                    border:
                      iso === today && !chosen
                        ? '1px solid var(--signal)'
                        : '1px solid transparent',
                    background: chosen
                      ? 'linear-gradient(135deg, var(--signal), var(--cta-end))'
                      : 'transparent',
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 6,
              padding: '8px 4px 2px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              disabled={isBarred(today)}
              onClick={() => pick(today)}
              style={{
                height: 30,
                padding: '0 12px',
                borderRadius: 9,
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-2)',
                color: 'var(--fg)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {COPY.today}
            </button>
            <span
              style={{
                flex: 1,
                textAlign: 'right',
                fontSize: 12,
                color: 'var(--fg-subtle)',
              }}
            >
              {min === undefined ? COPY.pastAllowed : COPY.futureOnly}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * "7:30 PM", "7:30pm", "19:30" or "7 pm" to `HH:MM`; `null` when it isn't a
 * time.
 */
export const parseTime = (text: string): string | null => {
  const match = /^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?\s*m?\.?\s*$/i.exec(
    text,
  );
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? '0');
  const half = match[3]?.toLowerCase();
  if (minutes > 59) return null;
  if (half !== undefined) {
    if (hours < 1 || hours > 12) return null;
    if (half === 'p' && hours !== 12) hours += 12;
    if (half === 'a' && hours === 12) hours = 0;
  } else if (
    hours > 23 ||
    (hours >= 1 && hours <= 11 && match[2] === undefined)
  ) {
    // A bare "7" could be morning or evening: it needs its am or pm. "19",
    // "0" and "12" read on a 24-hour clock.
    return null;
  }
  return `${pad(hours)}:${pad(minutes)}`;
};

/** Half hours from 10:00 AM to 11:30 PM, the list under the time field. */
const HALF_HOURS = Array.from({ length: 28 }, (_, i) => {
  const minutes = 600 + i * 30;
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
});

/**
 * A time field (`04/time-picker-d`): on desktop a popover with a text field
 * (any time types) over a half-hour list; on the phone the OS time picker.
 * Doors and Show share it.
 */
export const TimeField = ({
  id,
  value,
  onChange,
  phone,
  placeholder,
  label,
}: {
  id: string;
  /** `HH:MM` (or `HH:MM:SS`), or null for none. */
  value: string | null;
  onChange: (value: string | null) => void;
  phone: boolean;
  placeholder: ReactNode;
  /** The field's name (Doors, Show), for the popover and its text field. */
  label: string;
}) => {
  const { open, setOpen, close, ref, trigger } = usePopover();
  const [text, setText] = useState('');
  const hintId = useId();
  const current = value?.slice(0, 5) ?? null;
  // Typed text that isn't a time says so, rather than doing nothing.
  const invalid = text.trim() !== '' && parseTime(text) === null;
  const listRef = useRef<HTMLDivElement>(null);
  const chosenRef = useRef<HTMLButtonElement>(null);
  // The list opens on the chosen half hour, centred where it can be
  // (`04/time-picker-d` draws 6:00 PM between 5:30 and 8:30), instead of
  // always at 10:00 AM. Only the list scrolls, never the page or the dialog
  // around it (which `scrollIntoView` would), and it jumps rather than
  // animates. With no time chosen it stays at the top.
  useEffect(() => {
    if (!open) return undefined;
    const list = listRef.current;
    const option = chosenRef.current;
    if (list === null || option === null) return undefined;
    list.scrollTop = Math.max(
      0,
      option.offsetTop - (list.clientHeight - option.offsetHeight) / 2,
    );
    return undefined;
  }, [open]);

  if (phone) {
    return (
      <input
        id={id}
        type="time"
        value={current ?? ''}
        onChange={(evt) => onChange(evt.target.value || null)}
        style={{ ...FIELD, fontSize: 16 }}
      />
    );
  }

  const commit = (next: string | null) => {
    onChange(next);
    close();
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        ref={trigger}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setText(fieldTime(current) ?? '');
          setOpen(!open);
        }}
        style={FIELD}
      >
        {fieldTime(current) ?? placeholder}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={label}
          style={{ ...POPOVER, width: 200 }}
        >
          <input
            // The popover's one job: focus lands here to type.
            autoFocus
            aria-label={label}
            aria-describedby={hintId}
            aria-invalid={invalid || undefined}
            value={text}
            onChange={(evt) => setText(evt.target.value)}
            onKeyDown={(evt) => {
              if (evt.key !== 'Enter') return;
              // An emptied field clears the time; anything else must parse.
              if (text.trim() === '') {
                commit(null);
                return;
              }
              const parsed = parseTime(text);
              if (parsed !== null) commit(parsed);
            }}
            style={{
              ...inputStyle(invalid),
              ...(!invalid && { border: '1px solid var(--signal)' }),
            }}
          />
          <div
            id={hintId}
            style={{
              fontSize: 12,
              color: 'var(--fg-subtle)',
              padding: '6px 2px 2px',
            }}
          >
            {COPY.timeHint}
          </div>
          <div
            ref={listRef}
            role="listbox"
            aria-label={COPY.timeList}
            style={{
              // Positioned so each option's offsetTop measures from the list.
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              maxHeight: 240,
              overflowY: 'auto',
            }}
          >
            {HALF_HOURS.map((slot) => {
              const chosen = slot === current;
              return (
                <button
                  key={slot}
                  ref={chosen ? chosenRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={chosen}
                  onClick={() => commit(slot)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    flex: 'none',
                    height: 34,
                    padding: '0 10px',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: 13.5,
                    fontWeight: chosen ? 600 : 400,
                    color: 'var(--fg)',
                    background: chosen ? 'var(--surface-2)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ flex: 1, textAlign: 'left' }}>
                    {fieldTime(slot)}
                  </span>
                  {chosen && (
                    <Check size={14} color="var(--signal)" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
