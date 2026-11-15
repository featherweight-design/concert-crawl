'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useAuth } from '@clerk/nextjs';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminSheet,
  KindLabel,
  SaveFailedToast,
  SidePanel,
  Spinner,
} from '@/components/admin/primitives';
import { EMPTY_FILTERS } from '../list/events-rules';
import { eventsListApi } from '../list/events-api';
import {
  MergeTimeoutError,
  mergeApi,
  type MergeCandidate,
  type MergeListing,
  type MergePreview,
} from './merge-api';
import { buildMergeSummary, pickDetail, type KeepSide } from './merge-rules';
import { MergeCompareCard } from './MergeCompareCard';
import { MergePickList, type MergePickRow } from './MergePickList';

const COPY = ADMIN_COPY.eventEdit.merge;
const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_LIMIT = 10;
const MIN_QUERY = 2;

/** The listing Merge was opened from. */
export interface MergeCurrent {
  id: string;
  title: string;
  /** `YYYY-MM-DD`. */
  date: string;
  venueName: string | null;
  manual: boolean;
  watchers: number;
}

interface MergePanelProps {
  /** The opener's `useIsPhone()`, settled before the panel mounts. */
  phone: boolean;
  current: MergeCurrent;
  /** Which side of today `current` is on: past merges only with past. */
  when: 'upcoming' | 'past';
  onClose: () => void;
  /** The listing that was kept: the other one is gone. */
  onMerged: (keptId: string) => void;
}

/** One read per direction, fetched together when a candidate is picked. */
type Compare =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'past-mismatch' }
  | { status: 'ready'; keepFirst: MergePreview; keepSecond: MergePreview };

const SUMMARY: CSSProperties = {
  padding: 12,
  borderRadius: 10,
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  fontSize: 13,
  lineHeight: 1.45,
};

const candidateRow = (
  candidate: MergeCandidate,
  venueName: string | null,
): MergePickRow => ({
  id: candidate.id,
  title: candidate.title,
  date: candidate.date,
  detail: pickDetail({
    venueName,
    manual: candidate.manual,
    addedBy: candidate.addedBy,
    watchers: candidate.watchers,
  }),
});

/**
 * Merge duplicates (admin 4b E4, `06/merge-duplicates` and
 * `gap-1-merge-duplicates/*`): a side panel on desktop, a full screen on the
 * phone. Pick the other listing, compare the two, tap a card to move KEEP,
 * then merge into the one kept. The first listing is the one Merge was opened
 * from. The merge is silent and one transaction: a failure moves nothing.
 */
