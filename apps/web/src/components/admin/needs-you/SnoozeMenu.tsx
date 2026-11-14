'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { CalendarDays, ChevronLeft, Clock, X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, useIsPhone } from '@/components/admin/primitives';
import { MonthGrid } from '../primitives/MonthGrid';
import {
  eightAmMountain,
  mountainDayAhead,
  snoozeDayLabel,
} from './needs-you-rules';

const COPY = ADMIN_COPY.needsYou.snooze;

interface SnoozeMenuProps {
  /** Back in the queue at this instant (ISO with offset). */
  onSnooze: (until: string) => void;
  /** Absent for an item with no venue: "Not useful" is a per-venue switch. */
  onNotUseful?: ((reason: string) => void) | undefined;
  /**
   * What the item is, for the date step's line and the reason step's title:
   * the warning's name and its venue (null when the item has none).
   */
  about?: { warning: string; venue: string | null };
  disabled?: boolean;
  now?: Date;
}

const STEP: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 12,
};

const STEP_NOTE: CSSProperties = {
  margin: 0,
  fontSize: 13.5,
  lineHeight: 1.45,
  color: 'var(--fg-muted)',
};

/** "Apr 1": the day on the Snooze button. */
const shortDay = (day: string): string =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${day}T00:00:00Z`));

/** A step's title with its back chevron (`01-snooze/not-useful-d`). */
const StepHeader = ({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
    <button
      type="button"
      aria-label={COPY.back}
      onClick={onBack}
      style={{
        display: 'flex',
        padding: 4,
        marginTop: 1,
        border: 'none',
        background: 'transparent',
        color: 'var(--fg-muted)',
        cursor: 'pointer',
      }}
    >
      <ChevronLeft size={18} aria-hidden />
    </button>
    <span style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--fg)' }}>
      {title}
    </span>
  </div>
);

/** One reason: a ringed tile with a radio dot. */
const Radio = ({
  checked,
  label,
  onPick,
}: {
  checked: boolean;
  label: string;
  onPick: () => void;
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={checked}
    onClick={onPick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      padding: '11px 14px',
      borderRadius: 12,
      textAlign: 'left',
      cursor: 'pointer',
      fontSize: 15,
      color: 'var(--fg)',
      border: checked
        ? '1.5px solid var(--signal)'
        : '1px solid var(--border-strong)',
      background: checked
        ? 'color-mix(in srgb, var(--signal) 12%, transparent)'
        : 'transparent',
    }}
  >
    <span
      aria-hidden
      style={{
        width: 18,
        height: 18,
        flex: 'none',
        borderRadius: '50%',
        border: `2px solid ${checked ? 'var(--signal)' : 'var(--border-strong)'}`,
        background: checked
          ? 'radial-gradient(var(--signal) 0 40%, transparent 45%)'
          : 'transparent',
      }}
    />
    {label}
  </button>
);

const ICON_TILE: CSSProperties = {
  width: 36,
  height: 36,
  flex: 'none',
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--surface-2)',
};

const MENU_ITEM: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '8px 10px',
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  cursor: 'pointer',
  borderRadius: 10,
  color: 'var(--fg)',
};

/** One row of the snooze menu: an icon tile, a title and a line under it. */
export const MenuItem = ({
  icon,
  title,
  sub,
  onClick,
  muted = false,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
  muted?: boolean;
}) => (
  <button type="button" role="menuitem" onClick={onClick} style={MENU_ITEM}>
    <span
      style={{
        ...ICON_TILE,
        color: muted ? 'var(--fg-muted)' : 'var(--signal)',
      }}
    >
      {icon}
    </span>
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: muted ? 'var(--fg-muted)' : 'var(--fg)',
        }}
      >
        {title}
      </span>
      <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{sub}</span>
    </span>
  </button>
);

/**
 * The menu's rows: Snooze 1 day, Snooze a week, Until a date, then "Not
 * useful" under a rule. The first two return at 8 AM Mountain. A date asks for
 * the day in place; "Not useful" asks why, in place, before it stops the
 * warning. `afterDate` lands between Until a date and the rule (the phone's
 * "Open {venue}" row, `01-snooze/item-menu-m`). The popover and the phone
 * item's ⋯ sheet both draw these.
 */
export const SnoozeOptions = ({
  onSnooze,
  onNotUseful,
  about,
  afterDate,
  now,
}: Omit<SnoozeMenuProps, 'disabled'> & { afterDate?: ReactNode }) => {
  const [mode, setMode] = useState<'menu' | 'date' | 'reason'>('menu');
  const [date, setDate] = useState('');
  const [reasonIndex, setReasonIndex] = useState(0);
  const [note, setNote] = useState('');

  const today = now ?? new Date();
  const tomorrow = mountainDayAhead(today, 1);
  const inAWeek = mountainDayAhead(today, 7);
  const snoozeTo = (day: string) => onSnooze(eightAmMountain(day));
  const venue = about?.venue ?? null;

  if (mode === 'date')
    return (
      <div style={STEP}>
        <StepHeader title={COPY.dateTitle} onBack={() => setMode('menu')} />
        <MonthGrid value={date} min={tomorrow} onChange={setDate} />
        {date && (
          <p style={STEP_NOTE}>
            {COPY.returns(snoozeDayLabel(date))}
            {venue ? ` ${COPY.staysSnoozed(venue)}` : ''}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <AdminButton
            variant="gradient"
            icon={Clock}
            fullWidth
            disabled={date < tomorrow}
            onClick={() => snoozeTo(date)}
          >
            {COPY.setDate(date ? shortDay(date) : '…')}
          </AdminButton>
          <AdminButton variant="outline" onClick={() => setMode('menu')}>
            {COPY.back}
          </AdminButton>
        </div>
      </div>
    );

  if (mode === 'reason' && onNotUseful && venue) {
    const label = COPY.reasons[reasonIndex] ?? COPY.reasons[0];
    const trimmed = note.trim();
    return (
      <div style={STEP}>
        <StepHeader
          title={COPY.reasonTitle(about?.warning ?? '', venue)}
          onBack={() => setMode('menu')}
        />
        <p style={STEP_NOTE}>{COPY.reasonSub}</p>
        <div
          role="radiogroup"
          aria-label={COPY.reasonTitle(about?.warning ?? '', venue)}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {COPY.reasons.map((text, index) => (
            <Radio
              key={text}
              checked={index === reasonIndex}
              label={text}
              onPick={() => setReasonIndex(index)}
            />
          ))}
        </div>
        <textarea
          aria-label={COPY.reasonNote}
          value={note}
          maxLength={400}
          rows={2}
          placeholder={COPY.reasonNote}
          onChange={(event) => setNote(event.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid var(--border-strong)',
            background: 'var(--bg)',
            color: 'var(--fg)',
            fontSize: 14,
            fontFamily: 'inherit',
            resize: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <AdminButton
            variant="gradient"
            fullWidth
            onClick={() =>
              onNotUseful(trimmed ? `${label}: ${trimmed}` : label)
            }
          >
            {COPY.turnOff}
          </AdminButton>
          <AdminButton variant="outline" onClick={() => setMode('menu')}>
            {COPY.back}
          </AdminButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <MenuItem
        icon={<Clock size={17} />}
        title={COPY.oneDay}
        sub={COPY.oneDaySub}
        onClick={() => snoozeTo(tomorrow)}
      />
      <MenuItem
        icon={<Clock size={17} />}
        title={COPY.aWeek}
        sub={COPY.backOn(snoozeDayLabel(inAWeek))}
        onClick={() => snoozeTo(inAWeek)}
      />
      <MenuItem
        icon={<CalendarDays size={17} />}
        title={COPY.untilDate}
        sub={COPY.untilDateSub}
        onClick={() => setMode('date')}
      />
      {afterDate}
      {onNotUseful && venue && (
        <>
          <div
            aria-hidden
            style={{
              height: 1,
              margin: '6px 10px',
              background: 'var(--border)',
            }}
          />
          <MenuItem
            muted
            icon={<X size={17} />}
            title={COPY.notUseful}
            sub={COPY.notUsefulSub(venue)}
            onClick={() => setMode('reason')}
          />
        </>
      )}
    </>
  );
};

/**
 * `01-snooze/needs-you-clock-d`: the clock that ends a card's top line and
 * sits beside × on the open panel, and its popover of `SnoozeOptions`. Closing the popover drops any half-filled date or reason.
 */
export const SnoozeMenu = ({
  onSnooze,
  onNotUseful,
  about,
  disabled = false,
  now,
}: SnoozeMenuProps) => {
  const isPhone = useIsPhone();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      <button
        type="button"
        data-testid="snooze-trigger"
        aria-label={COPY.menuLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((was) => !was);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 10,
          border: '1px solid var(--border-strong)',
          background: 'var(--surface-2)',
          color: 'var(--fg-muted)',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Clock size={17} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={COPY.menuLabel}
          data-testid="snooze-menu"
          onClick={(event) => event.stopPropagation()}
          style={{
            // On a phone the trigger sits mid-card, so a popover would run off
            // an edge: it becomes a sheet above the tab bar instead.
            ...(isPhone
              ? {
                  position: 'fixed',
                  left: 16,
                  right: 16,
                  bottom: 84,
                  zIndex: 60,
                }
              : {
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  zIndex: 20,
                  marginTop: 6,
                  width: 340,
                  maxWidth: 'calc(100vw - 32px)',
                }),
            padding: 6,
            borderRadius: 16,
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-elevated)',
            boxShadow: '0 18px 48px rgba(0, 0, 0, 0.45)',
          }}
        >
          <SnoozeOptions
            onSnooze={(until) => {
              close();
              onSnooze(until);
            }}
            onNotUseful={
              onNotUseful
                ? (reason) => {
                    close();
                    onNotUseful(reason);
                  }
                : undefined
            }
            {...(about ? { about } : {})}
            {...(now ? { now } : {})}
          />
        </div>
      )}
    </span>
  );
};
