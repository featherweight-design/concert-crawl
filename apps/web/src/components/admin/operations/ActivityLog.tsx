'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { List } from 'lucide-react';
import {
  AUDIT_AREAS,
  type AuditArea,
  type AuditLogItem,
} from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { CouldntLoad, PersonAvatar } from '@/components/admin/primitives';
import { pill } from '@/components/admin/crawl-runs/RunsList';
import { mtTodayWindow } from '@/components/admin/health/health-model';
import { readLogDay } from './activity-api';
import {
  AREA_LABELS,
  actorLabel,
  logTime,
  sentenceFor,
} from './activity-sentences';
import { ActivityLogRowsSkeleton } from './ActivityLogSkeleton';

const COPY = ADMIN_COPY.operations.log;

const isArea = (value: string): value is AuditArea =>
  AUDIT_AREAS.some((area) => area === value);

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
    <div style={{ display: 'flex', gap: 12, padding: '12px 18px' }}>
      <div style={{ width: 80, ...MONO_HEAD }}>{COPY.columns.when}</div>
      <div style={{ width: 130, ...MONO_HEAD }}>{COPY.columns.who}</div>
      <div style={{ flex: 1, ...MONO_HEAD }}>{COPY.columns.what}</div>
      <div style={{ width: 120, ...MONO_HEAD }}>{COPY.columns.where}</div>
    </div>
    {rows.map((item) => (
      <div
        key={item.id}
        data-testid="activity-log-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 18px',
          borderTop: BORDER,
        }}
      >
        <div style={{ width: 80, minWidth: 0 }}>
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
        <div style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>
          <What item={item} />
        </div>
        <div style={{ width: 120, minWidth: 0, fontSize: 12.5 }}>
          <Where item={item} />
        </div>
      </div>
    ))}
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
    <div style={{ fontSize: 17, fontWeight: 800 }}>{COPY.emptyTitle}</div>
    <div style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
      {COPY.emptyBody}
    </div>
  </div>
);

const selectStyle = (on: boolean): CSSProperties => ({
  ...pill(on),
  appearance: 'none',
  WebkitAppearance: 'none',
});

/**
 * The Activity log tab: today's admin changes (Mountain Time), newest first.
 * The day is read whole, up to the cap, so there is no Load more and no day
 * picker (Design item 37). The filters re-read the day from the API.
 */
export const ActivityLog = ({ isPhone }: { isPhone: boolean }) => {
  const { getToken } = useAuth();
  const [handle, setHandle] = useState('');
  const [area, setArea] = useState<AuditArea | ''>('');
  const [rows, setRows] = useState<AuditLogItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Anyone's choices: the admins seen today, kept while a filter narrows it.
  const [handles, setHandles] = useState<string[]>([]);

  // Only the newest read may write: a slow older one must not overwrite it.
  const latest = useRef(0);
  const load = useCallback(async () => {
    const mine = ++latest.current;
    setFailed(false);
    setRows(null);
    try {
      const day = mtTodayWindow(new Date());
      const next = await readLogDay(getToken, {
        since: day.start,
        until: day.end,
        ...(handle ? { actorHandle: handle } : {}),
        ...(area ? { area } : {}),
      });
      if (mine !== latest.current) return;
      setRows(next);
      if (!handle) {
        const seen = next
          .filter((item) => item.actorKind === 'admin')
          .map((item) => item.actor)
          .filter((actor) => !actor.includes(' '));
        setHandles([...new Set(seen)].sort());
      }
    } catch {
      if (mine === latest.current) setFailed(true);
    }
  }, [getToken, handle, area]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleChoices = useMemo(
    () =>
      handle && !handles.includes(handle) ? [...handles, handle] : handles,
    [handle, handles],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* `07/activity-log-mobile` draws no filter pills. */}
      {!isPhone && (
        <div
          role="group"
          aria-label={COPY.filtersLabel}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
        >
          <select
            aria-label={COPY.whoLabel}
            value={handle}
            onChange={(evt) => setHandle(evt.target.value)}
            style={selectStyle(handle !== '')}
          >
            <option value="">{COPY.anyone}</option>
            {handleChoices.map((choice) => (
              <option key={choice} value={choice}>
                @{choice}
              </option>
            ))}
          </select>
          <select
            aria-label={COPY.whereLabel}
            value={area}
            onChange={(evt) => {
              const next = evt.target.value;
              setArea(isArea(next) ? next : '');
            }}
            style={selectStyle(area !== '')}
          >
            <option value="">{COPY.anyPage}</option>
            {AUDIT_AREAS.map((key) => (
              <option key={key} value={key}>
                {AREA_LABELS[key]}
              </option>
            ))}
          </select>
          {/* The day is always today until a day picker is drawn. */}
          <span style={pill(true)}>{COPY.today}</span>
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
      ) : isPhone ? (
        <LogCards rows={rows} />
      ) : (
        <LogTable rows={rows} />
      )}
    </div>
  );
};
