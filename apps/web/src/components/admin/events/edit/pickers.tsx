'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
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
  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
  padding: 12,
};

/** Closes a popover on an outside press or Escape. */
const useDismiss = (open: boolean, close: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (evt: PointerEvent) => {
      if (evt.target instanceof Node && !ref.current?.contains(evt.target)) {
        close();
      }
    };
    const onKey = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
};

const pad = (value: number) => String(value).padStart(2, '0');
const isoOf = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

/** The month grid's cells: blanks before the 1st, then each day. */
const monthCells = (year: number, month: number): (number | null)[] => {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
};

const monthLabel = (year: number, month: number) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month, 1)));

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
 * bars earlier days, as Postponed's New date does (future only).
 */
export const DateField = ({
  id,
  value,
  onChange,
  today,
  phone,
  min,
  withYear,
}: {
  id: string;
  /** YYYY-MM-DD. */
  value: string;
  onChange: (value: string) => void;
  /** YYYY-MM-DD in Mountain Time: ringed, and Today's target. */
  today: string;
  phone: boolean;
  min?: string;
  withYear: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => ({
    year: Number(value.slice(0, 4)),
    month: Number(value.slice(5, 7)) - 1,
  }));
  const ref = useDismiss(open, () => setOpen(false));

  if (phone) {
    return (
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        onChange={(evt) => {
          if (evt.target.value !== '') onChange(evt.target.value);
        }}
        style={{ ...FIELD, fontSize: 16 }}
      />
    );
  }

  const pick = (iso: string) => {
    if (min !== undefined && iso < min) return;
    onChange(iso);
    setOpen(false);
  };
  const shift = (step: number) =>
    setView(({ year, month }) => {
      const next = month + step;
      return { year: year + Math.floor(next / 12), month: (next + 12) % 12 };
    });

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        style={FIELD}
      >
        {fieldDate(value, withYear)}
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
              const barred = min !== undefined && iso < min;
              return (
                <button
                  key={iso}
                  type="button"
                  aria-pressed={chosen}
                  aria-label={fieldDate(iso, true)}
                  disabled={barred}
                  onClick={() => pick(iso)}
                  style={{
                    height: 34,
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: chosen ? 700 : 500,
                    cursor: barred ? 'default' : 'pointer',
                    color: chosen
                      ? 'var(--bg)'
                      : barred
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
              disabled={min !== undefined && today < min}
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
  } else if (hours > 23) {
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
}: {
  id: string;
  /** `HH:MM` (or `HH:MM:SS`), or null for none. */
  value: string | null;
  onChange: (value: string | null) => void;
  phone: boolean;
  placeholder: ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const hintId = useId();
  const ref = useDismiss(open, () => setOpen(false));
  const current = value?.slice(0, 5) ?? null;

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
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
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
        <div role="dialog" style={{ ...POPOVER, width: 240 }}>
          <input
            // The popover's one job: focus lands here to type.
            autoFocus
            aria-describedby={hintId}
            value={text}
            onChange={(evt) => setText(evt.target.value)}
            onKeyDown={(evt) => {
              if (evt.key !== 'Enter') return;
              const parsed = parseTime(text);
              if (parsed !== null) commit(parsed);
            }}
            style={{
              ...inputStyle(false),
              height: 40,
              border: '1px solid var(--signal)',
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
