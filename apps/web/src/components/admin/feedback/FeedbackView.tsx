'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Inbox, Search } from 'lucide-react';
import type {
  AdminFeedbackCounts,
  AdminFeedbackItem,
  AdminFeedbackStatus,
} from '@concert-crawl/types';
import {
  CouldntLoad,
  EmptyState,
  useIsPhone,
} from '@/components/admin/primitives';
import {
  ChipCount,
  chipStyle,
} from '@/components/admin/events/list/FilterPicker';
import { adminFetch } from '@/lib/api';
import { FeedbackRow, type FeedbackItem } from './FeedbackRow';
import { FeedbackItemView, type ItemFailure } from './FeedbackItemView';
import { FeedbackSkeleton } from './FeedbackSkeleton';
import {
  KIND_CHIPS,
  PHONE_KIND_CHIPS,
  listPath,
  parseFeedbackCounts,
  parseFeedbackList,
  type FeedbackChip,
} from './feedback-list-rules';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const COPY = ADMIN_COPY.feedback;
const FAILED = COPY.item.failed;
const SEARCH_DEBOUNCE_MS = 300;
const LIST_HREF = '/admin/operations';
const itemHref = (id: string) =>
  `${LIST_HREF}?tab=feedback&item=${encodeURIComponent(id)}`;
const SEARCH_MAX = 200;

/** What the inbox counts, for the tab label drawn outside it. */
export interface FeedbackCounts {
  unread: number;
}

interface Loaded {
  items: FeedbackItem[];
  counts: AdminFeedbackCounts;
}

const chipCount = (chip: FeedbackChip, counts: AdminFeedbackCounts) =>
  chip === 'to_read'
    ? counts.toRead
    : chip === 'done'
      ? counts.done
      : counts.kinds[chip];

/**
 * `07/feedback`: the feedback list, drawn inside Operations under its title
 * and tabs, so it has no heading of its own (the page keeps one h1). The
 * chips pick To read, a kind inside it, or Done; Done adds a search. A row
 * opens the item (4b) at `?tab=feedback&item=<id>`, as Needs you's `?item=`.
 * `onCounts` reports the unread count once loaded, for the tab's badge.
 */
