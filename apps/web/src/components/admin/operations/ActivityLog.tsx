'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { List } from 'lucide-react';
import type { AuditLogItem } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { CouldntLoad, PersonAvatar } from '@/components/admin/primitives';
import {
  LoadMoreFooter,
  pill,
  type LoadMoreState,
} from '@/components/admin/crawl-runs/RunsList';
import { fieldDate } from '@/components/admin/events/edit/event-detail';
import { mtDayWindow } from '@/components/admin/health/health-model';
import { shiftDay } from '@/components/admin/primitives/calendar';
import { DENVER_TIME_ZONE, localDateString } from '@/lib/time';
import {
  LOG_PAGE_SIZE,
  readLogDays,
  readLogPage,
  type LogQuery,
} from './activity-api';
import {
  DayStepper,
  PhoneDayStepper,
  dayChipLabel,
  shortDay,
} from './DayPicker';
import {
  AREA_LABELS,
  actorLabel,
  logTime,
  sentenceFor,
} from './activity-sentences';
import { ActivityLogRowsSkeleton } from './ActivityLogSkeleton';

const COPY = ADMIN_COPY.operations.log;

const MONO_HEAD: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  letterSpacing: '0.14em',
  fontWeight: 600,
  color: 'var(--fg-subtle)',
};

const BORDER = '1px solid var(--border)';

/** The row's sentence, its target in bold, linked to what it changed. */
const What = ({ item }: { item: AuditLogItem }) => {
  const { lead, name, tail } = sentenceFor(item);
  const words = (
    <>
      {lead}
      {name !== null && <b>{name}</b>}
      {tail}
    </>
  );
  const href = item.target?.href;
  return href ? (
    <Link href={href} style={{ color: 'inherit', textDecoration: 'none' }}>
      {words}
    </Link>
  ) : (
    words
  );
};

/** #24: each admin in their own colours; System in the house pair. */
const Avatar = ({ item, size }: { item: AuditLogItem; size: number }) => (
  <PersonAvatar
    initialOf={actorLabel(item).replace(/^@/, '')}
    avatarColor={item.actorAvatar?.avatarColor ?? null}
    avatarSecondColor={item.actorAvatar?.avatarSecondColor ?? null}
    size={size}
    initialSize={size === 24 ? 10 : 12}
  />
);

const Where = ({ item }: { item: AuditLogItem }) => (
  <span style={{ color: 'var(--signal)' }}>
    {item.area ? AREA_LABELS[item.area] : COPY.noPage}
  </span>
);

const DAY_LINK: CSSProperties = {
  padding: 0,
  border: 'none',
  background: 'transparent',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  fontWeight: 600,
  color: 'var(--signal)',
  cursor: 'pointer',
};

interface DayNav {
  day: string;
  today: string;
  onDay: (day: string) => void;
}

/**
 * `37/log-older-day-d`: the line that ends an earlier day, with the days
 * either side. Today keeps the board's standing footer instead.
 */
const DayEnd = ({ day, today, onDay }: DayNav) => {
  const before = shiftDay(day, -1);
  const after = shiftDay(day, 1);
  return (
    <div
      data-testid="activity-log-day-end"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 18px',
        borderTop: BORDER,
        fontSize: 12.5,
        color: 'var(--fg-subtle)',
      }}
    >
      <span>{COPY.dayEnd(fieldDate(day, false))}</span>
      <span style={{ flex: 1 }} />
      <button type="button" onClick={() => onDay(before)} style={DAY_LINK}>
        ‹ {fieldDate(before, false)}
      </button>
      <span aria-hidden>·</span>
      <button type="button" onClick={() => onDay(after)} style={DAY_LINK}>
        {dayChipLabel(after, today)} ›
      </button>
    </div>
  );
};

/** `37/log-m`: the phone's end line, the day before only. */
const PhoneDayEnd = ({ day, onDay }: Omit<DayNav, 'today'>) => {
  const before = shiftDay(day, -1);
  return (
    <div
      data-testid="activity-log-day-end"
      style={{
        padding: '14px 0',
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--fg-muted)',
      }}
    >
      {COPY.dayEnd(shortDay(day))}{' '}
      <button type="button" onClick={() => onDay(before)} style={DAY_LINK}>
        ‹ {shortDay(before)}
      </button>
    </div>
  );
};

interface MoreProps {
  more: boolean;
  moreState: LoadMoreState;
  onLoadMore: () => void;
}

