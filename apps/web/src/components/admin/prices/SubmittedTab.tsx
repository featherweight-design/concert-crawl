'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Calendar, ExternalLink, Search, Tag, Users, X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  CouldntLoad,
  EmptyState,
  PageSkeleton,
  PersonAvatar,
  RowMenu,
  useIsPhone,
  type RowMenuItem,
} from '@/components/admin/primitives';
import { editEventHref } from '@/lib/admin/edit-event-link';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';
import { refusedStatus } from '../invite-codes/codes-api';
import { EditPricePanel } from './EditPricePanel';
import { RejectPriceDialog } from './RejectPriceDialog';
import {
  submittedApi,
  type StateCounts,
  type SubmittedRow,
} from './submitted-api';
import {
  STATE_FILTERS,
  backedPill,
  priceRange,
  type BackedTone,
  type RejectionReason,
  type StateFilter,
  type SubmissionState,
} from './submitted-rules';

const COPY = ADMIN_COPY.pricesSubmitted;
const PAGE = 50;

const TONES: Record<
  BackedTone | 'pink',
  { fg: string; bg: string; border: string }
> = {
  green: {
    fg: 'var(--success)',
    bg: 'color-mix(in srgb, var(--success) 14%, transparent)',
    border: 'color-mix(in srgb, var(--success) 32%, transparent)',
  },
  amber: {
    fg: 'var(--warning)',
    bg: 'color-mix(in srgb, var(--warning) 14%, transparent)',
    border: 'color-mix(in srgb, var(--warning) 32%, transparent)',
  },
  red: {
    fg: 'var(--danger-fg)',
    bg: 'color-mix(in srgb, var(--danger) 14%, transparent)',
    border: 'color-mix(in srgb, var(--danger) 32%, transparent)',
  },
  pink: {
    fg: 'var(--accent)',
    bg: 'color-mix(in srgb, var(--accent) 14%, transparent)',
    border: 'color-mix(in srgb, var(--accent) 32%, transparent)',
  },
};

// The phone's state pill, one tone per state (Price check pink as drawn).
const PHONE_TONE: Record<SubmissionState, BackedTone | 'pink'> = {
  published: 'green',
  waiting: 'amber',
  'price-check': 'pink',
  'not-used': 'red',
  stale: 'amber',
};

const Pill = ({
  tone,
  children,
}: {
  tone: BackedTone | 'pink';
  children: string;
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 22,
      padding: '0 9px',
      borderRadius: 999,
      fontSize: 11.5,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      color: TONES[tone].fg,
      background: TONES[tone].bg,
      border: `1px solid ${TONES[tone].border}`,
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: TONES[tone].fg,
      }}
    />
    {children}
  </span>
);

const chipStyle = (on: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  height: 32,
  padding: '0 12px',
  flex: 'none',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  color: on ? 'var(--fg)' : 'var(--fg-muted)',
  border: on ? '1px solid transparent' : '1px solid var(--border)',
  background: on
    ? 'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box'
    : 'color-mix(in srgb, var(--bg-elevated) 60%, transparent)',
});

const dayOf = (date: string | null): string => {
  const match = date === null ? null : /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return '';
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12))
    .toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    .replace(',', '');
};

const countOf = (
  counts: StateCounts | null,
  filter: StateFilter,
): number | null =>
  counts === null
    ? null
    : filter === 'price-check'
      ? counts.priceCheck
      : counts[filter];

/**
 * The Submitted prices tab (`06/prices-submitted-prices`, `submitted-prices-mobile`):
 * filter chips with counts, a search over shows and people, the list with a row
 * menu on a desktop, and Reject for a price that is waiting for you.
 */
