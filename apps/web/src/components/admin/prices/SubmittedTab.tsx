'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  Check,
  ExternalLink,
  MoreHorizontal,
  Search,
  Tag,
  X,
} from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  AdminSheet,
  CouldntLoad,
  EmptyState,
  PageSkeleton,
  PersonAvatar,
  RowMenu,
  RowMenuItems,
  SaveFailedToast,
  Spinner,
  Toast,
  ToastDock,
  useIsPhone,
  type RowMenuItem,
} from '@/components/admin/primitives';
import { editEventHref } from '@/lib/admin/edit-event-link';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';
import { refusedCode, refusedStatus } from '../invite-codes/codes-api';
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
  stateWords,
  ticketHost,
  type BackedTone,
  type RejectionReason,
  type StateFilter,
  type SubmissionState,
} from './submitted-rules';

const COPY = ADMIN_COPY.pricesSubmitted;
const PAGE = 50;
// The approved toast leaves on its own, as the admin's other toasts do.
const TOAST_MS = 6000;
// `43/approve-failed-d` draws the toast's shadow at .45.
const FAILED_SHADOW = '0 14px 30px rgba(0,0,0,.45)';

/** A row mid-Approve, or one whose Approve just failed. */
type RowStatus = 'approving' | 'failed';

/**
 * The one toast the tab shows at a time, tagged with the list (filter,
 * search, fan or show) it was raised under: it shows only while that list is on
 * screen.
 */
type Notice = { key: string } & (
  | { kind: 'approved'; price: string; show: string }
  | { kind: 'failed'; row: SubmittedRow }
  | { kind: 'not-waiting'; priceCheck: boolean }
);

const listKeyOf = (
  filter: StateFilter,
  search: string,
  fan: string | null,
  eventId: string | null,
): string => JSON.stringify([filter, search, fan, eventId]);

/** The fan or show a chip's count was counted over. */
const narrowKeyOf = (fan: string | null, eventId: string | null): string =>
  JSON.stringify([fan, eventId]);

/** The show the list is narrowed to ("Other prices", 43). */
type ShowFilter = { eventId: string; title: string };

const withoutKey = <T,>(
  record: Record<string, T>,
  key: string,
): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([id]) => id !== key));

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
 * menu on a desktop (a sheet from each waiting row on the phone), and Approve
 * (`43/approve-*`, no Undo) and Reject for a price that is waiting for you.
 */
