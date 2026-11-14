'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Plus, Users } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  CouldntLoad,
  EmptyState,
  SaveFailedToast,
  StatusBadge,
  useIsPhone,
} from '@/components/admin/primitives';
import {
  inviteStatus,
  MAX_SEATS,
  seatsTaken,
  type InviteStatus,
} from '@/lib/poster/poster-rule';
import { postersHref } from '@/lib/poster/posters-href';
import {
  codesApi,
  isAdminCode,
  type CodeEdit,
  type ListedCode,
  type ListedInviteCode,
} from './codes-api';
import { PeopleTabs } from '../people/PeopleTabs';
import {
  STATUS_KIND,
  codeActions,
  codeLabel,
  countPosters,
  isEnded,
  makerName,
  seatCap,
  shortDate,
  type CodeAction,
} from './code-rules';
import { MONO } from './code-styles';
import { InviteCodesRowsSkeleton } from './InviteCodesSkeleton';
import { RowMenu, type RowMenuItem } from '@/components/admin/primitives';
import { MENU_ICONS } from './code-menu-icons';
import { CodePanel } from './CodePanel';
import { EditCodePanel } from './EditCodePanel';
import { NewCodePanel } from './NewCodePanel';
import { ReactivateConfirm, RevokeConfirm } from './CodeConfirms';
import { SeatsBar } from './SeatsBar';

const COPY = ADMIN_COPY.codesPage;

type Open =
  | { kind: 'new' }
  | { kind: 'code' | 'revoke' | 'reactivate'; id: string }
  | { kind: 'edit'; id: string; focusSeats: boolean };

interface Failure {
  code: string;
  /** What is still saved, e.g. "REDROCKS is still active." */
  saved: string;
  retry: () => void;
}

const failureFor = (row: ListedInviteCode, retry: () => void): Failure => ({
  code: row.code,
  saved: COPY.form.stillStatus(
    row.code,
    COPY.status[inviteStatus(row, new Date())],
  ),
  retry,
});

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

/**
 * 5b Invite codes (`07/invite-codes`, `07/invite-codes-mobile`): the list,
 * its ⋯ menus, and the panels they open.
 */