export const MergePanel = ({
  phone,
  current,
  when,
  onClose,
  onMerged,
}: MergePanelProps) => {
  const { getToken } = useAuth();
  const api = useMemo(() => mergeApi(getToken), [getToken]);
  const listApi = useMemo(() => eventsListApi(getToken), [getToken]);

  // Pick step.
  const [candidates, setCandidates] = useState<
    MergeCandidate[] | 'loading' | 'failed'
  >('loading');
  const [loadNonce, setLoadNonce] = useState(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MergePickRow[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);

  // Compare step.
  const [otherId, setOtherId] = useState<string | null>(null);
  const [keep, setKeep] = useState<KeepSide>('first');
  const [compare, setCompare] = useState<Compare>({ status: 'loading' });
  // Bumped after a refusal: the two rows may have changed since they were read.
  const [compareNonce, setCompareNonce] = useState(0);
  const [merging, setMerging] = useState(false);
  const [failed, setFailed] = useState(false);
  const mergingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setCandidates('loading');
    api.candidates(current.id, controller.signal).then(
      (rows) => {
        if (!controller.signal.aborted) setCandidates(rows);
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        console.error('[admin merge] candidates failed', err);
        setCandidates('failed');
      },
    );
    return () => controller.abort();
  }, [api, current.id, loadNonce]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      setResults(null);
      setSearching(false);
      setSearchFailed(false);
      return undefined;
    }
    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      listApi
        .list({ ...EMPTY_FILTERS, query: trimmed, when }, 0, SEARCH_LIMIT)
        .then(
          (page) => {
            if (controller.signal.aborted) return;
            setSearchFailed(false);
            setResults(
              page.rows
                // Nothing live to keep on a cancelled or delisted row, and the
                // pick list's own candidates leave them out too.
                .filter(
                  (row) =>
                    row.id !== current.id &&
                    row.status !== 'cancelled' &&
                    row.status !== 'delisted',
                )
                .map((row) => ({
                  id: row.id,
                  title: row.title,
                  date: row.date,
                  detail: pickDetail({
                    venueName: row.venueName,
                    manual: row.manual,
                    addedBy: null,
                    watchers: row.watchingCount,
                  }),
                })),
            );
            setSearching(false);
          },
          (err: unknown) => {
            if (controller.signal.aborted) return;
            console.error('[admin merge] search failed', err);
            setResults(null);
            setSearchFailed(true);
            setSearching(false);
          },
        );
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [listApi, query, when, current.id]);

  // Both directions at once, so moving KEEP is instant and never loads.
  useEffect(() => {
    if (otherId === null) return undefined;
    const controller = new AbortController();
    setCompare({ status: 'loading' });
    Promise.all([
      api.preview(current.id, otherId, controller.signal),
      api.preview(otherId, current.id, controller.signal),
    ]).then(
      ([first, second]) => {
        if (controller.signal.aborted) return;
        if (first.kind === 'preview' && second.kind === 'preview') {
          setCompare({
            status: 'ready',
            keepFirst: first.preview,
            keepSecond: second.preview,
          });
          return;
        }
        const mismatch = [first, second].some(
          (read) =>
            read.kind === 'not-mergeable' && read.reason === 'past_mismatch',
        );
        setCompare({ status: mismatch ? 'past-mismatch' : 'failed' });
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        console.error('[admin merge] preview failed', err);
        setCompare({ status: 'failed' });
      },
    );
    return () => controller.abort();
  }, [api, current.id, otherId, compareNonce]);

  const pick = useCallback((id: string) => {
    setOtherId(id);
    setKeep('first');
    setFailed(false);
  }, []);

  const preview =
    compare.status === 'ready'
      ? keep === 'first'
        ? compare.keepFirst
        : compare.keepSecond
      : null;

  const confirm = async () => {
    if (preview === null || mergingRef.current) return;
    mergingRef.current = true;
    setMerging(true);
    setFailed(false);
    // The kept row is the target; the other one is merged away.
    const keptId = preview.keptId;
    const sourceId = preview.sourceId;
    try {
      const outcome = await api.merge(sourceId, keptId);
      if (outcome === 'merged') {
        onMerged(keptId);
        return;
      }
      // Refused: a row went, or the pair stopped being mergeable. Read both
      // again, so a retry runs on what is true now (or the panel says why not).
      setFailed(true);
      setCompareNonce((nonce) => nonce + 1);
    } catch (err) {
      console.error('[admin merge] merge failed', err);
      // A timeout can land after the server committed. The source row is
      // deleted by a merge, so a 404 on it means this one went through.
      if (err instanceof MergeTimeoutError) {
        try {
          const reread = await api.preview(keptId, sourceId);
          if (reread.kind === 'not-found') {
            onMerged(keptId);
            return;
          }
        } catch (rereadErr) {
          console.error(
            '[admin merge] re-read after timeout failed',
            rereadErr,
          );
        }
      }
      setFailed(true);
    } finally {
      mergingRef.current = false;
      setMerging(false);
    }
  };

  const currentRow: MergePickRow = {
    id: current.id,
    title: current.title,
    date: current.date,
    detail: pickDetail({
      venueName: current.venueName,
      manual: current.manual,
      addedBy: null,
      watchers: current.watchers,
    }),
  };

  const comparing = otherId !== null;
  const buttonHeight = phone ? 46 : 40;
  const side = (which: KeepSide): MergeListing | null => {
    if (preview === null) return null;
    // `kept` is the listing being kept; the first listing is always `current`.
    const firstIsKept = keep === 'first';
    if (which === 'first') return firstIsKept ? preview.kept : preview.other;
    return firstIsKept ? preview.other : preview.kept;
  };
  const first = side('first');
  const second = side('second');

  const body = !comparing ? (
    <MergePickList
      current={currentRow}
      venueName={current.venueName}
      status={
        candidates === 'loading'
          ? 'loading'
          : candidates === 'failed'
            ? 'error'
            : 'ready'
      }
      likely={
        Array.isArray(candidates)
          ? candidates.map((row) => candidateRow(row, current.venueName))
          : []
      }
      onPick={pick}
      onRetry={() => setLoadNonce((nonce) => nonce + 1)}
      query={query}
      onQueryChange={setQuery}
      results={results}
      searching={searching}
      searchFailed={searchFailed}
    />
  ) : compare.status === 'loading' ? (
    <div
      aria-busy="true"
      data-testid="merge-compare-skeleton"
      style={{ display: 'grid', gap: 12 }}
    >
      <div style={{ ...SUMMARY, height: 150 }} />
      <div style={{ ...SUMMARY, height: 150 }} />
    </div>
  ) : compare.status !== 'ready' || preview === null ? (
    <div role="alert" style={SUMMARY} data-testid="merge-compare-failed">
      {compare.status === 'past-mismatch'
        ? COPY.pastMismatch
        : COPY.compareFailed}
    </div>
  ) : (
    <div style={{ display: 'grid', gap: 12 }}>
      {preview.sameVenue && preview.sameDay && (
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          {COPY.sameVenueAndDay}
        </div>
      )}
      <div
        role="radiogroup"
        aria-label={COPY.title}
        style={{ display: 'grid', gap: 12 }}
      >
        {first && (
          <MergeCompareCard
            listing={first}
            which="first"
            kept={keep === 'first'}
            onKeep={() => setKeep('first')}
            showVenueDay={!preview.sameVenue || !preview.sameDay}
            name="merge-keep"
            disabled={merging}
          />
        )}
        {second && (
          <MergeCompareCard
            listing={second}
            which="second"
            kept={keep === 'second'}
            onKeep={() => setKeep('second')}
            showVenueDay={!preview.sameVenue || !preview.sameDay}
            name="merge-keep"
            disabled={merging}
          />
        )}
      </div>
      <p style={{ ...SUMMARY, margin: 0 }} data-testid="merge-summary">
        {buildMergeSummary(preview, keep)}
      </p>
    </div>
  );

  const canMerge = preview !== null && !merging;
  const footer = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {failed && (
        <div
          // The phone floats it over the pinned bar (`merge-failed`).
          style={
            phone
              ? {
                  position: 'absolute',
                  left: 12,
                  right: 12,
                  bottom: 'calc(96px + env(safe-area-inset-bottom))',
                  zIndex: 1,
                }
              : undefined
          }
        >
          <SaveFailedToast
            title={COPY.failedTitle}
            body={COPY.failedBody}
            onRetry={() => void confirm()}
            retrying={merging}
            {...(phone && {
              padding: '12px',
              gap: 10,
              crossStroke: 2.2,
              shadow: '0 14px 30px rgba(0,0,0,.45)',
            })}
          />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        {comparing && (
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={!canMerge}
            aria-busy={merging || undefined}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              height: buttonHeight,
              padding: '0 12px',
              borderRadius: 9,
              border: '1px solid transparent',
              background:
                'linear-gradient(135deg, var(--signal), var(--cta-end, var(--accent)))',
              color: 'var(--fg-on-accent)',
              fontSize: phone ? 15 : 14,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: canMerge ? 'pointer' : 'default',
              opacity: merging ? 0.75 : canMerge ? 1 : 0.45,
              transition: 'opacity var(--motion-fast) var(--motion-ease)',
            }}
          >
            {merging && <Spinner size={16} tone="var(--fg-on-accent)" />}
            {merging ? COPY.merging : COPY.confirm(keep)}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          disabled={merging}
          style={{
            ...(comparing ? {} : { flex: 1 }),
            height: buttonHeight,
            padding: '0 12px',
            borderRadius: 9,
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-2)',
            color: 'var(--fg)',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: merging ? 'default' : 'pointer',
          }}
        >
          {COPY.cancel}
        </button>
      </div>
    </div>
  );

  const heading = phone ? COPY.phoneTitle : COPY.title;
  return phone ? (
    <AdminSheet
      fullScreen
      pageBackground
      pinnedFooter
      eyebrow={<KindLabel kind="merge" />}
      title={heading}
      subtitle={comparing ? COPY.sub : COPY.pickSub}
      backLabel={current.title}
      onClose={onClose}
      dismissible={!merging}
      footer={footer}
    >
      {body}
    </AdminSheet>
  ) : (
    <SidePanel
      eyebrow={<KindLabel kind="merge" />}
      title={COPY.title}
      subtitle={comparing ? COPY.sub : COPY.pickSub}
      onClose={onClose}
      dismissible={!merging}
      footer={footer}
    >
      {body}
    </SidePanel>
  );
};
