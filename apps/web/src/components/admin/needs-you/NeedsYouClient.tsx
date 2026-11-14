'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import type { AllClearFacts, NeedsYouCount } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  ConfirmDialog,
  CouldntLoad,
  SaveFailedToast,
  useIsPhone,
} from '@/components/admin/primitives';
import { AllClear } from './AllClear';
import { AnsweredRow } from './AnsweredRow';
import { NeedsYouSkeleton } from './NeedsYouSkeleton';
import { EvidenceSlot } from './EvidenceSlot';
import { PausePanel } from '../venues/PausePanel';
import { refusedStatus } from '../invite-codes/codes-api';
import { PriceBatchSheet } from './PriceBatchSheet';
import { QueueItem } from './QueueItem';
import {
  needsYouApi,
  type AnswerParams,
  type NeedsYouAnswer,
  type QueueRow,
} from './needs-you-api';
import {
  FILTERS,
  NAVIGATION_SLUGS,
  PAUSE_SLUGS,
  answeredName,
  countAfterRemoval,
  defaultParams,
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

interface Answered {
  line: string;
  /** The audit row an Undo points at. Null: nothing to take back. */
  auditId: string | null;
  /** Where the card sat in the visible list, so the line takes its place. */
  at: number;
}

interface Pending {
  row: QueueRow;
  answer: NeedsYouAnswer;
  params: AnswerParams | undefined;
}

/**
 * 2b Needs you: the queue. The list and the count load in the browser with the
 * admin's token. An answer takes its card off the list and leaves a dashed
 * line with Undo in its place; a snooze does the same without the Undo.
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
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  // The venue answer whose Pause panel is open (Keep paused..., Pause crawling...).
  const [pausing, setPausing] = useState<{
    row: QueueRow;
    answer: NeedsYouAnswer;
  } | null>(null);
  // The price batch whose sheet is open (phone only: `a-batch-of-prices`).
  const [batchKey, setBatchKey] = useState<string | null>(null);
  const [failure, setFailure] = useState<{
    title: string;
    /** What is still true, as the toast says it. */
    saved: string;
    retry: () => void;
    /** The item whose answer failed: its open panel shows the block itself. */
    rowKey?: string;
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

  // The All clear card's facts, read once the queue is empty. A failed read
  // leaves the card without them: they are context, not a decision.
  const [facts, setFacts] = useState<AllClearFacts | null>(null);
  const queueEmpty =
    rows !== null &&
    count !== null &&
    rows.length === 0 &&
    count.decisions === 0;
  useEffect(() => {
    if (!queueEmpty) return;
    let live = true;
    api
      .facts()
      .then((next) => live && setFacts(next))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [queueEmpty, api]);

  // Rule 4: on desktop the first item opens as soon as the queue arrives, once.
  // Closing it, or answering it, leaves the panel shut. The phone keeps the list.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (rows === null || autoOpened.current) return;
    autoOpened.current = true;
    const first = rows[0];
    // A `?item=` that is still in the queue wins; a dead key falls through.
    if (!isPhone && first && !rows.some((row) => row.key === item)) {
      setSelected(first.key);
      router.replace(`/admin/needs-you?item=${encodeURIComponent(first.key)}`, {
        scroll: false,
      });
    }
  }, [rows, isPhone, item, router]);

  const select = (key: string | null) => {
    // A failed answer's block belongs to its item: leaving it, the block goes,
    // so its Try again can never act on an item that is no longer in view.
    if (failure?.rowKey !== undefined && failure.rowKey !== key)
      setFailure(null);
    setSelected(key);
    router.replace(
      key
        ? `/admin/needs-you?item=${encodeURIComponent(key)}`
        : '/admin/needs-you',
      { scroll: false },
    );
  };

  const settle = (
    row: QueueRow,
    next: Omit<Answered, 'at'>,
    handled: boolean,
  ) => {
    const at = Math.max(
      0,
      (rows ?? [])
        .filter((candidate) => inFilter(candidate, filter))
        .findIndex((candidate) => candidate.key === row.key),
    );
    setRows(
      (was) => was?.filter((candidate) => candidate.key !== row.key) ?? was,
    );
    setCount((was) => (was ? countAfterRemoval(was, row.kind, handled) : was));
    setAnswered({ ...next, at });
    if (selected === row.key) select(null);
  };

  const runAnswer = async (
    row: QueueRow,
    answer: NeedsYouAnswer,
    params?: AnswerParams,
  ) => {
    setBusyKey(row.key);
    setFailure(null);
    try {
      const result = await api.answer(row.key, answer.slug, {
        ...defaultParams(answer.slug),
        ...params,
      });
      settle(
        row,
        {
          line: COPY.answered(answeredName(row.title), answer.label),
          auditId: result.undoable ? result.auditId : null,
        },
        true,
      );
    } catch {
      setFailure({
        // Names the answer that failed, as `panel-answer-failed` draws it.
        title: COPY.answerFailed.titles[answer.slug] ?? COPY.answerFailed.title,
        saved: COPY.answerFailed.saved,
        retry: () => void runAnswer(row, answer, params),
        rowKey: row.key,
      });
    } finally {
      setBusyKey(null);
    }
  };

  const onAnswer = (
    row: QueueRow,
    answer: NeedsYouAnswer,
    params?: AnswerParams,
  ) => {
    // Review on a price batch opens its sheet on the phone; the desktop keeps
    // the board's own answer (the sheet is drawn for the phone only).
    if (answer.slug === 'review' && row.kind === 'price-batch' && isPhone)
      return setBatchKey(row.key);
    // An answer that only navigates opens the item (the API refuses it).
    if (NAVIGATION_SLUGS.has(answer.slug)) return select(row.key);
    // Pausing a crawl asks why and for how long first (A3 2c #16, #22).
    if (PAUSE_SLUGS.has(answer.slug) && row.venueId)
      return setPausing({ row, answer });
    // An answer that tells fans asks first and cannot be taken back.
    if (answer.notifiesFans) return setPending({ row, answer, params });
    void runAnswer(row, answer, params);
  };

  /**
   * Approve the ticked prices of a batch. A failure rejects, so the sheet stays
   * open with its own "nothing changed" line; a success settles the card.
   */
  const approveBatch = async (row: QueueRow, submissionIds: string[]) => {
    const answer = row.answers.find((one) => one.slug === 'approve_all');
    if (!answer) throw new Error('approve_all is not offered');
    const result = await api.answer(row.key, answer.slug, { submissionIds });
    setBatchKey(null);
    settle(
      row,
      {
        line: COPY.answered(answeredName(row.title), answer.label),
        auditId: result.undoable ? result.auditId : null,
      },
      true,
    );
  };

  const runSnooze = async (row: QueueRow, action: () => Promise<void>) => {
    setBusyKey(row.key);
    setFailure(null);
    try {
      await action();
      settle(
        row,
        { line: COPY.snoozedLine(answeredName(row.title)), auditId: null },
        false,
      );
    } catch {
      setFailure({
        title: COPY.snooze.failed,
        saved: COPY.answerFailed.saved,
        retry: () => void runSnooze(row, action),
      });
    } finally {
      setBusyKey(null);
    }
  };

  const onUndo = async () => {
    if (!answered?.auditId) return;
    setUndoing(true);
    try {
      await api.undo(answered.auditId);
      setAnswered(null);
      await load();
    } catch {
      setFailure({
        title: COPY.undo.failed,
        saved: COPY.undo.failedSaved,
        retry: () => void onUndo(),
      });
    } finally {
      setUndoing(false);
    }
  };

  const visibleCount = (rows ?? []).filter((row) =>
    inFilter(row, filter),
  ).length;
  /** The dashed line, drawn where the answered card sat (clamped to the end). */
  const answeredRow = (index: number) =>
    answered && Math.min(answered.at, visibleCount) === index ? (
      <AnsweredRow
        line={answered.line}
        undoing={undoing}
        onUndo={answered.auditId ? () => void onUndo() : undefined}
      />
    ) : null;

  if (failedLoad)
    return <CouldntLoad page={COPY.title} onRetry={() => void load()} />;
  // The queue loads in the browser, so the skeleton the route's `loading.tsx`
  // drew stays up through the real wait (`07/loading-needs-you`).
  if (rows === null || count === null) return <NeedsYouSkeleton />;

  const today = mountainToday(new Date());
  const visible = rows.filter((row) => inFilter(row, filter));
  const selectedRow = rows.find((row) => row.key === selected) ?? null;
  const batchRow = rows.find((row) => row.key === batchKey) ?? null;
  const allClear = rows.length === 0 && count.decisions === 0;
  // A failed answer on the open item shows its block in the docked panel; the
  // phone's floats above the page, and anything else rides above the list.
  const failureInPanel =
    failure !== null &&
    failure.rowKey !== undefined &&
    selectedRow?.key === failure.rowKey &&
    !isPhone;
  const failureToast = failure && (
    <SaveFailedToast
      title={failure.title}
      saved={failure.saved}
      onRetry={failure.retry}
      onDismiss={() => setFailure(null)}
    />
  );

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
          {/* All clear draws the title alone: the card says the rest. */}
          {!allClear && (
            <p style={{ margin: 0, fontSize: 14.5, color: 'var(--fg-muted)' }}>
              {COPY.summary(count.decisions, count.handledToday)}
            </p>
          )}
        </header>

        {allClear ? (
          <AllClear
            handledToday={count.handledToday}
            facts={facts}
            now={new Date()}
          />
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

            {failure && !failureInPanel && (
              // The phone's item page covers the list, so the toast of a
              // failed answer rides above it instead of sitting underneath.
              <div
                style={
                  isPhone && selectedRow
                    ? {
                        position: 'fixed',
                        left: 16,
                        right: 16,
                        bottom: 'calc(120px + env(safe-area-inset-bottom))',
                        zIndex: 100,
                      }
                    : undefined
                }
              >
                {failureToast}
              </div>
            )}
            <div
              data-testid="needs-you-queue"
              aria-label={COPY.list}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              {visible.map((row, index) => (
                <Fragment key={row.key}>
                  {answeredRow(index)}
                  <QueueItem
                    row={row}
                    today={today}
                    selected={row.key === selected}
                    busy={busyKey === row.key}
                    onSelect={() => select(row.key)}
                    onAnswer={(answer) => onAnswer(row, answer)}
                    onSnooze={(until) =>
                      void runSnooze(row, () => api.snooze(row.key, until))
                    }
                    onNotUseful={(reason) =>
                      void runSnooze(row, () => api.notUseful(row.key, reason))
                    }
                  />
                </Fragment>
              ))}
              {answeredRow(visible.length)}
              {visible.length === 0 && !answered && (
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
          answerFailed={failureInPanel ? failureToast : undefined}
          today={today}
          ranksFirst={rows[0]?.key === selectedRow.key}
          busy={busyKey === selectedRow.key}
          onClose={() => select(null)}
          onAnswer={(answer, params) => onAnswer(selectedRow, answer, params)}
          onSnooze={(until) =>
            void runSnooze(selectedRow, () =>
              api.snooze(selectedRow.key, until),
            )
          }
          onNotUseful={(reason) =>
            void runSnooze(selectedRow, () =>
              api.notUseful(selectedRow.key, reason),
            )
          }
        />
      )}

      {batchRow && (
        <PriceBatchSheet
          row={{ key: batchRow.key, submissionIds: batchRow.submissionIds }}
          onApprove={(ids) => approveBatch(batchRow, ids)}
          onClose={() => setBatchKey(null)}
        />
      )}

      {pausing && pausing.row.venueId && (
        <PausePanel
          venues={[
            {
              id: pausing.row.venueId,
              name: pausing.row.venueName ?? pausing.row.title,
              eventCount: pausing.row.showCount ?? 0,
            },
          ]}
          onClose={() => setPausing(null)}
          onSubmit={async (body) => {
            const { row, answer } = pausing;
            try {
              const result = await api.pause(row.key, answer.slug, body);
              setPausing(null);
              settle(
                row,
                {
                  // The label's "..." only says a panel opens first.
                  line: COPY.answered(
                    answeredName(row.title),
                    answer.label.replace(/\.\.\.$/, ''),
                  ),
                  auditId: result.undoable ? result.auditId : null,
                },
                true,
              );
              return null;
            } catch (err) {
              // The API's 422 is a date it won't take; the panel words it.
              if (refusedStatus(err) === 422)
                return ADMIN_COPY.pausePanel.dateError('');
              return `${COPY.answerFailed.title}. ${COPY.answerFailed.saved}`;
            }
          }}
        />
      )}

      {pending && (
        <ConfirmDialog
          tone="danger"
          title={COPY.confirmNotify.title(pending.answer.label)}
          body={COPY.confirmNotify.body}
          confirmLabel={pending.answer.label}
          onConfirm={() => {
            const { row, answer, params } = pending;
            setPending(null);
            void runAnswer(row, answer, params);
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
};
