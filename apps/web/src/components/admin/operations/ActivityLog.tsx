'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { List } from 'lucide-react';
import type { AuditLogItem } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { CouldntLoad, PersonAvatar } from '@/components/admin/primitives';
import { pill } from '@/components/admin/crawl-runs/RunsList';
import { mtTodayWindow } from '@/components/admin/health/health-model';
import { readLogDay, type LogDay } from './activity-api';
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

const Avatar = ({ item, size }: { item: AuditLogItem; size: number }) => (
  <PersonAvatar
    initialOf={actorLabel(item).replace(/^@/, '')}
    avatarColor={null}
    avatarSecondColor={null}
    size={size}
    initialSize={size === 24 ? 10 : 11}
  />
);

const Where = ({ item }: { item: AuditLogItem }) => (
  <span style={{ color: 'var(--signal)' }}>
    {item.area ? AREA_LABELS[item.area] : COPY.noPage}
  </span>
);

/** `07/activity-log`: the desktop table. */
const LogTable = ({ rows }: { rows: AuditLogItem[] }) => (
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
  </div>
);

/** `07/activity-log-mobile`: one card per change. */
const LogCards = ({ rows }: { rows: AuditLogItem[] }) => (
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
            style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 4 }}
          >
            {actorLabel(item)} · {logTime(item.createdAt)} ·{' '}
            <Where item={item} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/** `07/activity-log-empty-day`. */
const EmptyDay = () => (
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
    {/* The board's body names a day picker that isn't built, so it waits. */}
    <div style={{ fontSize: 17, fontWeight: 800 }}>{COPY.emptyTitle}</div>
  </div>
);

/**
 * A filter pill drawn as text (`07/activity-log`): the board draws Anyone and
 * Today highlighted and Any page not. No menu is drawn for any of them, and
 * the drawn filter popover (`06/venue-filter`, `FilterPicker`) is a
 * multi-select with per-option counts this log has no source for, so they
 * stay static until a menu is drawn.
 */
const staticPill = (on: boolean): CSSProperties => ({
  ...pill(on),
  cursor: 'default',
});

/**
 * The Activity log tab: today's admin changes (Mountain Time), newest first.
 * The day is read whole, up to the cap, so there is no Load more and no day
 * picker (Design item 37).
 */
export const ActivityLog = ({ isPhone }: { isPhone: boolean }) => {
  const { getToken } = useAuth();
  const [day, setDay] = useState<LogDay | null>(null);
  const [failed, setFailed] = useState(false);

  // Only the newest read may write, and starting one stops the one before:
  // its controller is the current one until the next read or the unmount.
  const current = useRef<AbortController | null>(null);
  // The start of the Mountain Time day on screen, to tell when it has passed.
  const shownDayStart = useRef<number | null>(null);
  const load = useCallback(async () => {
    current.current?.abort();
    const mine = new AbortController();
    current.current = mine;
    setFailed(false);
    setDay(null);
    try {
      const today = mtTodayWindow(new Date());
      shownDayStart.current = today.start;
      const next = await readLogDay(
        getToken,
        { since: today.start, until: today.end },
        mine.signal,
      );
      if (mine !== current.current) return;
      setDay(next);
    } catch {
      // An aborted walk (an unmount, or a newer read) is not a failure.
      if (mine !== current.current || mine.signal.aborted) return;
      // A failed page drops the rows read before it, on purpose: the log is
      // all or nothing for a day, never a partial day that looks whole.
      setFailed(true);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
    return () => current.current?.abort();
  }, [load]);

  // A tab left open overnight shows yesterday: read the new day on return.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (shownDayStart.current === null) return;
      if (mtTodayWindow(new Date()).start === shownDayStart.current) return;
      void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const rows = day?.rows ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* `07/activity-log-mobile` draws no filter pills. They are text, not
          controls, so they carry no group role or label. */}
      {!isPhone && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={staticPill(true)}>{COPY.anyone}</span>
          <span style={staticPill(false)}>{COPY.anyPage}</span>
          {/* The day is always today until a day picker is drawn. */}
          <span style={staticPill(true)}>{COPY.today}</span>
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
        <EmptyDay />
      ) : (
        <>
          {day?.truncated && (
            <p
              data-testid="activity-log-capped"
              style={{ margin: 0, fontSize: 12.5, color: 'var(--fg-subtle)' }}
            >
              {COPY.capped}
            </p>
          )}
          {isPhone ? <LogCards rows={rows} /> : <LogTable rows={rows} />}
        </>
      )}
    </div>
  );
};
