'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { useDialogKeyboard } from '@/components/admin/primitives/useDialogKeyboard';
import {
  isoOf,
  monthCells,
  monthKey,
  monthLabel,
  monthOf,
  shiftDay,
  shiftMonth,
  type MonthView,
} from '@/components/admin/primitives/calendar';
import { pill } from '@/components/admin/crawl-runs/RunsList';
import { fieldDate } from '@/components/admin/events/edit/event-detail';

const COPY = ADMIN_COPY.operations.log;

/** "Today", or the day as the chip draws it ("Tue, Nov 10"). */
export const dayChipLabel = (day: string, today: string) =>
  day === today ? COPY.today : fieldDate(day, false);

/** "Nov 10", as the phone's end line draws a day (`37/log-m`). */
export const shortDay = (day: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${day}T00:00:00Z`));

interface DayPickerProps {
  /** The day on screen, `YYYY-MM-DD` in Mountain Time. */
  day: string;
  /** Mountain Time's today: nothing after it can be picked. */
  today: string;
  onDay: (day: string) => void;
  /** The month's days with changes, for the dots. */
  readDays: (month: string, signal: AbortSignal) => Promise<Set<string>>;
}

/** `37/log-day-picker-d`: the 32px circles either side of the day chip. */
const STEP: CSSProperties = {
  width: 32,
  height: 32,
  flex: 'none',
  display: 'grid',
  placeItems: 'center',
  borderRadius: 999,
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--fg-muted)',
  cursor: 'pointer',
};

const MONTH_ARROW: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 22,
  height: 22,
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: 'var(--fg-muted)',
  cursor: 'pointer',
};

/** The month's days with changes, read as the month on show changes. */
const useMonthDots = (
  view: MonthView,
  readDays: DayPickerProps['readDays'],
) => {
  const [dots, setDots] = useState<{ month: string; days: Set<string> }>();
  const month = monthKey(view);
  useEffect(() => {
    const ctrl = new AbortController();
    // A new month or new filters drop the old dots, so none leads to a day
    // the filters have emptied.
    setDots(undefined);
    void (async () => {
      try {
        const days = await readDays(month, ctrl.signal);
        if (!ctrl.signal.aborted) setDots({ month, days });
      } catch (err) {
        // The dots are a hint: a failed read leaves the month without them,
        // and every day stays pickable.
        if (!ctrl.signal.aborted)
          console.warn('[admin] Activity log: the month dots failed', err);
      }
    })();
    return () => ctrl.abort();
  }, [month, readDays]);
  return dots?.month === month ? dots.days : null;
};

/**
 * `37/log-day-picker-d`: the one-month popover under the day chip. A dot marks
 * a day with changes, days after today are off, and Today jumps back. Escape
 * and an outside press close it; Tab stays inside (the trap skips the
 * disabled days and arrow).
 */
const MonthPopover = ({
  day,
  today,
  onPick,
  onClose,
  readDays,
}: {
  day: string;
  today: string;
  onPick: (day: string) => void;
  onClose: () => void;
  readDays: DayPickerProps['readDays'];
}) => {
  const panel = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(() => monthOf(day));
  const dots = useMonthDots(view, readDays);
  const atToday = monthKey(view) >= monthKey(monthOf(today));
  useDialogKeyboard(panel, onClose);

  useEffect(() => {
    const onDown = (evt: PointerEvent) => {
      if (evt.target instanceof Node && panel.current?.contains(evt.target))
        return;
      // The chip toggles on its own click; closing here too would reopen it.
      if (
        evt.target instanceof Element &&
        evt.target.closest('[data-day-chip]')
      )
        return;
      onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [onClose]);

  const label = monthLabel(view.year, view.month);
  return (
    <div
      ref={panel}
      role="dialog"
      aria-label={label}
      data-testid="activity-log-month"
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        right: 0,
        zIndex: 20,
        width: 300,
        borderRadius: 14,
        border: '1px solid var(--border-strong)',
        background: 'var(--bg-elevated)',
        boxShadow: '0 18px 40px rgba(0, 0, 0, 0.45)',
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '4px 6px 8px',
        }}
      >
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{label}</span>
        <button
          type="button"
          aria-label={COPY.previousMonth}
          onClick={() => setView((was) => shiftMonth(was, -1))}
          style={MONTH_ARROW}
        >
          <ChevronLeft size={14} strokeWidth={1.8} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={COPY.nextMonth}
          disabled={atToday}
          onClick={() => setView((was) => shiftMonth(was, 1))}
          style={{
            ...MONTH_ARROW,
            color: atToday ? 'var(--fg-subtle)' : 'var(--fg-muted)',
            cursor: atToday ? 'default' : 'pointer',
          }}
        >
          <ChevronRight size={14} strokeWidth={1.8} aria-hidden />
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
          textAlign: 'center',
        }}
      >
        {COPY.weekdays.map((letter, i) => (
          <span
            // The initials repeat (two Ts, two Ss), so the slot keys them.
            key={`${letter}${i}`}
            aria-hidden
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.1em',
              fontWeight: 600,
              color: 'var(--fg-subtle)',
            }}
          >
            {letter}
          </span>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
          marginTop: 4,
        }}
      >
        {monthCells(view.year, view.month).map((date, i) => {
          if (date === null) return <span key={`blank${i}`} />;
          const iso = isoOf(view.year, view.month, date);
          const chosen = iso === day;
          const future = iso > today;
          const dotted = !chosen && !future && (dots?.has(iso) ?? false);
          return (
            <button
              key={iso}
              type="button"
              data-autofocus={chosen ? '' : undefined}
              aria-pressed={chosen}
              aria-current={iso === today ? 'date' : undefined}
              aria-label={fieldDate(iso, true)}
              disabled={future}
              onClick={() => onPick(iso)}
              style={{
                position: 'relative',
                height: 34,
                borderRadius: 9,
                fontSize: 13,
                fontWeight: chosen ? 800 : 400,
                cursor: future ? 'default' : 'pointer',
                opacity: future ? 0.45 : 1,
                border:
                  iso === today && !chosen
                    ? '1px solid var(--signal)'
                    : '1px solid transparent',
                // A past day with nothing on it reads quieter, still pickable.
                color: chosen
                  ? 'var(--bg)'
                  : future || (dots !== null && !dotted)
                    ? 'var(--fg-subtle)'
                    : 'var(--fg)',
                background: chosen
                  ? 'linear-gradient(135deg, var(--signal), var(--accent))'
                  : 'transparent',
              }}
            >
              {date}
              {dotted && (
                <span
                  aria-hidden
                  data-testid="activity-log-dot"
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: '50%',
                    marginLeft: -2,
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--signal)',
                  }}
                />
              )}
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
          onClick={() => onPick(today)}
          style={{
            height: 30,
            padding: '0 12px',
            borderRadius: 9,
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-2)',
            color: 'var(--fg)',
            fontFamily: 'inherit',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {COPY.today}
        </button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
          {COPY.dotLegend}
        </span>
      </div>
    </div>
  );
};

/**
 * `37/log-day-picker-d`, `37/log-older-day-d`: on the right of the filter
 * row, ‹ and › step a day and the chip opens the month. › is off on Today.
 */
export const DayStepper = ({ day, today, onDay, readDays }: DayPickerProps) => {
  const [open, setOpen] = useState(false);
  const atToday = day >= today;
  const chip = useRef<HTMLButtonElement>(null);
  // The popover's own restore hands focus back to whatever held it on open,
  // which is <body> when a click didn't focus the chip (Safari, Firefox on
  // macOS). Closing always lands on the chip, after that restore has run.
  const refocus = useRef(false);
  useEffect(() => {
    if (open || !refocus.current) return;
    refocus.current = false;
    chip.current?.focus();
  }, [open]);
  const close = () => {
    refocus.current = true;
    setOpen(false);
  };
  const pick = (next: string) => {
    close();
    onDay(next);
  };
  return (
    <div
      data-testid="activity-log-day-stepper"
      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
    >
      <button
        type="button"
        aria-label={COPY.previousDay}
        onClick={() => onDay(shiftDay(day, -1))}
        style={STEP}
      >
        <ChevronLeft size={13} strokeWidth={1.8} aria-hidden />
      </button>
      <div style={{ position: 'relative' }}>
        <button
          ref={chip}
          type="button"
          data-day-chip
          data-testid="activity-log-day-chip"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={COPY.chooseDay(dayChipLabel(day, today))}
          onClick={() => setOpen((was) => !was)}
          style={pill(true)}
        >
          <Calendar
            size={13}
            strokeWidth={1.7}
            color="var(--fg-muted)"
            aria-hidden
          />
          {dayChipLabel(day, today)}
          <ChevronDown
            size={11}
            strokeWidth={1.8}
            color="var(--fg-muted)"
            aria-hidden
          />
        </button>
        {open && (
          <MonthPopover
            day={day}
            today={today}
            onPick={pick}
            onClose={close}
            readDays={readDays}
          />
        )}
      </div>
      <button
        type="button"
        aria-label={COPY.nextDay}
        disabled={atToday}
        onClick={() => onDay(shiftDay(day, 1))}
        style={{
          ...STEP,
          opacity: atToday ? 0.35 : 1,
          cursor: atToday ? 'default' : 'pointer',
        }}
      >
        <ChevronRight size={13} strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  );
};

/** `37/log-m`: the phone's 36px square steps. */
const PHONE_STEP: CSSProperties = {
  ...STEP,
  width: 36,
  height: 36,
  borderRadius: 10,
};

/**
 * `37/log-m`: the phone's full-width day stepper. The middle opens the OS
 * date picker (addendum 5 #4): an invisible date input laid over it takes the
 * tap, so the system sheet opens from the drawn control.
 */
export const PhoneDayStepper = ({
  day,
  today,
  onDay,
}: Omit<DayPickerProps, 'readDays'>) => {
  const atToday = day >= today;
  return (
    <div
      data-testid="activity-log-day-stepper"
      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
    >
      <button
        type="button"
        aria-label={COPY.previousDay}
        onClick={() => onDay(shiftDay(day, -1))}
        style={PHONE_STEP}
      >
        <ChevronLeft size={14} strokeWidth={1.8} aria-hidden />
      </button>
      <label
        style={{
          ...pill(true),
          position: 'relative',
          flex: 1,
          height: 36,
          borderRadius: 10,
          justifyContent: 'center',
          gap: 8,
          fontSize: 13.5,
        }}
      >
        <Calendar
          size={14}
          strokeWidth={1.7}
          color="var(--fg-muted)"
          aria-hidden
        />
        {dayChipLabel(day, today)}
        <input
          type="date"
          data-testid="activity-log-day-input"
          aria-label={COPY.chooseDay(dayChipLabel(day, today))}
          value={day}
          max={today}
          onChange={(evt) => {
            const next = evt.target.value;
            // The OS picker honours `max`, but a typed date may not.
            if (next === '' || next > today) return;
            onDay(next);
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            // 16px keeps iOS from zooming the page when the input focuses.
            fontSize: 16,
            border: 'none',
            cursor: 'pointer',
          }}
        />
      </label>
      <button
        type="button"
        aria-label={COPY.nextDay}
        disabled={atToday}
        onClick={() => onDay(shiftDay(day, 1))}
        style={{
          ...PHONE_STEP,
          opacity: atToday ? 0.35 : 1,
          cursor: atToday ? 'default' : 'pointer',
        }}
      >
        <ChevronRight size={14} strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  );
};
