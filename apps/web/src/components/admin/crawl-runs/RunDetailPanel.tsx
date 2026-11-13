'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { ExternalLink } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminSheet,
  CouldntLoad,
  MonoLabel,
  SidePanel,
  StatusBadge,
} from '@/components/admin/primitives';
import { SafeExternalLink } from '@/components/admin/SafeExternalLink';
import { apiClient } from '@/lib/api';
import {
  runWhen,
  shortDate,
} from '@/components/admin/venues/overview/overview-rules';
import { RunChip } from './RunChip';
import { parseRunPages, type RunPage, type RunRow } from './run-data';
import {
  defaultInspectPage,
  firstFailedPage,
  inspectHref,
  isFailedPage,
  pageLine,
  runCost,
  runDuration,
  runSummary,
  shortUrl,
  type LastFullRun,
} from './runs-rules';

const COPY = ADMIN_COPY.runDetail;

/** The panel's width on desktop (A3 row 33). */
export const RUN_DETAIL_WIDTH = 440;

type PagesState =
  | { key: string; kind: 'failed' }
  | { key: string; kind: 'loaded'; pages: RunPage[] };

/**
 * A run's pages, fetched when the detail opens. The result is keyed by run
 * and attempt, so a stale answer never shows under another run and loading
 * is derived rather than set. `getToken` sits in a ref: Clerk may hand over
 * a new function on any render, and that must not fetch the pages again.
 */
const useRunPages = (runId: string) => {
  const { getToken } = useAuth();
  const tokenRef = useRef(getToken);
  useEffect(() => {
    tokenRef.current = getToken;
  });
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PagesState | null>(null);
  const key = `${runId}:${attempt}`;
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const token = await tokenRef.current();
        if (!token) throw new Error('No session token');
        const raw = await apiClient.get<unknown>(
          `/v1/admin/crawl/runs/${encodeURIComponent(runId)}/pages`,
          token,
        );
        const pages = parseRunPages(raw);
        if (pages === null) throw new Error('Unexpected pages shape');
        if (live) setState({ key, kind: 'loaded', pages });
      } catch (err: unknown) {
        console.error('RunDetailPanel: could not load pages', { runId, err });
        if (live) setState({ key, kind: 'failed' });
      }
    };
    void load();
    return () => {
      live = false;
    };
  }, [runId, key]);
  return {
    state: state?.key === key ? state : null,
    retry: () => setAttempt((count) => count + 1),
  };
};

/**
 * A page's URL as the board shortens it, as a link to the full URL, which is
 * also its accessible name. Never a hover tooltip (no `title=`, house rule).
 * A redirect shows where it landed after it: "→ …/events/2026". `firstUrl` is
 * null for the first page.
 */
const PageUrl = ({
  page,
  firstUrl,
}: {
  page: RunPage;
  firstUrl: string | null;
}) => {
  const { url, finalUrl } = page;
  const redirected = finalUrl !== null && finalUrl !== url;
  return (
    <span
      data-testid="run-page-url"
      style={{
        color: 'var(--fg-muted)',
        minWidth: 0,
        overflowWrap: 'anywhere',
      }}
    >
      <SafeExternalLink href={url} ariaLabel={url} style={{ color: 'inherit' }}>
        {shortUrl(url, firstUrl)}
      </SafeExternalLink>
      {redirected && (
        <span data-testid="run-page-redirect" style={{ marginLeft: 6 }}>
          {COPY.redirectedTo(shortUrl(finalUrl, url))}
        </span>
      )}
    </span>
  );
};

const Pages = ({
  venueId,
  runId,
  state,
  retry,
}: {
  venueId: string;
  runId: string;
  state: PagesState | null;
  retry: () => void;
}) => {
  if (state === null) {
    return (
      <div
        role="status"
        style={{ fontSize: 13, color: 'var(--fg-muted)', padding: '8px 0' }}
      >
        {COPY.loadingPages}
      </div>
    );
  }
  if (state.kind === 'failed') {
    return <CouldntLoad page={COPY.pagesPage} onRetry={retry} />;
  }
  const { pages } = state;
  if (pages.length === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--fg-muted)', padding: '8px 0' }}>
        {COPY.noPages}
      </div>
    );
  }
  const firstUrl = pages[0]?.url ?? '';
  const marked = firstFailedPage(pages);
  return (
    <ul
      data-testid="run-pages"
      style={{ listStyle: 'none', margin: 0, padding: 0 }}
    >
      {pages.map((page, index) => (
        <li
          key={page.id}
          data-testid="run-page"
          data-first-failure={index === marked || undefined}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 12,
            fontSize: 13,
            padding: '8px 0',
            borderTop: '1px solid var(--border)',
          }}
        >
          <PageUrl page={page} firstUrl={index === 0 ? null : firstUrl} />
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              gap: 8,
              textAlign: 'right',
              flex: 'none',
              color: isFailedPage(page) ? 'var(--danger)' : 'var(--fg)',
            }}
          >
            {index === marked && (
              <StatusBadge kind="danger">{COPY.firstFailure}</StatusBadge>
            )}
            {pageLine(page)}
            <Link
              href={inspectHref(venueId, runId, { page: page.id })}
              aria-label={COPY.inspectRowLabel(page.url)}
              data-testid="run-page-inspect"
              style={{ color: 'var(--fg)', fontWeight: 600 }}
            >
              {COPY.inspectRow}
            </Link>
          </span>
        </li>
      ))}
    </ul>
  );
};

