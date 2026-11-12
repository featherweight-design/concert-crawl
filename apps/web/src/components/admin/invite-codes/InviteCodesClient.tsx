'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Plus, Ticket } from 'lucide-react';
import type { AdminInviteCode } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  CouldntLoad,
  EmptyState,
  PageSkeleton,
  StatusBadge,
  useIsPhone,
} from '@/components/admin/primitives';
import {
  inviteStatus,
  seatsTaken,
  type InviteStatus,
} from '@/lib/poster/poster-rule';
import { postersHref } from '@/lib/poster/posters-href';
import { codesApi } from './codes-api';
import { STATUS_KIND, codeLabel, makerName, shortDate } from './code-rules';
import { MONO } from './code-styles';
import { SeatsBar } from './SeatsBar';

const COPY = ADMIN_COPY.codesPage;

const COLUMN_HEAD = {
  ...MONO,
  fontSize: 10,
  letterSpacing: '0.14em',
  color: 'var(--fg-subtle)',
  textAlign: 'left',
  padding: '12px 6px',
} as const;

const CELL = {
  padding: '10px 6px',
  fontSize: 12.5,
  color: 'var(--fg-muted)',
  whiteSpace: 'nowrap',
} as const;

const StatusChip = ({ status }: { status: InviteStatus }) => (
  <StatusBadge kind={STATUS_KIND[status]} dot>
    {COPY.status[status]}
  </StatusBadge>
);

const Count = ({ value }: { value: number | null }) =>
  value == null ? null : (
    <span style={{ fontSize: 12, color: 'var(--fg-subtle)', marginLeft: 6 }}>
      {value}
    </span>
  );

/** People, Invite codes, Posters: underline tabs, or the phone's segments. */
const Tabs = ({
  isPhone,
  counts,
}: {
  isPhone: boolean;
  counts: {
    people: number | null;
    codes: number | null;
    posters: number | null;
  };
}) => {
  const tabs = [
    {
      key: 'people',
      href: '/admin/users',
      label: COPY.tabs.people,
      count: counts.people,
    },
    {
      key: 'codes',
      href: '/admin/invite-codes',
      label: isPhone ? COPY.tabs.codesShort : COPY.tabs.codes,
      count: counts.codes,
    },
    {
      key: 'posters',
      href: postersHref(),
      label: COPY.tabs.posters,
      count: counts.posters,
    },
  ];
  return (
    <nav
      aria-label={COPY.tabs.label}
      style={
        isPhone
          ? {
              display: 'flex',
              padding: 3,
              borderRadius: 10,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }
          : { display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }
      }
    >
      {tabs.map((tab) => {
        const on = tab.key === 'codes';
        return (
          <Link
            key={tab.key}
            href={tab.href}
            prefetch={false}
            aria-current={on ? 'page' : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              color: on ? 'var(--fg)' : 'var(--fg-muted)',
              ...(isPhone
                ? {
                    flex: 1,
                    height: 32,
                    borderRadius: 7,
                    fontSize: 12.5,
                    background: on ? 'var(--bg-elevated)' : 'transparent',
                  }
                : {
                    height: 40,
                    padding: '0 14px',
                    fontSize: 14,
                    borderBottom: `2px solid ${on ? 'var(--signal)' : 'transparent'}`,
                  }),
            }}
          >
            {tab.label}
            <Count value={tab.count} />
          </Link>
        );
      })}
    </nav>
  );
};

/**
 * 5b Invite codes (`07/invite-codes`, `07/invite-codes-mobile`): the list.
 * The row menus, the code panel and New code land in the next two PRs.
 */