export function InviteCodesClient({ origin }: { origin: string }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const isPhone = useIsPhone();
  const api = useMemo(() => codesApi(getToken), [getToken]);
  const [codes, setCodes] = useState<ListedInviteCode[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [people, setPeople] = useState<number | null>(null);
  const [open, setOpen] = useState<Open | null>(null);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  // One revoke or reactivate at a time; a double click must not post twice.
  const ending = useRef(false);
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

  const replace = (row: ListedInviteCode) =>
    setCodes((rows) =>
      rows ? rows.map((each) => (each.id === row.id ? row : each)) : rows,
    );

  const copyLink = (code: ListedInviteCode) => {
    const note = (text: string) => {
      setCopyNote(text);
      setTimeout(() => setCopyNote(null), 2000);
    };
    // `/i/<CODE>` is the typed short link; the proxy sends either case on.
    const write = navigator.clipboard?.writeText(`${origin}/i/${code.code}`);
    if (!write) {
      note(COPY.menu.copyFailed);
      return;
    }
    write.then(
      () => note(COPY.menu.copied),
      () => note(COPY.menu.copyFailed),
    );
  };

  // A failed save snaps the row back and says so (rule 10).
  const saveEdit = async (row: ListedInviteCode, edit: CodeEdit) => {
    setOpen(null);
    setFailure(null);
    replace({ ...row, ...edit });
    try {
      replace({ ...row, ...(await api.edit(row.id, edit)) });
    } catch {
      replace(row);
      setFailure(failureFor(row, () => void saveEdit(row, edit)));
      // A refusal (409) usually means the code changed elsewhere.
      void load();
    }
  };

  // A failed change says so, with Try again (rule 10), and reloads the list,
  // since a refusal (409) usually means the code changed elsewhere.
  const runEnding = async (
    row: ListedInviteCode,
    action: () => Promise<ListedCode>,
  ) => {
    if (ending.current) return;
    ending.current = true;
    setPending(true);
    setFailure(null);
    try {
      replace({ ...row, ...(await action()) });
      setOpen(null);
    } catch {
      setOpen(null);
      setFailure(failureFor(row, () => void runEnding(row, action)));
      void load();
    } finally {
      ending.current = false;
      setPending(false);
    }
  };

  const menuItems = (
    row: ListedInviteCode,
    status: InviteStatus,
  ): RowMenuItem[] => {
    const host = origin.replace(/^https?:\/\//, '');
    const joined = seatsTaken(row);
    // Which items show is `codeActions`' call; this only draws them.
    const items: Record<CodeAction, RowMenuItem> = {
      copy: {
        key: 'copy',
        icon: MENU_ICONS.copy,
        label: COPY.menu.copyLink,
        hint: isEnded(status)
          ? COPY.menu.copyLinkEnded
          : `${host}/i/${row.code}`,
        onSelect: () => copyLink(row),
      },
      poster: {
        key: 'poster',
        icon: MENU_ICONS.poster,
        label: COPY.menu.makePoster,
        hint: COPY.menu.makePosterHint,
        onSelect: () => router.push(postersHref({ code: row.id })),
      },
      joined: {
        key: 'joined',
        icon: MENU_ICONS.joined,
        label: COPY.menu.seeWhoJoined,
        hint: COPY.menu.seeWhoJoinedHint(joined),
        onSelect: () => setOpen({ kind: 'code', id: row.id }),
      },
      edit: {
        key: 'edit',
        icon: MENU_ICONS.edit,
        label: COPY.menu.edit,
        hint: COPY.menu.editHint,
        onSelect: () =>
          setOpen({ kind: 'edit', id: row.id, focusSeats: false }),
      },
      revoke: {
        key: 'revoke',
        icon: MENU_ICONS.revoke,
        label: COPY.menu.revoke,
        hint: COPY.menu.revokeHint,
        danger: true,
        divided: true,
        onSelect: () => setOpen({ kind: 'revoke', id: row.id }),
      },
      reactivate: {
        key: 'reactivate',
        icon: MENU_ICONS.reactivate,
        label: COPY.menu.reactivate,
        hint: COPY.menu.reactivateHint,
        onSelect: () => setOpen({ kind: 'reactivate', id: row.id }),
      },
    };
    return codeActions(row, status).map((action) => items[action]);
  };

  const rows = (codes ?? []).map((row) => ({
    row,
    status: inviteStatus(row, now),
  }));
  const openRow =
    open && open.kind !== 'new'
      ? codes?.find((row) => row.id === open.id)
      : undefined;

  const newButton = (
    <AdminButton
      type="button"
      icon={Plus}
      fullWidth={isPhone}
      variant="gradient"
      onClick={() => setOpen({ kind: 'new' })}
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
    body = <InviteCodesRowsSkeleton />;
  } else if (codes.length === 0) {
    body = (
      <EmptyState
        icon={Users}
        title={COPY.empty.title}
        body={COPY.empty.body(MAX_SEATS)}
        action={
          <AdminButton
            type="button"
            variant="gradient"
            onClick={() => setOpen({ kind: 'new' })}
          >
            {COPY.newCode}
          </AdminButton>
        }
      />
    );
  } else if (isPhone) {
    body = (
      <ul
        data-testid="invite-codes-list"
        aria-label={COPY.tabs.codes}
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
      >
        {rows.map(({ row, status }) => (
          <li key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setOpen({ kind: 'code', id: row.id })}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                width: '100%',
                padding: '12px 0',
                border: 'none',
                background: 'transparent',
                color: 'var(--fg)',
                textAlign: 'left',
                cursor: 'pointer',
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
                  max={seatCap(row)}
                  full={status === 'full'}
                  width={120}
                />
                <span style={{ flex: 1 }} />
                <StatusChip status={status} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <div
        data-testid="invite-codes-list"
        style={{
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
        }}
      >
        {/* Between the phone breakpoint and ~960px the fixed columns
            don't fit beside the sidebar, so the table scrolls in its card. */}
        <div style={{ overflowX: 'auto' }}>
          <table
            aria-label={COPY.tabs.codes}
            style={{
              width: '100%',
              minWidth: 680,
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
                <th style={{ ...COLUMN_HEAD, width: 90 }}>
                  {COPY.columns.madeBy}
                </th>
                <th
                  style={{ ...COLUMN_HEAD, width: 20, paddingRight: 18 }}
                  aria-label={COPY.menu.columnLabel}
                />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ row, status }) => (
                <tr
                  key={row.id}
                  style={{ borderTop: '1px solid var(--border)' }}
                >
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
                      max={seatCap(row)}
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
                  <td style={{ ...CELL, paddingRight: 18 }}>
                    <RowMenu
                      label={COPY.menu.trigger(row.code)}
                      items={menuItems(row, status)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      {/* On the phone the shell's top bar carries the page title, as the
          mobile board draws it, so the page doesn't repeat it. */}
      {!isPhone && (
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
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: '-0.02em',
              }}
            >
              {COPY.title}
            </h1>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 13.5,
                color: 'var(--fg-muted)',
              }}
            >
              {COPY.subtitle}
            </p>
          </div>
          {newButton}
        </div>
      )}
      <PeopleTabs
        active="codes"
        isPhone={isPhone}
        counts={{
          people,
          codes: codes?.length ?? null,
          posters: codes ? countPosters(codes, now) : null,
        }}
      />
      {isPhone && newButton}
      {failure && (
        <SaveFailedToast
          what={failure.code}
          saved={failure.saved}
          retrying={pending}
          onRetry={failure.retry}
        />
      )}
      <div
        role="status"
        aria-live="polite"
        style={{
          fontSize: 12.5,
          color:
            copyNote === COPY.menu.copyFailed
              ? 'var(--danger)'
              : 'var(--success)',
        }}
      >
        {copyNote}
      </div>
      {body}

      {open?.kind === 'new' && (
        <NewCodePanel
          create={api.create}
          onClose={() => setOpen(null)}
          onCreated={(made, posterNext) => {
            setOpen(null);
            if (posterNext) router.push(postersHref({ code: made.id }));
            else void load();
          }}
        />
      )}
      {openRow && open?.kind === 'code' && (
        <CodePanel
          code={openRow}
          status={inviteStatus(openRow, now)}
          api={api}
          onCopy={() => copyLink(openRow)}
          // A read-only code (a member's, or an unknown kind) takes no seats.
          onAddSeats={
            isAdminCode(openRow)
              ? () =>
                  setOpen({ kind: 'edit', id: openRow.id, focusSeats: true })
              : undefined
          }
          onRevoke={() => setOpen({ kind: 'revoke', id: openRow.id })}
          onReactivate={() => setOpen({ kind: 'reactivate', id: openRow.id })}
          onClose={() => setOpen(null)}
        />
      )}
      {/* Edit and Reactivate are an admin code's only: never mounted for a
          read-only one, whatever opened them. */}
      {openRow && isAdminCode(openRow) && open?.kind === 'edit' && (
        <EditCodePanel
          code={openRow}
          now={now}
          focusSeats={open.focusSeats}
          onSave={(edit) => void saveEdit(openRow, edit)}
          onClose={() => setOpen(null)}
        />
      )}
      {openRow && open?.kind === 'revoke' && (
        <RevokeConfirm
          code={openRow}
          pending={pending}
          onCancel={() => setOpen(null)}
          onConfirm={() =>
            void runEnding(openRow, () => api.revoke(openRow.id))
          }
        />
      )}
      {openRow && isAdminCode(openRow) && open?.kind === 'reactivate' && (
        <ReactivateConfirm
          code={openRow}
          now={now}
          pending={pending}
          onCancel={() => setOpen(null)}
          onConfirm={(expiresAt) =>
            void runEnding(openRow, () => api.reactivate(openRow.id, expiresAt))
          }
        />
      )}
    </div>
  );
}
