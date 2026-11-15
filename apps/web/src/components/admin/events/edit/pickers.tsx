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

/**
 * How a host form draws the field: Add a show's 38px inputs, with the danger
 * border and its message (`04/add-show-errors-d`). Event edit keeps 40.
 */
interface FieldLook {
  height?: number;
  invalid?: boolean;
  /** The id of the error line under the field. */
  describedBy?: string | undefined;
}

const fieldLook = (height: number, invalid: boolean): CSSProperties => ({
  ...FIELD,
  height,
  ...(invalid && { borderColor: 'var(--danger)' }),
});

export const POPOVER: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  zIndex: 20,
  borderRadius: 14,
  border: '1px solid var(--border-strong)',
  background: 'var(--bg-elevated)',
  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
  padding: 12,
};

/** Closes a popover on an outside press or Escape. */
export const usePopover = () => {
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

const ARROW: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 28,
  height: 28,
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  color: 'var(--fg-muted)',
  cursor: 'pointer',
};

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
  height = 40,
  invalid = false,
  describedBy,
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
} & FieldLook) => {
  const { open, setOpen, close, ref, trigger } = usePopover();
  // With no date yet, the month opens on today's.
  const anchor = value === '' ? today : value;
  const [view, setView] = useState(() => monthOf(anchor));
  const isBarred = (iso: string) =>
    (min !== undefined && iso < min) || (max !== undefined && iso > max);
  const field: CSSProperties = {
    ...fieldLook(height, invalid),
    ...(highlight && !invalid && { borderColor: 'var(--warning)' }),
  };
  const a11y = {
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
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
        {...a11y}
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
        // A button takes no aria-invalid; the error line names it.
        aria-describedby={describedBy}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>
              {monthLabel(view.year, view.month)}
            </span>
            <button
              type="button"
              aria-label={COPY.previousMonth}
              onClick={() => shift(-1)}
              style={ARROW}
            >
              <ChevronLeft size={16} aria-hidden />
            </button>
            <button
              type="button"
              aria-label={COPY.nextMonth}
              onClick={() => shift(1)}
              style={ARROW}
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 4,
              marginTop: 10,
              textAlign: 'center',
            }}
          >
            {COPY.weekdays.map((day, i) => (
              <span
                // The initials repeat (two Ts, two Ss), so the slot keys them.
                key={`${day}${i}`}
                aria-hidden
                style={{ fontSize: 10.5, color: 'var(--fg-subtle)' }}
              >
                {day}
              </span>
            ))}
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
                    fontWeight: chosen ? 700 : 500,
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
                      ? 'linear-gradient(135deg, var(--signal), var(--accent))'
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
              marginTop: 10,
              paddingTop: 10,
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
                borderRadius: 8,
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-2)',
                color: 'var(--fg)',
                fontSize: 13,
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
  height = 40,
  invalid = false,
  describedBy,
}: {
  id: string;
  /** `HH:MM` (or `HH:MM:SS`), or null for none. */
  value: string | null;
  onChange: (value: string | null) => void;
  phone: boolean;
  placeholder: ReactNode;
  /** The field's name (Doors, Show), for the popover and its text field. */
  label: string;
} & FieldLook) => {
  const { open, setOpen, close, ref, trigger } = usePopover();
  const [text, setText] = useState('');
  const hintId = useId();
  const current = value?.slice(0, 5) ?? null;
  // Typed text that isn't a time says so, rather than doing nothing.
  const typedBad = text.trim() !== '' && parseTime(text) === null;
  const field = fieldLook(height, invalid);
  const a11y = {
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
  };

  if (phone) {
    return (
      <input
        id={id}
        type="time"
        value={current ?? ''}
        {...a11y}
        onChange={(evt) => onChange(evt.target.value || null)}
        style={{ ...field, fontSize: 16 }}
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
        aria-describedby={describedBy}
        onClick={() => {
          setText(fieldTime(current) ?? '');
          setOpen(!open);
        }}
        style={field}
      >
        {fieldTime(current) ?? placeholder}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={label}
          style={{ ...POPOVER, width: 240 }}
        >
          <input
            // The popover's one job: focus lands here to type.
            autoFocus
            aria-label={label}
            aria-describedby={hintId}
            aria-invalid={typedBad || undefined}
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
              ...inputStyle(typedBad),
              height: 40,
              ...(!typedBad && { border: '1px solid var(--signal)' }),
            }}
          />
          <div
            id={hintId}
            style={{
              fontSize: 12,
              color: 'var(--fg-subtle)',
              margin: '8px 4px',
            }}
          >
            {COPY.timeHint}
          </div>
          <div
            role="listbox"
            aria-label={COPY.timeList}
            style={{ maxHeight: 240, overflowY: 'auto' }}
          >
            {HALF_HOURS.map((slot) => {
              const chosen = slot === current;
              return (
                <button
                  key={slot}
                  type="button"
                  role="option"
                  aria-selected={chosen}
                  onClick={() => commit(slot)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    height: 36,
                    padding: '0 10px',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: 13.5,
                    fontWeight: chosen ? 700 : 500,
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
