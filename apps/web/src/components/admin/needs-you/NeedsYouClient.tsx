'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import type { NeedsYouCount } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  ConfirmDialog,
  CouldntLoad,
  SaveFailedToast,
  useIsPhone,
} from '@/components/admin/primitives';
import { AllClear } from './AllClear';
import { EvidenceSlot } from './EvidenceSlot';
import { QueueItem } from './QueueItem';
import {
  needsYouApi,
  type NeedsYouAnswer,
  type QueueRow,
} from './needs-you-api';
import {
  FILTERS,
  NAVIGATION_SLUGS,
  countAfterRemoval,
  filterCount,
  inFilter,
  mountainToday,
  type FilterKey,
} from './needs-you-rules';

const COPY = ADMIN_COPY.needsYou;

const pillStyle = (on: boolean): CSSProperties => ({
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

interface Pending {
  row: QueueRow;
  answer: NeedsYouAnswer;
}

/**
 * 2b Needs you: the queue. The list and the count load in the browser with the
 * admin's token. An answer takes its card off the list and moves the counts.
 * `?item=<key>` selects a card and opens its panel.
 */
export const NeedsYouClient = ({ item }: { item: string | null }) => {
  const { getToken } = useAuth();
  const router = useRouter();
  const api = useMemo(() => needsYouApi(getToken), [getToken]);
  const isPhone = useIsPhone();

  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [count, setCount] = useState<NeedsYouCount | null>(null);
  const [failedLoad, setFailedLoad] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selected, setSelected] = useState<string | null>(item);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [failure, setFailure] = useState<{
    title: string;
    /** What is still true, as the toast says it. */
    saved: string;
    retry: () => void;
  } | null>(null);

  const load = useCallback(async () => {
    setFailedLoad(false);
    try {
      const [list, total] = await Promise.all([api.list(), api.count()]);
      setRows(list);
      setCount(total);
    } catch {
      setFailedLoad(true);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const select = (key: string | null) => {
    setSelected(key);
    router.replace(
      key
        ? `/admin/needs-you?item=${encodeURIComponent(key)}`
        : '/admin/needs-you',
      { scroll: false },
    );
  };

  const runAnswer = async (row: QueueRow, answer: NeedsYouAnswer) => {
    setBusyKey(row.key);
    setFailure(null);
    try {
      await api.answer(row.key, answer.slug);
      setRows(
        (was) => was?.filter((candidate) => candidate.key !== row.key) ?? was,
      );
      setCount((was) => (was ? countAfterRemoval(was, row.kind) : was));
      if (selected === row.key) select(null);
    } catch {
      setFailure({
        title: COPY.answerFailed.title,
        saved: COPY.answerFailed.saved,
        retry: () => void runAnswer(row, answer),
      });
    } finally {
      setBusyKey(null);
    }
  };

  const onAnswer = (row: QueueRow, answer: NeedsYouAnswer) => {
    // An answer that only navigates opens the item (the API refuses it).
    if (NAVIGATION_SLUGS.has(answer.slug)) return select(row.key);
    // An answer that tells fans asks first and cannot be taken back.
    if (answer.notifiesFans) return setPending({ row, answer });
    void runAnswer(row, answer);
  };

  if (failedLoad)
    return <CouldntLoad page={COPY.title} onRetry={() => void load()} />;
  if (rows === null || count === null) return null;

  const today = mountainToday(new Date());
  const visible = rows.filter((row) => inFilter(row, filter));
  const selectedRow = rows.find((row) => row.key === selected) ?? null;
  const allClear = rows.length === 0 && count.decisions === 0;

  return (
    // The inline panel is a flex sibling of the list, docked on its right, so
    // you can work down the queue with an item open.
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* The phone shell already prints the page's title in its top bar. */}
          {!isPhone && (
            <h1
              style={{
                margin: 0,
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--fg)',
              }}
            >
              {COPY.title}
            </h1>
          )}
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--fg-muted)' }}>
            {COPY.summary(count.decisions, count.handledToday)}
          </p>
        </header>

        {allClear ? (
          <AllClear handledToday={count.handledToday} />
        ) : (
          <>
            <div
              role="tablist"
              aria-label={COPY.filtersLabel}
              style={{ display: 'flex', gap: 8, overflowX: 'auto' }}
            >
              {FILTERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  onClick={() => setFilter(key)}
                  style={pillStyle(filter === key)}
                >
                  {COPY.filters[key]}
                  <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>
                    {filterCount(count, key)}
                  </span>
                </button>
              ))}
            </div>

            {failure && (
              <SaveFailedToast
                title={failure.title}
                saved={failure.saved}
                onRetry={failure.retry}
                onDismiss={() => setFailure(null)}
              />
            )}
            <div
              data-testid="needs-you-queue"
              aria-label={COPY.list}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              {visible.map((row) => (
                <QueueItem
                  key={row.key}
                  row={row}
                  today={today}
                  selected={row.key === selected}
                  busy={busyKey === row.key}
                  onSelect={() => select(row.key)}
                  onAnswer={(answer) => onAnswer(row, answer)}
                />
              ))}
              {visible.length === 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    color: 'var(--fg-muted)',
                    fontSize: 14,
                  }}
                >
                  <span>
                    {COPY.emptyFilter(
                      COPY.filters[filter],
                      Math.max(0, count.decisions - filterCount(count, filter)),
                    )}
                  </span>
                  <AdminButton
                    size="sm"
                    variant="outline"
                    onClick={() => setFilter('all')}
                  >
                    {COPY.showAll}
                  </AdminButton>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {selectedRow && (
        <EvidenceSlot
          row={selectedRow}
          busy={busyKey === selectedRow.key}
          onClose={() => select(null)}
          onAnswer={(answer) => onAnswer(selectedRow, answer)}
        />
      )}

      {pending && (
        <ConfirmDialog
          tone="danger"
          title={COPY.confirmNotify.title(pending.answer.label)}
          body={COPY.confirmNotify.body}
          confirmLabel={pending.answer.label}
          onConfirm={() => {
            const { row, answer } = pending;
            setPending(null);
            void runAnswer(row, answer);
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
};
