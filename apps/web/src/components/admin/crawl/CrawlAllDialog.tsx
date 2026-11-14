'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { MapPin, RefreshCw } from 'lucide-react';
import { z } from 'zod';
import type { CrawlAllSkipReason } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  AdminDialog,
  AdminSheet,
  SaveFailedToast,
  Spinner,
  useIsPhone,
  useIsPhoneResolved,
} from '@/components/admin/primitives';
import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import {
  formatMtTime,
  formatUsd,
} from '@/components/admin/health/health-model';
import { apiClient } from '@/lib/api';

const COPY = ADMIN_COPY.crawl.crawlAll;

/** The same POST the old Run all made: it queues every eligible venue. */
export const CRAWL_ALL_ENDPOINT = '/api/admin/crawl/run-all';

/** `09/crawl-all-failed-m`'s toast shadow (07/save-failed draws .4). */
const FAILED_SHADOW = '0 14px 30px rgba(0,0,0,.45)';

/**
 * `GET /v1/admin/crawl/estimate`, checked at the boundary. A skip reason this
 * build doesn't know yet is kept as its raw word rather than dropping the row.
 */
const estimateSchema = z.object({
  total: z.number(),
  eligible: z.number(),
  skipped: z.array(z.object({ name: z.string(), reason: z.string() })),
  usual: z.object({ durationMs: z.number(), costUsd: z.number() }).nullable(),
  // The next daily crawl, ISO; shown in Mountain Time.
  // Optional so a web deploy ahead of the API still reads the estimate.
  nextCrawlAt: z.string().datetime().nullable().optional(),
});
export type CrawlAllEstimateView = z.infer<typeof estimateSchema>;

const isKnownReason = (reason: string): reason is CrawlAllSkipReason =>
  Object.prototype.hasOwnProperty.call(COPY.skipReason, reason);

const skipLabel = (reason: string): string =>
  isKnownReason(reason) ? COPY.skipReason[reason] : reason;

/**
 * The body sentence (addendum-3 row 16, used on desktop too). The Skipped
 * sentence goes when nothing is skipped, and the time and cost sentence goes
 * when there is no history (ruling 17).
 */
export const crawlAllBody = (estimate: CrawlAllEstimateView): string => {
  const parts = [COPY.crawled(estimate.eligible, estimate.total)];
  if (estimate.skipped.length > 0) {
    parts.push(
      COPY.skipped(
        estimate.skipped
          .map((venue) =>
            COPY.skippedVenue(venue.name, skipLabel(venue.reason)),
          )
          .join(', '),
      ),
    );
  }
  if (estimate.usual) {
    const minutes = Math.max(1, Math.round(estimate.usual.durationMs / 60000));
    parts.push(COPY.usual(minutes, formatUsd(estimate.usual.costUsd)));
  }
  return parts.join(' ');
};

type EstimateState =
  | { key: number; kind: 'failed' }
  | { key: number; kind: 'loaded'; estimate: CrawlAllEstimateView };

/**
 * The estimate, fetched when the dialog opens and again on Try again. Keyed
 * by attempt so loading is derived; `getToken` sits in a ref because Clerk
 * may hand over a new function on any render (as RunDetailPanel).
 */
const useEstimate = () => {
  const { getToken } = useAuth();
  const tokenRef = useRef(getToken);
  useEffect(() => {
    tokenRef.current = getToken;
  });
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<EstimateState | null>(null);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const token = await tokenRef.current();
        if (!token) throw new Error('No session token');
        const raw = await apiClient.get<unknown>(
          '/v1/admin/crawl/estimate',
          token,
        );
        const parsed = estimateSchema.safeParse(raw);
        if (!parsed.success) throw new Error('Unexpected estimate shape');
        if (live)
          setState({ key: attempt, kind: 'loaded', estimate: parsed.data });
      } catch (err: unknown) {
        // Handled (the toast says so), so a warning, not an error.
        console.warn('CrawlAllDialog: could not load the estimate', { err });
        if (live) setState({ key: attempt, kind: 'failed' });
      }
    };
    void load();
    return () => {
      live = false;
    };
  }, [attempt]);
  return {
    state: state?.key === attempt ? state : null,
    retry: () => setAttempt((count) => count + 1),
  };
};

/**
 * POST /v1/admin/crawl's 202 body. `count` is how many triggers it wrote: 0
 * when every venue became ineligible after the estimate was read.
 */
const postSchema = z.object({ data: z.object({ count: z.number() }) });

/** 44px on the phone sheet, 38px in the desktop modal, 9px corners on both. */
const buttonSize = (phone: boolean): CSSProperties =>
  phone
    ? { height: 44, borderRadius: 9, fontSize: 14 }
    : { height: 38, borderRadius: 9, fontSize: 13.5 };

const raised: CSSProperties = {
  background: 'var(--surface-2)',
  color: 'var(--fg)',
  fontWeight: 600,
};

