'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, GitCompare } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  RowMenu,
  useIsPhone,
  type RowMenuItem,
} from '@/components/admin/primitives';
import { SafeExternalLink } from '@/components/admin/SafeExternalLink';
import { usePageTitle } from '@/components/admin/shell/PageTitleContext';
import { RunChip } from '@/components/admin/crawl-runs/RunChip';
import type { RunPage, RunRow } from '@/components/admin/crawl-runs/run-data';
import {
  inspectHref,
  pageLine,
  shortUrl,
  type LastFullRun,
} from '@/components/admin/crawl-runs/runs-rules';
import {
  shortDate,
  shortTime,
} from '@/components/admin/venues/overview/overview-rules';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';
import { venueRunHref } from '@/lib/admin/venue-tabs';
import { InspectFetched } from './InspectFetched';
import { InspectCouldntLoad, PagesGone, stateButton } from './InspectStates';

const COPY = ADMIN_COPY.inspect;

export interface InspectVenue {
  id: string;
  name: string;
  websiteUrl: string;
  /** The venue's newest run, for Inspect the latest run. */
  latestRunId: string | null;
}

export interface InspectClientProps {
  venue: InspectVenue;
  run: RunRow;
  /** The run's pages, oldest first; null when they couldn't load. */
  pages: RunPage[] | null;
  /** The page shown: `?page=`, else the default. Null with no pages. */
  page: RunPage | null;
  /** The last `success` run before this one: Compare's target. */
  compare: LastFullRun | null;
}

/** Venues / {Venue} / Runs / Inspect, in the shell's topbar. */
const useInspectCrumbs = (venue: InspectVenue, runId: string) => {
  const { setPageTrail } = usePageTitle();
  useEffect(() => {
    setPageTrail([
      { label: venue.name, href: `/admin/venues/${venue.id}` },
      { label: COPY.runsCrumb, href: venueRunHref(venue.id, runId) },
      { label: COPY.crumb },
    ]);
    return () => setPageTrail(null);
  }, [venue.id, venue.name, runId, setPageTrail]);
};

/**
 * The header (`04/inspect-a-fetched-page`, `G2/inspect-fetched`):
 * "Inspect · {host+path}", the run chip, and the run's line. Desktop has
 * Open the live page and Compare with {date} as buttons; the phone moves both
 * into ⋯ (`G2/inspect-menu`) under a "{Venue} · Runs" back link, and the
 * shell's phone title already reads Inspect.
 */
const Header = ({
  venue,
  run,
  page,
  compare,
  liveUrl,
  phone,
}: Omit<InspectClientProps, 'pages'> & { liveUrl: string; phone: boolean }) => {
  const router = useRouter();
  const host = shortUrl(page?.url ?? liveUrl, null);
  const date = shortDate(run.createdAt);
  const time = shortTime(run.createdAt);
  const size = page === null ? [] : [pageLine(page)];
  const compareHref =
    compare === null ? null : inspectHref(venue.id, compare.id);
  const compareLabel =
    compare === null
      ? null
      : ADMIN_COPY.runDetail.compare(shortDate(compare.at));
  const chipLine = (line: string) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: phone ? 8 : 6,
      }}
    >
      <RunChip run={run} />
      <span
        data-testid="inspect-line"
        style={{ fontSize: phone ? 12.5 : 13, color: 'var(--fg-muted)' }}
      >
        {line}
      </span>
    </div>
  );

  if (phone) {
    const items: RowMenuItem[] = [
      ...(isSafeHttpUrl(liveUrl)
        ? [
            {
              key: 'live',
              icon: ExternalLink,
              label: COPY.openLive,
              hint: COPY.openLiveHint(host),
              onSelect: () => {
                window.open(liveUrl, '_blank', 'noopener,noreferrer');
              },
            },
          ]
        : []),
      ...(compareHref !== null && compareLabel !== null
        ? [
            {
              key: 'compare',
              icon: GitCompare,
              label: compareLabel,
              hint: COPY.compareHint,
              onSelect: () => router.push(compareHref),
            },
          ]
        : []),
    ];
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href={venueRunHref(venue.id, run.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 0,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--fg-muted)',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} aria-hidden />
            {COPY.back(venue.name)}
          </Link>
          <span style={{ flex: 1 }} />
          {items.length > 0 && (
            <RowMenu
              label={COPY.menuLabel}
              items={items}
              width={300}
              testId="inspect-menu"
              triggerStyle={{ padding: 8 }}
            />
          )}
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12.5,
            overflowWrap: 'anywhere',
          }}
        >
          {host}
        </div>
        {chipLine(COPY.meta([COPY.runOfLead(date, time), ...size]))}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 800,
            overflowWrap: 'anywhere',
          }}
        >
          {COPY.title(host)}
        </h1>
        {chipLine(COPY.meta([venue.name, COPY.runOf(date, time), ...size]))}
      </div>
      <SafeExternalLink href={liveUrl} style={stateButton(false, false)}>
        <ExternalLink size={14} aria-hidden />
        {COPY.openLive}
      </SafeExternalLink>
      {compareHref !== null && (
        <Link href={compareHref} style={stateButton(false, false)}>
          {compareLabel}
        </Link>
      )}
    </div>
  );
};

/**
 * Inspect a fetched page (3b part 5): `/admin/venues/[id]/inspect/[runId]`.
 * The page switcher is the run detail's PAGES list, so there is none here.
 */
export const InspectClient = (props: InspectClientProps) => {
  const { venue, run, pages, page } = props;
  const phone = useIsPhone();
  const router = useRouter();
  useInspectCrumbs(venue, run.id);
  // The live page is the fetched URL, else the venue's site.
  const liveUrl = page?.url ?? venue.websiteUrl;
  // Inspect the latest run, when there is another run to go to.
  const latestRunHref =
    venue.latestRunId === null || venue.latestRunId === run.id
      ? null
      : inspectHref(venue.id, venue.latestRunId);

  return (
    <div
      data-testid="inspect"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        minWidth: 0,
        paddingBottom: 32,
      }}
    >
      <Header {...props} liveUrl={liveUrl} phone={phone} />
      {pages === null ? (
        <InspectCouldntLoad
          liveUrl={liveUrl}
          onRetry={() => router.refresh()}
          phone={phone}
        />
      ) : page === null ? (
        <PagesGone
          kind="no_pages"
          liveUrl={liveUrl}
          latestRunHref={latestRunHref}
          phone={phone}
        />
      ) : (
        <InspectFetched
          // A new page starts from its own default tab and body.
          key={page.id}
          page={page}
          pages={pages}
          liveUrl={liveUrl}
          latestRunHref={latestRunHref}
          phone={phone}
        />
      )}
    </div>
  );
};
