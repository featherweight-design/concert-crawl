'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { CalendarDays, Clock, X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, useIsPhone } from '@/components/admin/primitives';
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
  disabled?: boolean;
  now?: Date;
}

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

const Item = ({
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
 * `02/snooze-menu`: Snooze 1 day, Snooze a week, Until a date, and "Not useful"
 * under a rule. The first two return at 8 AM Mountain. A date asks for the day
 * in place; "Not useful" asks why, in place, before it stops the warning.
 */
export const SnoozeMenu = ({
  onSnooze,
  onNotUseful,
  disabled = false,
  now,
}: SnoozeMenuProps) => {
  const isPhone = useIsPhone();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'menu' | 'date' | 'reason'>('menu');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const wrapRef = useRef<HTMLSpanElement>(null);

  const close = () => {
    setOpen(false);
    setMode('menu');
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const today = now ?? new Date();
  const tomorrow = mountainDayAhead(today, 1);
  const inAWeek = mountainDayAhead(today, 7);

  const snoozeTo = (day: string) => {
    close();
    onSnooze(eightAmMountain(day));
  };

  return (
    <span
      ref={wrapRef}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      <AdminButton
        variant="ghost"
        size="sm"
        icon={Clock}
        data-testid="snooze-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((was) => !was);
        }}
      >
        {COPY.trigger}
      </AdminButton>
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
                  width: 320,
                  maxWidth: 'calc(100vw - 32px)',
                }),
            padding: 6,
            borderRadius: 16,
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-elevated)',
            boxShadow: '0 18px 48px rgba(0, 0, 0, 0.45)',
          }}
        >
          {mode === 'menu' && (
            <>
              <Item
                icon={<Clock size={17} />}
                title={COPY.oneDay}
                sub={COPY.oneDaySub}
                onClick={() => snoozeTo(tomorrow)}
              />
              <Item
                icon={<Clock size={17} />}
                title={COPY.aWeek}
                sub={COPY.backOn(snoozeDayLabel(inAWeek))}
                onClick={() => snoozeTo(inAWeek)}
              />
              <Item
                icon={<CalendarDays size={17} />}
                title={COPY.untilDate}
                sub={COPY.untilDateSub}
                onClick={() => setMode('date')}
              />
              {onNotUseful && (
                <>
                  <div
                    aria-hidden
                    style={{
                      height: 1,
                      margin: '6px 10px',
                      background: 'var(--border)',
                    }}
                  />
                  <Item
                    muted
                    icon={<X size={17} />}
                    title={COPY.notUseful}
                    sub={COPY.notUsefulSub}
                    onClick={() => setMode('reason')}
                  />
                </>
              )}
            </>
          )}
          {mode === 'date' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: 10,
              }}
            >
              <label style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                {COPY.dateLabel}
                <input
                  type="date"
                  value={date}
                  min={tomorrow}
                  onChange={(event) => setDate(event.target.value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 6,
                    height: 36,
                    padding: '0 10px',
                    borderRadius: 10,
                    border: '1px solid var(--border-strong)',
                    background: 'var(--surface-1)',
                    color: 'var(--fg)',
                  }}
                />
              </label>
              <AdminButton
                variant="primary"
                disabled={date < tomorrow}
                onClick={() => snoozeTo(date)}
              >
                {COPY.setDate}
              </AdminButton>
            </div>
          )}
          {mode === 'reason' && onNotUseful && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: 10,
              }}
            >
              <label style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                {COPY.reasonLabel}
                <input
                  type="text"
                  value={reason}
                  maxLength={500}
                  placeholder={COPY.reasonPlaceholder}
                  onChange={(event) => setReason(event.target.value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 6,
                    height: 36,
                    padding: '0 10px',
                    borderRadius: 10,
                    border: '1px solid var(--border-strong)',
                    background: 'var(--surface-1)',
                    color: 'var(--fg)',
                  }}
                />
              </label>
              <AdminButton
                variant="outline"
                onClick={() => {
                  close();
                  onNotUseful(reason);
                }}
              >
                {COPY.stopWarning}
              </AdminButton>
            </div>
          )}
        </div>
      )}
    </span>
  );
};