export const FeedbackView = ({
  onCounts,
}: {
  onCounts?: (counts: FeedbackCounts) => void;
}) => {
  const { getToken } = useAuth();
  const router = useRouter();
  const isPhone = useIsPhone();
  const [chip, setChip] = useState<FeedbackChip>('to_read');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [pending, setPending] = useState(true);
  const [failed, setFailed] = useState(false);
  // The open item lives in the URL, so a reload or a shared link reopens it.
  const openId = useSearchParams().get('item');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ItemFailure | null>(null);
  // A reopened item, kept open after it leaves the Done list.
  const [held, setHeld] = useState<AdminFeedbackItem | null>(null);
  const latestLoad = useRef(0);

  const authed = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const token = await getToken();
      if (!token) throw new Error('no token');
      return adminFetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
      });
    },
    [getToken],
  );

  const readJson = useCallback(
    async (path: string): Promise<unknown> => {
      const res = await authed(path);
      if (!res.ok) throw new Error(`status ${res.status}`);
      return res.json();
    },
    [authed],
  );

  /** A `quiet` load keeps the list on screen while it re-reads. */
  const load = useCallback(
    async (quiet = false) => {
      latestLoad.current += 1;
      const mine = latestLoad.current;
      if (!quiet) setPending(true);
      setFailed(false);
      try {
        const [rawList, rawCounts] = await Promise.all([
          readJson(listPath(chip, search)),
          readJson('/v1/admin/feedback/counts'),
        ]);
        const items = parseFeedbackList(rawList);
        const counts = parseFeedbackCounts(rawCounts);
        if (!items || !counts) throw new Error('feedback shape');
        if (mine === latestLoad.current) setLoaded({ items, counts });
      } catch {
        if (mine === latestLoad.current) setFailed(true);
      } finally {
        if (mine === latestLoad.current) setPending(false);
      }
    },
    [readJson, chip, search],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // A write that settles after the chip or search moved re-reads what is on
  // screen now, never the view it started from.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  // The phone draws no Venues chip, so a view narrowed to it falls back.
  useEffect(() => {
    if (isPhone && chip === 'venues') setChip('to_read');
  }, [isPhone, chip]);

  // Typing settles before it reaches the read.
  useEffect(() => {
    if (text.trim() === search) return undefined;
    const timer = setTimeout(() => setSearch(text.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, search]);

  const unread = loaded?.counts.unread;
  useEffect(() => {
    if (unread !== undefined) onCounts?.({ unread });
  }, [unread, onCounts]);

  // A write that settles after the view unmounted (another tab) does nothing.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const openIdRef = useRef(openId);
  useEffect(() => {
    openIdRef.current = openId;
  }, [openId]);

  // Opening or closing an item replaces the URL, as Needs you's `?item=` does.
  const select = (id: string | null) => {
    setFailure(null);
    setHeld(null);
    router.replace(id ? itemHref(id) : LIST_HREF, { scroll: false });
  };

  const onChip = (next: FeedbackChip) => {
    if (openId) select(null);
    setChip(next);
  };

  const patch = useCallback(
    async (id: string, body: Record<string, string>) => {
      const res = await authed(`/v1/admin/feedback/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
    },
    [authed],
  );

  // An `?item=` no longer in this view (done elsewhere, another chip) opens
  // nothing: there is no read of one item. A reopened item is held open
  // after it leaves Done.
  const openItem =
    (held && held.id === openId ? held : null) ??
    loaded?.items.find((item) => item.id === openId) ??
    null;

  // Opening an unread item marks it read, once per opening: a Reopen that
  // makes it unread again while it stays open is left unread.
  const readFor = useRef<string | null>(null);
  const openKey = openItem?.id ?? null;
  const openUnread = openItem?.status === 'unread';
  useEffect(() => {
    if (openKey === null) {
      readFor.current = null;
      return;
    }
    if (readFor.current === openKey) return;
    readFor.current = openKey;
    if (!openUnread) return;
    void patch(openKey, { status: 'read' })
      .catch(() => undefined)
      .finally(() => {
        if (mounted.current) void loadRef.current(true);
      });
  }, [openKey, openUnread, patch]);

  // A status move can take the item out of this view and changes the counts,
  // so the list re-reads either way, keeping what it shows until then. Done
  // closes the item, as an answer closes a Needs you panel; Reopen keeps it
  // open in its To read form. A refusal keeps it open with Try again. Only
  // the item the write was for, still open, is closed or changed.
  const onStatusChange = (
    item: AdminFeedbackItem,
    status: AdminFeedbackStatus,
  ) => {
    setBusy(true);
    setFailure(null);
    const toDone = status === 'resolved';
    void patch(item.id, { status })
      .then(() => {
        if (!mounted.current || openIdRef.current !== item.id) return;
        if (toDone) select(null);
        else setHeld({ ...item, status, resolvedBy: null, resolvedAt: null });
      })
      .catch(() => {
        if (!mounted.current) return;
        setFailure({
          id: item.id,
          what: 'status',
          title: toDone ? FAILED.markDone : FAILED.reopen,
          saved: toDone ? FAILED.stillToRead : FAILED.stillDone,
          retry: () => onStatusChange(item, status),
        });
      })
      .finally(() => {
        if (!mounted.current) return;
        setBusy(false);
        void loadRef.current(true);
        router.refresh();
      });
  };
  // The note shows at once; a refused save says so and re-reads, so the item
  // shows what stuck. Try again sends the newest note for that item.
  const latestNotes = useRef(new Map<string, string>());
  const onNotesChange = (id: string, adminNotes: string) => {
    latestNotes.current.set(id, adminNotes);
    void patch(id, { adminNotes })
      .then(() => {
        if (!mounted.current) return;
        setFailure((prev) =>
          prev?.id === id && prev.what === 'note' ? null : prev,
        );
      })
      .catch(() => {
        if (!mounted.current) return;
        setFailure({
          id,
          what: 'note',
          title: FAILED.note,
          saved: FAILED.noteKept,
          retry: () =>
            onNotesChange(id, latestNotes.current.get(id) ?? adminNotes),
        });
        void loadRef.current(true);
      });
    setLoaded(
      (prev) =>
        prev && {
          ...prev,
          items: prev.items.map((item) =>
            item.id === id ? { ...item, adminNotes } : item,
          ),
        },
    );
    setHeld((prev) => (prev?.id === id ? { ...prev, adminNotes } : prev));
  };

  if (failed) {
    return <CouldntLoad page={COPY.title} onRetry={() => void load()} />;
  }
  if (!loaded) return <FeedbackSkeleton />;

  const { items, counts } = loaded;
  const isDone = chip === 'done';
  const chips: FeedbackChip[] = isDone
    ? ['to_read', 'done']
    : ['to_read', ...(isPhone ? PHONE_KIND_CHIPS : KIND_CHIPS), 'done'];

  const searchBox = (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 36,
        width: isPhone ? '100%' : 240,
        flex: 'none',
        padding: '0 12px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        color: 'var(--fg-subtle)',
      }}
    >
      {/* 1.7 on the board's 20 grid is 2 on Lucide's 24. */}
      <Search size={15} strokeWidth={2} aria-hidden="true" />
      <input
        type="search"
        value={text}
        onChange={(evt) => setText(evt.target.value)}
        // The API refuses a longer search.
        maxLength={SEARCH_MAX}
        placeholder={COPY.search}
        aria-label={COPY.search}
        className="placeholder:text-[var(--fg-subtle)]"
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 13,
          color: 'var(--fg)',
        }}
      />
    </label>
  );

  const chipRow = (
    <div
      role="group"
      aria-label={COPY.chipsLabel}
      // The desktop board wraps the chips; the phone's scroll sideways.
      style={{
        display: 'flex',
        gap: 8,
        ...(isPhone
          ? { overflowX: 'auto', scrollbarWidth: 'none' }
          : { flexWrap: 'wrap' }),
      }}
    >
      {chips.map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={chip === key}
          data-testid={`feedback-chip-${key}`}
          onClick={() => onChip(key)}
          style={chipStyle(chip === key)}
        >
          {COPY.chips[key]}
          <ChipCount count={chipCount(key, counts)} on={chip === key} />
        </button>
      ))}
    </div>
  );

  const empty =
    isDone && search ? (
      <EmptyState title={COPY.noMatch.title} body={COPY.noMatch.body} />
    ) : isDone ? (
      <EmptyState title={COPY.doneEmpty} icon={Inbox} />
    ) : (
      <EmptyState
        title={COPY.empty.title}
        body={COPY.empty.body}
        icon={Inbox}
      />
    );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isPhone ? 10 : 16,
      }}
    >
      {isDone && isPhone && searchBox}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isDone && !isPhone && searchBox}
        {chipRow}
      </div>
      {pending ? (
        <FeedbackSkeleton chips={false} />
      ) : items.length === 0 ? (
        empty
      ) : (
        <div
          data-testid="feedback-list"
          style={{
            borderRadius: 14,
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
            overflow: 'hidden',
          }}
        >
          {items.map((item, idx) => (
            <FeedbackRow
              key={item.id}
              item={item}
              onOpen={select}
              isDone={isDone}
              isPhone={isPhone}
              isFirst={idx === 0}
            />
          ))}
        </div>
      )}
      {openItem && (
        <FeedbackItemView
          item={openItem}
          isPhone={isPhone}
          busy={busy}
          failure={failure}
          onDismissFailure={() => setFailure(null)}
          onClose={() => select(null)}
          onMarkDone={() => onStatusChange(openItem, 'resolved')}
          // Back to To read as unread, so a reopened bug is in Needs you again.
          onReopen={() => onStatusChange(openItem, 'unread')}
          onNotes={(notes) => onNotesChange(openItem.id, notes)}
        />
      )}
      {isDone && !pending && items.length > 0 && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--fg-muted)' }}>
          {COPY.doneCaption}
        </p>
      )}
    </div>
  );
};