export function InviteCodesClient() {
  const { getToken } = useAuth();
  const isPhone = useIsPhone();
  const api = useMemo(() => codesApi(getToken), [getToken]);
  const [codes, setCodes] = useState<AdminInviteCode[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [people, setPeople] = useState<number | null>(null);
  const now = new Date();

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      // Newest first, as the board lists them.
      setCodes((await api.list()).reverse());
    } catch {
      setLoadFailed(true);
    }
  }, [api]);

  useEffect(() => {
    void load();
    api
      .peopleTotal()
      .then(setPeople)
      // The People count is a nicety; the tab still links without it.
      .catch(() => undefined);
  }, [api, load]);

  const rows = (codes ?? []).map((row) => ({
    row,
    status: inviteStatus(row, now),
  }));
  const posters = rows.filter(
    ({ row, status }) =>
      row.maxUses > 1 && (status === 'active' || status === 'full'),
  ).length;

  const newButton = (
    <AdminButton
      type="button"
      icon={Plus}
      fullWidth={isPhone}
      variant="gradient"
      style={{
        height: isPhone ? 42 : 36,
        fontSize: isPhone ? 14 : 13,
        borderRadius: 9,
      }}
    >
      {COPY.newCode}
    </AdminButton>
  );

  let body;
  if (loadFailed) {
    body = <CouldntLoad page={COPY.tabs.codes} onRetry={() => void load()} />;
  } else if (codes == null) {
    body = <PageSkeleton columns={6} rows={7} rowHeight={isPhone ? 92 : 57} />;
  } else if (codes.length === 0) {
    body = (
      <EmptyState
        icon={Ticket}
        title={COPY.empty.title}
        body={COPY.empty.body}
        action={
          <AdminButton type="button" icon={Plus} variant="gradient">
            {COPY.newCode}
          </AdminButton>
        }
      />
    );
  } else if (isPhone) {
    body = (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map(({ row, status }) => (
          <li
            key={row.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 7,
              padding: '12px 0',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...MONO, fontSize: 13 }}>{row.code}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>
                {COPY.expiresOn(
                  row.expiresAt ? shortDate(row.expiresAt) : null,
                )}
              </span>
            </span>
            {codeLabel(row) && (
              <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
                {codeLabel(row)}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SeatsBar
                used={seatsTaken(row)}
                max={row.maxUses}
                full={status === 'full'}
                width={120}
              />
              <span style={{ flex: 1 }} />
              <StatusChip status={status} />
            </span>
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <div
        style={{
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr>
              <th style={{ ...COLUMN_HEAD, paddingLeft: 18 }}>
                {COPY.columns.code}
              </th>
              <th style={{ ...COLUMN_HEAD, width: 190 }}>
                {COPY.columns.seats}
              </th>
              <th style={{ ...COLUMN_HEAD, width: 90 }}>
                {COPY.columns.expires}
              </th>
              <th style={{ ...COLUMN_HEAD, width: 96 }}>
                {COPY.columns.status}
              </th>
              <th style={{ ...COLUMN_HEAD, width: 110 }}>
                {COPY.columns.madeBy}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row, status }) => (
              <tr key={row.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td
                  style={{
                    ...CELL,
                    paddingLeft: 18,
                    color: 'var(--fg)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ ...MONO, fontSize: 13 }}>{row.code}</div>
                  {codeLabel(row) && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--fg-muted)',
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {codeLabel(row)}
                    </div>
                  )}
                </td>
                <td style={CELL}>
                  <SeatsBar
                    used={seatsTaken(row)}
                    max={row.maxUses}
                    full={status === 'full'}
                  />
                </td>
                <td style={CELL}>
                  {row.expiresAt ? shortDate(row.expiresAt) : COPY.never}
                </td>
                <td style={CELL}>
                  <StatusChip status={status} />
                </td>
                <td
                  style={{
                    ...CELL,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {makerName(row)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            fontSize: 12.5,
            color: 'var(--fg-subtle)',
          }}
        >
          {COPY.footer}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isPhone ? 10 : 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: isPhone ? 24 : 26,
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            {COPY.title}
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: isPhone ? 12.5 : 13.5,
              color: 'var(--fg-muted)',
            }}
          >
            {isPhone ? COPY.tabs.codes : COPY.subtitle}
          </p>
        </div>
        {!isPhone && newButton}
      </div>
      <Tabs
        isPhone={isPhone}
        counts={{
          people,
          codes: codes?.length ?? null,
          posters: codes ? posters : null,
        }}
      />
      {isPhone && newButton}
      {body}
    </div>
  );
}