/** README §37: a day past one page gets Load more before its end line. */
const More = ({
  rows,
  more,
  moreState,
  onLoadMore,
  phone,
}: MoreProps & { rows: AuditLogItem[]; phone: boolean }) =>
  more || rows.length > LOG_PAGE_SIZE ? (
    <LoadMoreFooter
      shown={rows.length}
      step={LOG_PAGE_SIZE}
      more={more}
      state={moreState}
      onLoadMore={onLoadMore}
      testId="activity-log-load-more"
      failedLabel={COPY.loadMoreFailed}
      {...(phone ? { rule: false } : { padding: '12px 18px' })}
    />
  ) : null;

/** `07/activity-log`: the desktop table. */
const LogTable = ({
  rows,
  nav,
  ...more
}: { rows: AuditLogItem[]; nav: DayNav } & MoreProps) => (
  <div
    data-testid="activity-log-table"
    style={{
      borderRadius: 14,
      border: BORDER,
      background: 'var(--surface-1)',
      overflow: 'hidden',
    }}
  >
    {/* Divs with table roles, not a <table>: the columns are flex widths. */}
    <div role="table" aria-label={ADMIN_COPY.operations.tabs.log}>
      <div
        role="row"
        style={{ display: 'flex', gap: 12, padding: '12px 18px' }}
      >
        <div role="columnheader" style={{ width: 80, ...MONO_HEAD }}>
          {COPY.columns.when}
        </div>
        <div role="columnheader" style={{ width: 130, ...MONO_HEAD }}>
          {COPY.columns.who}
        </div>
        <div role="columnheader" style={{ flex: 1, ...MONO_HEAD }}>
          {COPY.columns.what}
        </div>
        <div role="columnheader" style={{ width: 120, ...MONO_HEAD }}>
          {COPY.columns.where}
        </div>
      </div>
      {rows.map((item) => (
        <div
          key={item.id}
          role="row"
          data-testid="activity-log-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 18px',
            borderTop: BORDER,
          }}
        >
          <div role="cell" style={{ width: 80, minWidth: 0 }}>
            <span
              style={{
                fontSize: 12.5,
                color: 'var(--fg-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {logTime(item.createdAt)}
            </span>
          </div>
          <div
            role="cell"
            style={{
              width: 130,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Avatar item={item} size={24} />
            <span
              style={{
                minWidth: 0,
                fontSize: 13.5,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {actorLabel(item)}
            </span>
          </div>
          <div role="cell" style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>
            <What item={item} />
          </div>
          <div role="cell" style={{ width: 120, minWidth: 0, fontSize: 12.5 }}>
            <Where item={item} />
          </div>
        </div>
      ))}
    </div>
    <More rows={rows} phone={false} {...more} />
    {more.more ? null : nav.day === nav.today ? (
      <div
        style={{
          padding: '12px 18px',
          borderTop: BORDER,
          fontSize: 12.5,
          color: 'var(--fg-subtle)',
        }}
      >
        {COPY.footer}
      </div>
    ) : (
      <DayEnd {...nav} />
    )}
  </div>
);

/** `07/activity-log-mobile`, `37/log-m`: one card per change. */
const LogCards = ({
  rows,
  nav,
  ...more
}: { rows: AuditLogItem[]; nav: DayNav } & MoreProps) => (
  <div data-testid="activity-log-cards">
    {rows.map((item) => (
      <div
        key={item.id}
        data-testid="activity-log-card"
        style={{
          display: 'flex',
          gap: 10,
          padding: '12px 0',
          borderBottom: BORDER,
        }}
      >
        <Avatar item={item} size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>
            <What item={item} />
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--fg-subtle)',
              marginTop: 4,
              // A long handle breaks rather than pushing the card off a
              // 320px screen.
              overflowWrap: 'anywhere',
            }}
          >
            {actorLabel(item)} · {logTime(item.createdAt)} ·{' '}
            <Where item={item} />
          </div>
        </div>
      </div>
    ))}
    <More rows={rows} phone {...more} />
    {!more.more && nav.day !== nav.today && (
      <PhoneDayEnd day={nav.day} onDay={nav.onDay} />
    )}
  </div>
);

/** `07/activity-log-empty-day`; an earlier day names itself (🔸). */
const EmptyDay = ({ day, today }: { day: string; today: string }) => (
  <div
    data-testid="activity-log-empty"
    role="status"
    style={{
      margin: 'auto',
      padding: '22px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 10,
      maxWidth: 320,
    }}
  >
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 15,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: BORDER,
        background: 'var(--surface-1)',
        color: 'var(--signal)',
      }}
    >
      <List size={24} strokeWidth={1.7} aria-hidden />
    </div>
    <div style={{ fontSize: 17, fontWeight: 800 }}>
      {day === today
        ? COPY.emptyTitle
        : COPY.emptyDayTitle(fieldDate(day, false))}
    </div>
    <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--fg-muted)' }}>
      {COPY.emptyBody}
    </div>
  </div>
);

