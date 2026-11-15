'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Inbox, Search } from 'lucide-react';
import type {
  AdminFeedbackCounts,
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
import { FeedbackRow, type FeedbackItem } from './FeedbackRow';
import { FeedbackExpanded } from './FeedbackExpanded';
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
const SEARCH_DEBOUNCE_MS = 300;
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
 * opens today's inline detail (4b replaces it with the item screen).
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const latestLoad = useRef(0);

  const authed = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const token = await getToken();
      if (!token) throw new Error('no token');
      return fetch(`${API_BASE}${path}`, {
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

  const onChip = (next: FeedbackChip) => {
    setExpandedId(null);
    setChip(next);
  };

  // The inline detail's writes, kept as they were until 4b replaces it.
  const patch = async (id: string, body: Record<string, string>) => {
    const res = await authed(`/v1/admin/feedback/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
  };

  // A status move can take the item out of this view and changes the counts,
  // so the list re-reads either way, keeping what it shows until then.
  const onStatusChange = (id: string, status: AdminFeedbackStatus) => {
    void patch(id, { status })
      .catch(() => undefined)
      .finally(() => {
        void loadRef.current(true);
        router.refresh();
      });
  };
  // Notes show at once; a refused save re-reads, so the row shows what stuck.
  const onNotesChange = (id: string, adminNotes: string) => {
    void patch(id, { adminNotes }).catch(() => loadRef.current(true));
    setLoaded(
      (prev) =>
        prev && {
          ...prev,
          items: prev.items.map((item) =>
            item.id === id ? { ...item, adminNotes } : item,
          ),
        },
    );
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
            <div key={item.id}>
              <FeedbackRow
                item={item}
                isExpanded={expandedId === item.id}
                onToggle={(id) =>
                  setExpandedId((prev) => (prev === id ? null : id))
                }
                isDone={isDone}
                isPhone={isPhone}
                isFirst={idx === 0}
              />
              {expandedId === item.id && (
                <FeedbackExpanded
                  item={item}
                  onStatusChange={onStatusChange}
                  onNotesChange={onNotesChange}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {isDone && !pending && items.length > 0 && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--fg-muted)' }}>
          {COPY.doneCaption}
        </p>
      )}
    </div>
  );
};