const actionLink = (primary: boolean, phone: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: phone ? (primary ? 46 : 40) : 32,
  padding: '0 12px',
  borderRadius: 9,
  fontSize: phone && primary ? 15 : phone ? 13 : 12.5,
  fontWeight: phone && primary ? 700 : 600,
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  ...(phone && primary
    ? {
        // AdminButton's `gradient`, the sheet's main action.
        background: 'linear-gradient(135deg, var(--signal), var(--accent))',
        color: 'var(--bg)',
        border: '1px solid transparent',
      }
    : {
        background: 'var(--surface-2)',
        color: 'var(--fg)',
        border: '1px solid var(--border-strong)',
      }),
});

/**
 * Inspect page and Compare with {date}. Inspect opens on the first failed
 * page, else the first, once the pages are in; before then (or when they
 * couldn't load) the route picks the same default itself. A run whose pages
 * loaded and are none has nothing to inspect, so neither shows. Compare's
 * target is the run's last full run, from the list's one `lastFullRuns` map,
 * on the same page by URL, and shows only with one.
 */
const Actions = ({
  venueId,
  run,
  pages,
  compare,
  phone,
}: {
  venueId: string;
  run: RunRow;
  /** The loaded pages; null while loading or when they couldn't load. */
  pages: readonly RunPage[] | null;
  compare: LastFullRun | null;
  phone: boolean;
}) => {
  if (pages !== null && pages.length === 0) return null;
  const target = pages === null ? null : defaultInspectPage(pages);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: phone ? 'column' : 'row',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <Link
        href={inspectHref(venueId, run.id, { page: target?.id })}
        style={actionLink(true, phone)}
      >
        {!phone && <ExternalLink size={14} aria-hidden />}
        {COPY.inspect}
      </Link>
      {compare !== null && (
        <Link
          href={inspectHref(venueId, compare.id, { url: target?.url })}
          style={actionLink(false, phone)}
        >
          {COPY.compare(shortDate(compare.at))}
        </Link>
      )}
    </div>
  );
};

/**
 * One run's detail (`07/a-runs-detail`, `G2/run-detail-sheet`): the chip,
 * "{date} · {time} · {duration} · {cost}", the summary, the pages it fetched
 * with the first failure marked, and Inspect page and Compare. Desktop is a
 * 440 overlay side panel; the phone a bottom sheet. Shared with 1d's Crawl
 * runs page, so it reads only the run and its last full run.
 *
 * HOLD: HOW WE READ IT, "usually 90–120", This is normal, the page timeout
 * reason, "by @handle" and the Test chip.
 */
export const RunDetailPanel = ({
  venueId,
  run,
  lastFullRun,
  phone,
  onClose,
}: {
  venueId: string;
  run: RunRow;
  /** The next older `success` run loaded: Unchanged's date and Compare. */
  lastFullRun: LastFullRun | null;
  phone: boolean;
  onClose: () => void;
}) => {
  const { state: pagesState, retry } = useRunPages(run.id);
  const summary = runSummary(run, lastFullRun);
  const meta = COPY.meta([
    runWhen(run.createdAt),
    ...(run.durationMs === null ? [] : [runDuration(run.durationMs)]),
    runCost(run.llmCostUsd),
  ]);
  const body = (
    <div
      data-testid="run-detail"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {summary.body !== null && (
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>
          {summary.body}
        </p>
      )}
      <div>
        <div style={{ marginBottom: 8 }}>
          <MonoLabel>{COPY.pages}</MonoLabel>
        </div>
        <Pages
          venueId={venueId}
          runId={run.id}
          state={pagesState}
          retry={retry}
        />
      </div>
      <Actions
        venueId={venueId}
        run={run}
        pages={pagesState?.kind === 'loaded' ? pagesState.pages : null}
        compare={lastFullRun}
        phone={phone}
      />
    </div>
  );

  if (phone) {
    return (
      <AdminSheet
        onClose={onClose}
        label={summary.title}
        title={
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span>{summary.title}</span>
            <RunChip run={run} />
          </span>
        }
        subtitle={meta}
      >
        {body}
      </AdminSheet>
    );
  }
  return (
    <SidePanel
      onClose={onClose}
      width={RUN_DETAIL_WIDTH}
      eyebrow={<RunChip run={run} />}
      title={summary.title}
      subtitle={meta}
    >
      {body}
    </SidePanel>
  );
};