type PostState = 'idle' | 'posting' | 'failed';

export interface CrawlAllDialogProps {
  onClose: () => void;
  /**
   * The POST was taken: the caller closes the dialog. `queuedCount` is the
   * number actually queued when it differs from the one confirmed, else null.
   */
  onStarted: (queuedCount: number | null) => void;
}

/**
 * Crawl all's confirm: a centred modal on desktop (`07/crawl-all-venues`), a
 * bottom sheet on the phone (addendum-3 `09/crawl-all-m`, with its starting,
 * failed and none states). Render it only while open.
 */
export const CrawlAllDialog = ({ onClose, onStarted }: CrawlAllDialogProps) => {
  // Null until the media query is read, so a phone never paints the desktop
  // modal for a frame first.
  const resolvedPhone = useIsPhoneResolved();
  const phone = resolvedPhone === true;
  const { state: estimateState, retry } = useEstimate();
  const [post, setPost] = useState<PostState>('idle');
  const postingRef = useRef(false);

  const start = async () => {
    if (postingRef.current) return;
    // The count the admin confirmed, read before the request goes out.
    const confirmed =
      estimateState?.kind === 'loaded' ? estimateState.estimate.eligible : null;
    postingRef.current = true;
    setPost('posting');
    try {
      const res = await fetch(CRAWL_ALL_ENDPOINT, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw: unknown = await res.json().catch((err: unknown) => {
        // The POST was taken; only its count is unknown, so it still counts
        // as started.
        console.warn('CrawlAllDialog: could not read the crawl-all response', {
          status: res.status,
          err,
        });
        return null;
      });
      const parsed = postSchema.safeParse(raw);
      const count = parsed.success ? parsed.data.data.count : null;
      if (count === 0) {
        // Nothing was queued: everything went ineligible since the count was
        // read. Count again so the dialog says what is true now.
        setPost('idle');
        retry();
        return;
      }
      // A different number than the one confirmed (venues changed in
      // between) is still a start, but the trigger names the real count.
      onStarted(count !== null && count !== confirmed ? count : null);
    } catch (err: unknown) {
      console.warn('CrawlAllDialog: could not start the crawl', { err });
      setPost('failed');
    } finally {
      postingRef.current = false;
    }
  };

  const posting = post === 'posting';
  const size = buttonSize(phone);
  const estimate =
    estimateState?.kind === 'loaded' ? estimateState.estimate : null;
  const none = estimate !== null && estimate.eligible === 0;

  const cancel = (
    <AdminButton
      type="button"
      variant="outline"
      disabled={posting}
      onClick={onClose}
      style={{
        ...size,
        ...raised,
        ...(posting && { cursor: 'default' }),
      }}
    >
      {none ? COPY.close : COPY.cancel}
    </AdminButton>
  );

  // Drawn but held until there is a count to confirm (loading, or the count
  // didn't load), dimmed as ConfirmDialog dims a confirm it holds.
  const held = estimate === null;
  const confirm = !none && (
    <AdminButton
      type="button"
      variant="gradient"
      {...(!posting && { icon: RefreshCw })}
      disabled={posting || held}
      onClick={() => void start()}
      style={{
        ...size,
        // Drawn 6 beside the refresh icon, 8 beside the starting spinner.
        gap: posting ? 8 : 6,
        ...(phone && { flex: 1 }),
        ...(posting && { opacity: 0.75, cursor: 'default' }),
        ...(held && { opacity: 0.45, cursor: 'default' }),
      }}
    >
      {posting && <Spinner size={16} />}
      {posting
        ? COPY.starting
        : estimate
          ? COPY.confirm(estimate.eligible)
          : COPY.confirmLoading}
    </AdminButton>
  );

  const openVenues = (
    <Link
      href="/admin/venues"
      style={{
        ...size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '0 12px',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        textDecoration: 'none',
        background: 'linear-gradient(135deg, var(--signal), var(--accent))',
        color: 'var(--bg)',
        border: '1px solid transparent',
      }}
    >
      <MapPin size={14} aria-hidden />
      {COPY.openVenues}
    </Link>
  );

  // One toast for a post that failed and for a count that didn't load. The
  // phone takes `09/crawl-all-failed-m`'s 12px and .45 shadow; desktop keeps
  // the primitive's `07/save-failed` defaults (12px 14px, .4).
  const toastLook = phone ? { padding: '12px', shadow: FAILED_SHADOW } : {};
  const failedToast =
    post === 'failed' ? (
      <SaveFailedToast
        title={COPY.failedTitle}
        body={COPY.failedBody}
        onRetry={() => void start()}
        {...toastLook}
      />
    ) : estimateState?.kind === 'failed' ? (
      <SaveFailedToast
        title={COPY.estimateFailedTitle}
        body={COPY.estimateFailedBody}
        onRetry={retry}
        {...toastLook}
      />
    ) : null;

  const muted: CSSProperties = {
    fontSize: 13.5,
    lineHeight: 1.5,
    color: 'var(--fg-muted)',
  };

  let title: string = COPY.title;
  let body: ReactNode;
  let extra: ReactNode = null;
  if (estimateState === null) {
    // `10/panel-loading`: the title stays and the body is text bars (13px,
    // 6px corners, 380 then 340 wide, 20 apart, on --surface-2). The words
    // are for screen readers only.
    body = (
      <div
        data-testid="crawl-all-loading"
        style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        <span role="status" className="sr-only">
          {COPY.loading}
        </span>
        <SkeletonBlock width="min(380px, 100%)" height={13} radius={6} />
        <SkeletonBlock width="min(340px, 100%)" height={13} radius={6} />
      </div>
    );
  } else if (estimate === null) {
    // The count didn't load: the title stays, the failed toast says so.
  } else if (none) {
    title = COPY.noneTitle;
    body = COPY.noneBody(estimate.total);
  } else {
    body = crawlAllBody(estimate);
    // No next crawl (an API outside production, or one older than this
    // field): the line goes rather than naming a time that isn't true.
    extra = estimate.nextCrawlAt ? (
      <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
        {COPY.nightlyStillRuns(formatMtTime(estimate.nextCrawlAt))}
      </div>
    ) : null;
  }

  if (resolvedPhone === null) return null;

  if (phone) {
    return (
      <AdminSheet
        title={title}
        label={title}
        subtitle={
          body && (
            // Its own scroller, so a long Skipped list never pushes the
            // buttons off screen. It stays here rather than in the sheet's
            // scrolling children because the board draws it 6px under the
            // title, and the children sit the sheet's 12px gap below it. The
            // cap is the sheet's 90% less its fixed chrome (handle, title,
            // Tonight's line, buttons, gaps and padding, about 200px).
            <div
              data-testid="crawl-all-body"
              style={{
                ...muted,
                marginTop: 2,
                maxHeight: 'calc(90dvh - 200px - env(safe-area-inset-bottom))',
                overflowY: 'auto',
              }}
            >
              {body}
            </div>
          )
        }
        onClose={onClose}
        dismissible={!posting}
        // None: Close first in the DOM so focus opens on it, painted below
        // Open Venues as drawn.
        footerReversed={none}
        footer={
          none ? (
            <>
              {cancel}
              {openVenues}
            </>
          ) : (
            // Cancel first in the DOM, so focus opens on it; it still paints
            // to the right of the confirm, as drawn.
            <div
              style={{ display: 'flex', flexDirection: 'row-reverse', gap: 8 }}
            >
              {cancel}
              {confirm}
            </div>
          )
        }
      >
        {extra}
        {failedToast && (
          // Floats above the sheet, as `09/crawl-all-failed-m` draws it. The
          // panel is its containing block, so the sheet's scroller can't clip it.
          // The panel spans the screen, so 12 here is 12px from each edge.
          <div
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              bottom: 'calc(100% + 12px)',
            }}
          >
            {failedToast}
          </div>
        )}
      </AdminSheet>
    );
  }

  return (
    <AdminDialog
      accent="var(--signal)"
      label={title}
      eyebrow=""
      heading={title}
      width={480}
      dismissible={!posting}
      onDismiss={onClose}
      footer={
        <>
          {cancel}
          {none ? openVenues : confirm}
        </>
      }
    >
      {body && (
        <div data-testid="crawl-all-body" style={{ ...muted, marginTop: 14 }}>
          {body}
        </div>
      )}
      {extra && <div style={{ marginTop: 14 }}>{extra}</div>}
      {failedToast && <div style={{ marginTop: 14 }}>{failedToast}</div>}
    </AdminDialog>
  );
};

/**
 * "Crawl all venues…" (`07/crawl-all-venues`, `09/crawl-all-m`): opens the
 * confirm. Full width on the phone.
 */
export const CrawlAllButton = () => {
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  // Set for 5 s after a start; `count` only when it differs from the
  // number confirmed.
  const [queued, setQueued] = useState<{ count: number | null } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <>
      <AdminButton
        type="button"
        variant="outline"
        icon={RefreshCw}
        disabled={queued !== null}
        onClick={() => setOpen(true)}
        data-testid="crawl-all-trigger"
        fullWidth={phone}
        style={{
          ...raised,
          height: phone ? 40 : 36,
          borderRadius: 9,
          fontSize: phone ? 13.5 : 13,
          ...(queued !== null && {
            color: 'var(--success)',
            cursor: 'default',
          }),
        }}
      >
        {queued === null
          ? COPY.trigger
          : queued.count === null
            ? COPY.queued
            : COPY.queuedCount(queued.count)}
      </AdminButton>
      {open && (
        <CrawlAllDialog
          onClose={() => setOpen(false)}
          onStarted={(queuedCount) => {
            setOpen(false);
            setQueued({ count: queuedCount });
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setQueued(null), 5000);
          }}
        />
      )}
    </>
  );
};