export const SubmittedTab = () => {
  const { getToken } = useAuth();
  const router = useRouter();
  const isPhone = useIsPhone();
  const api = useMemo(() => submittedApi(getToken), [getToken]);

  const [filter, setFilter] = useState<StateFilter>('all');
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<SubmittedRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<StateCounts | null>(null);
  const [loaded, setLoaded] = useState(false);
  // A load is in flight: the rows on screen are the previous filter's.
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [more, setMore] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [rejecting, setRejecting] = useState<SubmittedRow | null>(null);
  const [editing, setEditing] = useState<SubmittedRow | null>(null);
  // "This fan's other prices" (4d#12): the list narrowed to one fan on the
  // whole handle, shown as a chip rather than typed into the search box.
  const [fan, setFan] = useState<string | null>(null);
  // Whose prices `counts` were counted over, so the chip never shows another
  // load's figure.
  const [countsFan, setCountsFan] = useState<string | null>(null);

  // The search waits for a pause in typing. A typed search replaces the fan
  // filter at the same moment, so the swap is one reload, not two.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = typed.trim();
      setSearch(next);
      if (next !== '') setFan(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [typed]);

  // Only the newest load may write.
  const latest = useRef(0);
  const load = useCallback(async () => {
    const mine = ++latest.current;
    setBusy(true);
    setMore('idle');
    try {
      const [list, nextCounts] = await Promise.all([
        api.list(filter, search, 0, PAGE, fan),
        api.counts(search, fan),
      ]);
      if (mine !== latest.current) return;
      setRows(list.rows);
      setTotal(list.total);
      setCounts(nextCounts);
      setCountsFan(fan);
      setFailed(false);
      setLoaded(true);
      setBusy(false);
    } catch {
      if (mine === latest.current) {
        setFailed(true);
        setBusy(false);
      }
    }
  }, [api, filter, search, fan]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    // A filter or search change while this runs makes its answer stale.
    const mine = latest.current;
    setMore('loading');
    try {
      const list = await api.list(filter, search, rows.length, PAGE, fan);
      if (mine !== latest.current) return;
      const seen = new Set(rows.map((row) => row.id));
      setRows([...rows, ...list.rows.filter((row) => !seen.has(row.id))]);
      setTotal(list.total);
      setMore('idle');
    } catch {
      if (mine === latest.current) setMore('failed');
    }
  };

  const reject = async (
    row: SubmittedRow,
    reason: RejectionReason,
    note: string,
  ): Promise<string | null> => {
    try {
      await api.reject(row.id, reason, note);
    } catch (err) {
      return refusedStatus(err) === 409
        ? COPY.reject.notWaiting
        : COPY.reject.failed;
    }
    setRejecting(null);
    void load();
    return null;
  };

  const edit = async (
    row: SubmittedRow,
    priceMin: string,
    priceMax: string | null,
  ): Promise<string | null> => {
    try {
      await api.editPrice(row.id, priceMin, priceMax);
    } catch (err) {
      const status = refusedStatus(err);
      return status === 409 || status === 404
        ? ADMIN_COPY.pricesSubmitted.edit.notEditable
        : ADMIN_COPY.pricesSubmitted.edit.saveFailed;
    }
    setEditing(null);
    void load();
    return null;
  };

  const menuItems = (row: SubmittedRow): RowMenuItem[] => {
    const items: RowMenuItem[] = [
      {
        key: 'show',
        icon: Calendar,
        label: COPY.menu.openShow.label,
        hint: COPY.menu.openShow.hint,
        onSelect: () => router.push(editEventHref(row.eventId)),
      },
      {
        key: 'ticket',
        icon: ExternalLink,
        label: COPY.menu.openTicket.label,
        hint: COPY.menu.openTicket.hint,
        disabled: !isSafeHttpUrl(row.ticketUrl),
        onSelect: () => {
          if (isSafeHttpUrl(row.ticketUrl)) {
            window.open(row.ticketUrl ?? '', '_blank', 'noopener,noreferrer');
          }
        },
      },
    ];
    // Already filtered to this fan: the item would do nothing.
    if (row.handle !== null && row.handle !== fan) {
      const handle = row.handle;
      items.push({
        key: 'fan',
        icon: Users,
        label: COPY.menu.otherPrices.label,
        hint: COPY.menu.otherPrices.hint(handle),
        onSelect: () => {
          setFilter('all');
          setTyped('');
          setSearch('');
          setFan(handle);
        },
      });
    }
    // A price in a Price check is decided on that tab, and a rejected or stale
    // one is history: only a waiting or published price can be edited.
    if (row.state === 'waiting' || row.state === 'published') {
      items.push({
        key: 'edit',
        icon: Tag,
        label: COPY.menu.editPrice.label,
        hint: COPY.menu.editPrice.hint,
        onSelect: () => setEditing(row),
      });
    }
    if (row.state === 'waiting') {
      items.push({
        key: 'reject',
        icon: X,
        label: COPY.menu.reject.label,
        hint: COPY.menu.reject.hint,
        danger: true,
        divided: true,
        onSelect: () => setRejecting(row),
      });
    }
    return items;
  };

  const fanLabel = (row: SubmittedRow) =>
    row.handle === null ? COPY.noHandle : `@${row.handle}`;
  const sub = (row: SubmittedRow) =>
    [row.venueName, dayOf(row.date)].filter(Boolean).join(' · ');

  const remaining = total - rows.length;

  const searchBox = (
    <label style={{ position: 'relative', width: isPhone ? '100%' : 220 }}>
      <Search
        size={15}
        aria-hidden
        style={{
          position: 'absolute',
          left: 11,
          top: 10,
          color: 'var(--fg-subtle)',
        }}
      />
      <input
        type="search"
        aria-label={COPY.search}
        placeholder={COPY.search}
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        style={{
          width: '100%',
          height: 36,
          padding: '0 12px 0 34px',
          borderRadius: 10,
          // 16 on the phone: iOS zooms the page into a smaller field.
          fontSize: isPhone ? 16 : 13,
          color: 'var(--fg)',
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          boxSizing: 'border-box',
        }}
      />
    </label>
  );

  // The fan filter (4d#12): the handle and how many prices it holds, in the
  // active chip style, with its own clear button.
  const fanChip = fan !== null && (
    <span
      data-testid="fan-filter"
      style={{
        ...chipStyle(true),
        cursor: 'default',
        paddingRight: 6,
        // In the phone's column it keeps its own width.
        ...(isPhone && { alignSelf: 'flex-start' }),
      }}
    >
      {COPY.fanFilter(
        fan,
        // The fan's total over every state, once counted for this fan.
        countsFan === fan && counts !== null ? counts.all : null,
      )}
      <button
        type="button"
        aria-label={COPY.clearFan}
        onClick={() => setFan(null)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          padding: 0,
          borderRadius: 999,
          border: 'none',
          background: 'transparent',
          color: 'var(--fg-muted)',
          cursor: 'pointer',
        }}
      >
        <X size={14} aria-hidden />
      </button>
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {isPhone ? (
        // 4d#21: on the phone, search on top, then the filters as a segment.
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {searchBox}
          <div
            role="group"
            aria-label={COPY.filtersLabel}
            style={{
              display: 'flex',
              padding: 3,
              borderRadius: 10,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              // Four labels with counts can outgrow a 320px screen: the strip
              // scrolls rather than pushing the page sideways.
              overflowX: 'auto',
            }}
          >
            {STATE_FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                style={{
                  flex: 1,
                  height: 32,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 8px',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  borderRadius: 7,
                  color: filter === key ? 'var(--fg)' : 'var(--fg-muted)',
                  background:
                    filter === key ? 'var(--bg-elevated)' : 'transparent',
                }}
              >
                {COPY.filters[key]}{' '}
                <span
                  style={{
                    marginLeft: 2,
                    fontSize: 11,
                    color: 'var(--fg-subtle)',
                  }}
                >
                  {countOf(counts, key) ?? ''}
                </span>
              </button>
            ))}
          </div>
          {fanChip}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div
            role="group"
            aria-label={COPY.filtersLabel}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            {STATE_FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                style={chipStyle(filter === key)}
              >
                {/* A real space: "Published 43", not "Published43". */}
                {COPY.filters[key]}{' '}
                <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>
                  {countOf(counts, key) ?? ''}
                </span>
              </button>
            ))}
          </div>
          {fanChip}
          <span style={{ flex: 1 }} />
          {searchBox}
        </div>
      )}

      {failed ? (
        <CouldntLoad
          page={ADMIN_COPY.pricesSubmitted.listLabel}
          onRetry={() => void load()}
        />
      ) : !loaded ? (
        <PageSkeleton rows={5} columns={5} rowHeight={52} />
      ) : rows.length === 0 ? (
        <EmptyState title={COPY.empty.title} body={COPY.empty.body} />
      ) : (
        <div
          aria-busy={busy}
          style={busy ? { opacity: 0.55, pointerEvents: 'none' } : undefined}
        >
          <div
            style={
              isPhone
                ? undefined
                : {
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                    background: 'var(--surface-1)',
                    overflow: 'hidden',
                  }
            }
          >
            {!isPhone && (
              <div
                aria-hidden="true"
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 18px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-subtle)',
                }}
              >
                <span style={{ flex: 1.6 }}>{COPY.columns.show}</span>
                <span style={{ width: 90 }}>{COPY.columns.price}</span>
                <span style={{ width: 120 }}>{COPY.columns.from}</span>
                <span style={{ width: 110 }}>{COPY.columns.backedBy}</span>
                <span style={{ width: 130 }}>{COPY.columns.state}</span>
                <span style={{ width: 20 }} />
              </div>
            )}
            <ul
              aria-label={COPY.listLabel}
              style={{ listStyle: 'none', margin: 0, padding: 0 }}
            >
              {rows.map((row) => {
                const pill = backedPill(row.backedBy, row.state);
                return isPhone ? (
                  <li
                    key={row.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '12px 0',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14.5,
                          fontWeight: 700,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: 'var(--fg-muted)',
                          marginTop: 3,
                        }}
                      >
                        {sub(row)}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          minWidth: 0,
                          marginTop: 6,
                        }}
                      >
                        {row.handle !== null && (
                          // Every admin avatar is PersonAvatar (README rule
                          // 12); the board's own disc is a Design conflict.
                          <PersonAvatar
                            initialOf={row.handle}
                            avatarColor={row.avatarColor}
                            avatarSecondColor={row.avatarSecondColor}
                            size={22}
                          />
                        )}
                        <span
                          style={{
                            minWidth: 0,
                            fontSize: 13.5,
                            fontWeight: 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {fanLabel(row)}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {priceRange(row.priceMin, row.priceMax)}
                      </span>
                      <Pill tone={PHONE_TONE[row.state]}>
                        {COPY.phoneStates[row.state]}
                      </Pill>
                    </div>
                  </li>
                ) : (
                  <li
                    key={row.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 18px',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ flex: 1.6, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--fg-muted)',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sub(row)}
                      </div>
                    </div>
                    <span
                      style={{
                        width: 90,
                        fontSize: 13.5,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {priceRange(row.priceMin, row.priceMax)}
                    </span>
                    <span
                      style={{
                        width: 120,
                        fontSize: 12.5,
                        color: 'var(--fg-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fanLabel(row)}
                    </span>
                    <span style={{ width: 110 }}>
                      <Pill tone={pill.tone}>
                        {pill.fans === null
                          ? COPY.priceCheck
                          : COPY.fans(pill.fans)}
                      </Pill>
                    </span>
                    <span
                      style={{
                        width: 130,
                        fontSize: 12.5,
                        color: 'var(--fg-muted)',
                      }}
                    >
                      {COPY.states[row.state]}
                    </span>
                    <span style={{ width: 20, flex: 'none' }}>
                      <RowMenu
                        label={COPY.menu.label}
                        items={menuItems(row)}
                        width={300}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
            {remaining > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: isPhone ? '12px 0' : '12px 18px',
                  borderTop: isPhone ? 'none' : '1px solid var(--border)',
                  fontSize: 12.5,
                  color: 'var(--fg-subtle)',
                }}
              >
                <span>{COPY.showing(rows.length, total)}</span>
                <span style={{ flex: 1 }} />
                {more === 'failed' && (
                  <span role="alert" style={{ color: 'var(--danger)' }}>
                    {COPY.loadMoreFailed}
                  </span>
                )}
                <AdminButton
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-disabled={more === 'loading' || undefined}
                  onClick={() => {
                    if (more !== 'loading') void loadMore();
                  }}
                >
                  {more === 'loading' ? COPY.loadingMore : COPY.loadMore}
                </AdminButton>
              </div>
            )}
          </div>
        </div>
      )}

      {editing && (
        <EditPricePanel
          single
          key={editing.id}
          row={editing}
          onClose={() => setEditing(null)}
          onSave={(priceMin, priceMax) => edit(editing, priceMin, priceMax)}
        />
      )}

      {rejecting && (
        <RejectPriceDialog
          row={rejecting}
          onConfirm={(reason, note) => reject(rejecting, reason, note)}
          onCancel={() => setRejecting(null)}
        />
      )}
    </div>
  );
};