/**
 * A filter pill drawn as text: `37/log-day-picker-d` draws Anyone and Any page
 * idle. Their menus come with the next change (addendum 6 #37, PR B2).
 */
const staticPill: CSSProperties = { ...pill(false), cursor: 'default' };

const mtToday = () => localDateString(DENVER_TIME_ZONE);

interface Shown {
  rows: AuditLogItem[];
  nextCursor: string | null;
}

/**
 * The Activity log tab: one Mountain Time day of admin changes, newest first,
 * a page at a time (`37/*`). It opens on today; the stepper and the month
 * reach earlier days.
 */
export const ActivityLog = ({ isPhone }: { isPhone: boolean }) => {
  const { getToken } = useAuth();
  const [today, setToday] = useState(mtToday);
  const [day, setDay] = useState(today);
  const [shown, setShown] = useState<Shown | null>(null);
  const [failed, setFailed] = useState(false);
  const [moreState, setMoreState] = useState<LoadMoreState>('idle');

  // Only the newest read may write, and starting one stops the one before:
  // its controller is the current one until the next read or the unmount.
  const current = useRef<AbortController | null>(null);
  const query = useCallback((of: string): LogQuery => {
    const { start, end } = mtDayWindow(of);
    return { since: start, until: end };
  }, []);

  const load = useCallback(async () => {
    current.current?.abort();
    const mine = new AbortController();
    current.current = mine;
    setFailed(false);
    setShown(null);
    setMoreState('idle');
    try {
      const page = await readLogPage(getToken, query(day), null, mine.signal);
      if (mine !== current.current) return;
      setShown(page);
    } catch {
      // An aborted read (an unmount, or a newer day) is not a failure.
      if (mine !== current.current || mine.signal.aborted) return;
      setFailed(true);
    }
  }, [getToken, query, day]);

  useEffect(() => {
    void load();
    return () => current.current?.abort();
  }, [load]);

  // Held in a ref, not read from state: two quick presses inside one render
  // would otherwise both read the same cursor and draw its page twice.
  const moreBusy = useRef(false);
  const loadMore = async () => {
    const from = shown?.nextCursor;
    const mine = current.current;
    if (!from || !mine || moreBusy.current) return;
    moreBusy.current = true;
    setMoreState('loading');
    try {
      const page = await readLogPage(getToken, query(day), from, mine.signal);
      if (mine !== current.current) return;
      // A failed page keeps the rows already shown; Load more says so.
      setShown((was) =>
        was
          ? { rows: [...was.rows, ...page.rows], nextCursor: page.nextCursor }
          : was,
      );
      setMoreState('idle');
    } catch {
      if (mine !== current.current || mine.signal.aborted) return;
      setMoreState('failed');
    } finally {
      if (mine === current.current) moreBusy.current = false;
    }
  };
  // A new day's read drops any Load more still running for the old one.
  useEffect(() => {
    moreBusy.current = false;
  }, [load]);

  // Midnight passing, whether the tab sat open or hidden: a view of today
  // moves to the new today; an earlier day stays put, with › reaching one
  // more day. Checked on return to the tab and once a minute.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      const now = mtToday();
      if (now === today) return;
      setToday(now);
      if (day === today) setDay(now);
    };
    const timer = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [day, today]);

  const readDays = useCallback(
    (month: string, signal: AbortSignal) =>
      readLogDays(getToken, month, {}, signal),
    [getToken],
  );
  const pickDay = (next: string) => {
    if (next <= today) setDay(next);
  };
  const nav: DayNav = { day, today, onDay: pickDay };
  const more: MoreProps = {
    more: shown?.nextCursor != null,
    moreState,
    onLoadMore: () => void loadMore(),
  };
  const rows = shown?.rows ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isPhone ? (
        <PhoneDayStepper day={day} today={today} onDay={pickDay} />
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Text, not controls, so they carry no group role or label. */}
          <span style={staticPill}>{COPY.anyone}</span>
          <span style={staticPill}>{COPY.anyPage}</span>
          <span style={{ flex: 1 }} />
          <DayStepper
            day={day}
            today={today}
            onDay={pickDay}
            readDays={readDays}
          />
        </div>
      )}
      {failed ? (
        <CouldntLoad
          page={ADMIN_COPY.operations.tabs.log}
          onRetry={() => void load()}
        />
      ) : rows === null ? (
        <ActivityLogRowsSkeleton />
      ) : rows.length === 0 ? (
        <EmptyDay day={day} today={today} />
      ) : isPhone ? (
        <LogCards rows={rows} nav={nav} {...more} />
      ) : (
        <LogTable rows={rows} nav={nav} {...more} />
      )}
    </div>
  );
};