export const SubmittedTab = ({
  initialFan = null,
}: {
  /** Open already filtered to this fan (`?handle=`, from the person page). */
  initialFan?: string | null;
} = {}) => {
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
  // Approve (`43/approve-*`): each row's request, the prices approved here
  // ("Published by you" until the page reloads), the toast, the row whose
  // ⋯ menu is open (it tints), and the phone's actions sheet.
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({});
  const [approvedHere, setApprovedHere] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [menuRow, setMenuRow] = useState<string | null>(null);
  const [sheetRow, setSheetRow] = useState<SubmittedRow | null>(null);
  // One fan's prices (`?handle=` from the person page, 4d#12) on the whole
  // handle, or one show's ("Other prices", 43): each shown as a chip rather
  // than typed into the search box. Never both: setting one clears the other.
  const [fan, setFan] = useState<string | null>(initialFan);
  const [show, setShow] = useState<ShowFilter | null>(null);
  const eventId = show?.eventId ?? null;
  // A link to `?handle=` while the tab is mounted changes the prop, not the
  // mount (as PricesClient does for `?tab=`).
  useEffect(() => {
    // A link without `?handle=` clears the chip it left behind.
    if (initialFan === null) {
      setFan(null);
      return;
    }
    setFilter('all');
    setTyped('');
    setSearch('');
    setShow(null);
    setFan(initialFan);
  }, [initialFan]);
  // Which fan or show `counts` were counted over, so a chip never shows
  // another load's figure.
  const narrowKey = narrowKeyOf(fan, eventId);
  const [countsKey, setCountsKey] = useState<string | null>(null);

  // The search waits for a pause in typing. A typed search replaces the fan or
  // show filter at the same moment, so the swap is one reload, not two.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = typed.trim();
      setSearch(next);
      if (next !== '') {
        setFan(null);
        setShow(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [typed]);

  // Only the newest load may write.
  const latest = useRef(0);
  // `keepFailed`: the row whose Approve just failed keeps its Didn't approve
  // through this load while it is still waiting (its Try again is up).
  const load = useCallback(
    async (keepFailed: string | null = null) => {
      const mine = ++latest.current;
      setBusy(true);
      setMore('idle');
      try {
        const [list, nextCounts] = await Promise.all([
          api.list(filter, search, 0, PAGE, fan, eventId),
          api.counts(search, fan, eventId),
        ]);
        if (mine !== latest.current) return;
        setRows(list.rows);
        setTotal(list.total);
        setCounts(nextCounts);
        setCountsKey(narrowKeyOf(fan, eventId));
        // A fresh list drops a failed Approve's tint; one in flight keeps its.
        const stillWaiting = list.rows.some(
          (row) => row.id === keepFailed && row.state === 'waiting',
        );
        setRowStatus((prev) =>
          Object.fromEntries(
            Object.entries(prev).filter(
              ([id, status]) =>
                status === 'approving' ||
                (stillWaiting && id === keepFailed && status === 'failed'),
            ),
          ),
        );
        setFailed(false);
        setLoaded(true);
        setBusy(false);
      } catch {
        if (mine === latest.current) {
          setFailed(true);
          setBusy(false);
        }
      }
    },
    [api, filter, search, fan, eventId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // The current list's load, for an Approve that settles after the filter,
  // search, fan or show moved on: its own render's `load` would fetch the old
  // list.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);
  const reload = (keepFailed: string | null = null) =>
    void loadRef.current(keepFailed);

  const listKey = listKeyOf(filter, search, fan, eventId);
  // Another filter, search, fan or show is another list: its toast goes with it.
  useEffect(() => {
    setNotice(null);
  }, [listKey]);
  // An Approve that settles after the list changed raised its toast under the
  // old key: it never shows (nor offers a Try again for an off-screen row).
  const shownNotice = notice !== null && notice.key === listKey ? notice : null;

  // The approved toast, and the not-waiting one (no Try again), leave on
  // their own. A failure with Try again stays until it's used.
  useEffect(() => {
    if (notice === null || notice.kind === 'failed') return undefined;
    const timer = window.setTimeout(() => setNotice(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const showName = (row: SubmittedRow) =>
    row.title === '' ? COPY.reject.thisShow : row.title;

  /**
   * Approve one waiting price, in place: the row reads Approving…, then
   * Published by you with the counts moved (no reload), or Didn't approve
   * with Try again. A price no longer waiting reloads the list.
   */
  const approve = async (row: SubmittedRow) => {
    if (rowStatus[row.id] === 'approving') return;
    const mine = latest.current;
    const key = listKey;
    setNotice(null);
    setRowStatus((prev) => ({ ...prev, [row.id]: 'approving' }));
    try {
      await api.approve(row.id);
    } catch (err) {
      console.warn('[admin] Submitted prices: approve failed', err);
      const status = refusedStatus(err);
      // Decided elsewhere (approved, rejected, gone, or in a Price check):
      // say so and show the list as it is now.
      if (status === 409 || status === 404) {
        setRowStatus((prev) => withoutKey(prev, row.id));
        setNotice({
          key,
          kind: 'not-waiting',
          priceCheck: refusedCode(err) === 'price_check',
        });
        reload();
        return;
      }
      setRowStatus((prev) => ({ ...prev, [row.id]: 'failed' }));
      setNotice({ key, kind: 'failed', row });
      // A timeout or a 5xx may still have published it: show the list as
      // the server has it (a still-waiting row keeps its Didn't approve).
      reload(row.id);
      return;
    }
    setRowStatus((prev) => withoutKey(prev, row.id));
    setApprovedHere((prev) => new Set(prev).add(row.id));
    // The row stays where it is, now published, even under Waiting for you.
    setRows((prev) =>
      prev.map((each) =>
        each.id === row.id ? { ...each, state: 'published' } : each,
      ),
    );
    // No load since the tap: move one price across. A load that began during
    // the request may have read the list and counts from before it
    // committed, so load again to settle them.
    if (mine === latest.current) {
      setCounts((prev) =>
        prev === null
          ? prev
          : {
              ...prev,
              waiting: Math.max(0, prev.waiting - 1),
              published: prev.published + 1,
            },
      );
    } else {
      reload();
    }
    setNotice({
      key,
      kind: 'approved',
      price: priceRange(row.priceMin, row.priceMax),
      show: showName(row),
    });
  };

  const loadMore = async () => {
    // A filter or search change while this runs makes its answer stale.
    const mine = latest.current;
    setMore('loading');
    try {
      const list = await api.list(
        filter,
        search,
        rows.length,
        PAGE,
        fan,
        eventId,
      );
      if (mine !== latest.current) return;
      // From the rows as they are now, so an Approve that landed meanwhile
      // keeps its Published.
      setRows((prev) => {
        const seen = new Set(prev.map((row) => row.id));
        return [...prev, ...list.rows.filter((row) => !seen.has(row.id))];
      });
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

  /**
   * The row's actions in `43/approve-menu-d`'s order: Approve first for a
   * waiting price, then the show, the ticket, the show's other prices, Edit
   * price and Reject…. The phone's sheet words two hints shorter.
   */
  const menuItems = (row: SubmittedRow, phone = false): RowMenuItem[] => {
    const price = priceRange(row.priceMin, row.priceMax);
    const waiting = row.state === 'waiting';
    const items: RowMenuItem[] = [];
    if (waiting) {
      items.push({
        key: 'approve',
        icon: Check,
        label: COPY.menu.approve.label,
        hint: phone
          ? COPY.menu.approve.phoneHint(price)
          : COPY.menu.approve.hint(price, row.backedBy),
        success: true,
        onSelect: () => void approve(row),
      });
    }
    items.push(
      {
        key: 'show',
        icon: ExternalLink,
        label: COPY.menu.openShow.label,
        hint: COPY.menu.openShow.hint(showName(row), row.venueName),
        divided: waiting,
        onSelect: () => router.push(editEventHref(row.eventId)),
      },
      {
        key: 'ticket',
        icon: ExternalLink,
        label: COPY.menu.openTicket.label,
        hint: ticketHost(row.ticketUrl) ?? COPY.menu.openTicket.noTicket,
        disabled: !isSafeHttpUrl(row.ticketUrl),
        onSelect: () => {
          if (isSafeHttpUrl(row.ticketUrl)) {
            window.open(row.ticketUrl ?? '', '_blank', 'noopener,noreferrer');
          }
        },
      },
    );
    // The show's other prices, only when it has some and the list is not
    // already narrowed to it (the item would do nothing). The hint counts the
    // show's prices with this one, the figure its chip shows under All.
    if (row.showOthers > 0 && row.eventId !== eventId) {
      items.push({
        key: 'others',
        icon: Tag,
        label: COPY.menu.otherPrices.label,
        hint: COPY.menu.otherPrices.hint(row.showOthers + 1),
        onSelect: () => {
          setFilter('all');
          setTyped('');
          setSearch('');
          setFan(null);
          setShow({ eventId: row.eventId, title: showName(row) });
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
        hint: phone ? COPY.menu.editPrice.phoneHint : COPY.menu.editPrice.hint,
        onSelect: () => setEditing(row),
      });
    }
    if (waiting) {
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

  const approvedByYou = (row: SubmittedRow) =>
    row.state === 'published' && approvedHere.has(row.id);

  /** The desktop row's tint: busy or its menu open, approved, or failed. */
  const rowTint = (row: SubmittedRow): string | undefined =>
    rowStatus[row.id] === 'approving' || menuRow === row.id
      ? 'var(--surface-2)'
      : approvedByYou(row)
        ? 'color-mix(in srgb, var(--success) 6%, transparent)'
        : rowStatus[row.id] === 'failed'
          ? 'color-mix(in srgb, var(--danger) 6%, transparent)'
          : undefined;

  /** The desktop STATE cell (`43/approve-busy-d`, `-done-d`, `-failed-d`). */
  const stateCell = (row: SubmittedRow) => {
    const status = rowStatus[row.id];
    const line: CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      whiteSpace: 'nowrap',
    };
    if (status === 'approving') {
      return (
        <span style={{ ...line, gap: 8, color: 'var(--signal)' }}>
          <Spinner size={13} tone="var(--signal)" />
          {COPY.approve.approving}
        </span>
      );
    }
    if (approvedByYou(row)) {
      return (
        <span style={{ ...line, color: 'var(--success)' }}>
          <Check size={13} strokeWidth={2.2} aria-hidden />
          {COPY.approve.publishedByYou}
        </span>
      );
    }
    if (status === 'failed' && row.state === 'waiting') {
      return (
        <span style={{ ...line, color: 'var(--danger)' }}>
          {/* The drawn cross: an 8px X in a 16px box. */}
          <svg
            width={12}
            height={12}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
          {COPY.approve.didntApprove}
        </span>
      );
    }
    return stateWords(row, COPY.states);
  };

  /**
   * The phone's action line under a waiting price (`43/approve-m`): a soft
   * Approve and a ⋯ that opens the actions sheet. Both rest mid-request.
   */
  const phoneActions = (row: SubmittedRow) => {
    const approving = rowStatus[row.id] === 'approving';
    const button: CSSProperties = {
      height: 38,
      padding: '0 12px',
      borderRadius: 9,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      // `43/approve-m` draws 6 between glyph and word.
      gap: 6,
      fontFamily: 'inherit',
      fontWeight: 600,
      cursor: approving ? 'not-allowed' : 'pointer',
    };
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          data-testid="approve-button"
          aria-disabled={approving || undefined}
          onClick={() => {
            if (!approving) void approve(row);
          }}
          style={{
            ...button,
            flex: 1,
            fontSize: 13.5,
            color: 'var(--signal)',
            background: 'color-mix(in srgb, var(--signal) 12%, transparent)',
            border:
              '1px solid color-mix(in srgb, var(--signal) 30%, transparent)',
          }}
        >
          {approving ? (
            <Spinner size={13} tone="var(--signal)" />
          ) : (
            <Check size={14} strokeWidth={1.8} aria-hidden />
          )}
          {approving ? COPY.approve.approving : COPY.menu.approve.label}
        </button>
        <button
          type="button"
          aria-label={COPY.menu.label}
          aria-haspopup="dialog"
          // aria-disabled, so focus stays on it mid-request.
          aria-disabled={approving || undefined}
          onClick={() => {
            if (!approving) setSheetRow(row);
          }}
          style={{
            ...button,
            fontSize: 13,
            color: 'var(--fg)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-strong)',
          }}
        >
          <MoreHorizontal size={14} strokeWidth={1.8} aria-hidden />
        </button>
      </div>
    );
  };

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

  // The fan filter (4d#12) or the show filter (43 Other prices): the handle or
  // the show and how many prices it holds, in the active chip style, with its
  // own clear button.
  const narrowChip = ({
    testId,
    text,
    clearLabel,
    onClear,
  }: {
    testId: 'fan-filter' | 'show-filter';
    text: string;
    clearLabel: string;
    onClear: () => void;
  }) => (
    <span
      data-testid={testId}
      style={{
        ...chipStyle(true),
        cursor: 'default',
        paddingRight: 6,
        // Never wider than its row: a long name truncates, the count and
        // the clear button stay.
        maxWidth: '100%',
        minWidth: 0,
        // In the phone's column it keeps its own width.
        ...(isPhone && { alignSelf: 'flex-start' }),
      }}
    >
      <span style={{ display: 'flex', minWidth: 0, whiteSpace: 'pre' }}>
        <span
          data-testid={
            testId === 'fan-filter' ? 'fan-filter-handle' : 'show-filter-title'
          }
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}
        >
          {text}
        </span>
        {/* The total over every state, once counted for this fan or show. */}
        {countsKey === narrowKey && counts !== null && (
          <span style={{ flex: 'none' }}>{COPY.narrowCount(counts.all)}</span>
        )}
      </span>
      <button
        type="button"
        aria-label={clearLabel}
        onClick={onClear}
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
  // At most one of the two is set.
  const filterChip =
    fan !== null
      ? narrowChip({
          testId: 'fan-filter',
          text: COPY.fanHandle(fan),
          clearLabel: COPY.clearFan,
          onClear: () => setFan(null),
        })
      : show !== null &&
        narrowChip({
          testId: 'show-filter',
          text: show.title,
          clearLabel: COPY.clearShow,
          onClear: () => setShow(null),
        });

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
                  // As the Prices segment above it: 4px, so four counted
                  // filters fit at 320 without scrolling.
                  padding: '0 4px',
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
                {/* The short words, as the Prices segment's phoneTabs. */}
                {COPY.phoneFilters[key]}{' '}
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
          {filterChip}
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
          {filterChip}
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
                <span style={{ width: 150 }}>{COPY.columns.state}</span>
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
                    aria-busy={rowStatus[row.id] === 'approving' || undefined}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      padding: '12px 0',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 12 }}>
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
                          {approvedByYou(row)
                            ? COPY.approve.publishedByYou
                            : stateWords(row, COPY.phoneStates)}
                        </Pill>
                      </div>
                    </div>
                    {row.state === 'waiting' && phoneActions(row)}
                  </li>
                ) : (
                  <li
                    key={row.id}
                    aria-busy={rowStatus[row.id] === 'approving' || undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 18px',
                      borderTop: '1px solid var(--border)',
                      background: rowTint(row),
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
                      data-testid="submitted-state"
                      style={{
                        // `43/approve-*` widens it to fit Published by you.
                        width: 150,
                        fontSize: 12.5,
                        color: 'var(--fg-muted)',
                      }}
                    >
                      {stateCell(row)}
                    </span>
                    <span style={{ width: 20, flex: 'none' }}>
                      <RowMenu
                        label={COPY.menu.label}
                        items={menuItems(row)}
                        width={300}
                        // `43/approve-menu-d` draws the ⋯ at stroke 1.5.
                        iconStrokeWidth={1.5}
                        // Mid-request the row can't be acted on.
                        disabled={rowStatus[row.id] === 'approving'}
                        onOpenChange={(open) =>
                          setMenuRow((cur) =>
                            open ? row.id : cur === row.id ? null : cur,
                          )
                        }
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

      {/* `43/approve-sheet-m`: the row's actions as a bottom sheet, closed
          from the scrim (no Cancel drawn). */}
      {sheetRow && (
        <AdminSheet
          // `43/approve-sheet-m` draws the title at 17, a size under the
          // sheet's own 18.
          title={
            <span style={{ fontSize: 17 }}>
              {COPY.menu.sheetTitle(
                showName(sheetRow),
                priceRange(sheetRow.priceMin, sheetRow.priceMax),
              )}
            </span>
          }
          label={COPY.menu.sheetTitle(
            showName(sheetRow),
            priceRange(sheetRow.priceMin, sheetRow.priceMax),
          )}
          onClose={() => setSheetRow(null)}
        >
          <div
            style={{
              padding: 6,
              borderRadius: 14,
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-elevated)',
            }}
          >
            <RowMenuItems
              items={menuItems(sheetRow, true)}
              testId="price-sheet"
              onPick={(item) => {
                setSheetRow(null);
                item.onSelect();
              }}
            />
          </div>
        </AdminSheet>
      )}

      {/* No Undo (Hugh): the price goes out to fans at once. */}
      {shownNotice?.kind === 'approved' && (
        <Toast
          testId="approve-toast"
          title={COPY.approve.doneTitle(shownNotice.price, shownNotice.show)}
          // No fan notice exists, so no "the fan is told" line (Hugh).
          body={null}
        />
      )}
      {shownNotice?.kind === 'failed' && (
        <ToastDock>
          <SaveFailedToast
            title={COPY.approve.failedTitle}
            body={COPY.approve.failedBody}
            onRetry={() => void approve(shownNotice.row)}
            crossStroke={2.2}
            shadow={FAILED_SHADOW}
          />
        </ToastDock>
      )}
      {shownNotice?.kind === 'not-waiting' && (
        <ToastDock>
          {/* Trying again would only be refused again: no Try again. */}
          <SaveFailedToast
            title={COPY.approve.failedTitle}
            body={
              shownNotice.priceCheck
                ? COPY.approve.priceCheckBody
                : COPY.approve.notWaitingBody
            }
            crossStroke={2.2}
            shadow={FAILED_SHADOW}
          />
        </ToastDock>
      )}
    </div>
  );
};
