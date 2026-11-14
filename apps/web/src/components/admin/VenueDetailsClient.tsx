'use client';

import { useState, useRef, useEffect } from 'react';
import type { VenueGuide, VenueWithCrawlHealth } from '@concert-crawl/types';
import { AdminTabs, useIsPhone } from '@/components/admin/primitives';
import {
  VENUE_TABS,
  venueTabHref,
  type VenueTab,
} from '@/lib/admin/venue-tabs';
import { VenueGuideBlock } from '@/components/admin/venue-guide/VenueGuideBlock';
import { VenueHeader } from '@/components/admin/venues/VenueHeader';
import { useRecrawl } from '@/components/admin/venues/useRecrawl';
import { recrawlOff } from '@/components/admin/venues/venue-header-rules';
import { OverviewTab } from '@/components/admin/venues/overview/OverviewTab';
import { SourceTab } from '@/components/admin/venues/source/SourceTab';
import { DetailsTab } from '@/components/admin/venues/details/DetailsTab';
import type { OverviewData } from '@/components/admin/venues/overview/overview-data';
import { RunsTab } from '@/components/admin/venues/runs/RunsTab';
import type { RunsPage } from '@/components/admin/crawl-runs/run-data';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { usePageTitle } from '@/components/admin/shell/PageTitleContext';

interface Props {
  venue: VenueWithCrawlHealth;
  /** #764 first-timer guide draft, fetched server-side alongside the venue. */
  guide?: VenueGuide;
  /** True when that fetch failed — authoring is disabled so an empty fallback
      draft can't be saved over real chips. */
  guideLoadFailed?: boolean;
  /** The tab `?tab=` opened on (3b); Overview when absent. */
  initialTab?: VenueTab;
  /** Overview's runs and Needs you fetches; null where one failed. */
  overview?: OverviewData;
  /** The Runs tab's first page (null when it failed) and the `?run=` to highlight. */
  runs?: { runs: RunsPage | null; initialRun: string | null };
}

const NO_OVERVIEW: OverviewData = { runs: [], needsYou: [], snoozes: [] };
const NO_RUNS: NonNullable<Props['runs']> = {
  runs: { rows: [], returned: 0 },
  initialRun: null,
};

const TAB_COPY = ADMIN_COPY.venueDetailsClient.tabs;
const VENUE_TAB_LABEL: Record<VenueTab, string> = {
  overview: TAB_COPY.overview,
  runs: TAB_COPY.runs,
  source: TAB_COPY.source,
  details: TAB_COPY.details,
  guide: TAB_COPY.guide,
};
const VENUE_TAB_ITEMS = VENUE_TABS.map((key) => ({
  key,
  label: VENUE_TAB_LABEL[key],
}));
const venueTabId = (key: VenueTab) => `venue-tab-${key}`;
const venuePanelId = (key: VenueTab) => `venue-panel-${key}`;

/**
 * One tab's panel. Every panel stays mounted, only hidden, so a tab's unsaved
 * edit and its own Save bar survive a tab switch (3b part 1).
 */
function VenueTabPanel({
  tab,
  active,
  children,
}: {
  tab: VenueTab;
  active: VenueTab;
  children: React.ReactNode;
}) {
  const on = tab === active;
  return (
    <div
      id={venuePanelId(tab)}
      role="tabpanel"
      aria-labelledby={venueTabId(tab)}
      hidden={!on}
      tabIndex={0}
      data-testid={`venue-panel-${tab}`}
      // An inline display would beat `hidden`, so a hidden panel sets none.
      style={
        on ? { display: 'flex', flexDirection: 'column', gap: 16 } : undefined
      }
    >
      {children}
    </div>
  );
}

const EMPTY_GUIDE: VenueGuide = {
  chips: [],
  insiderTip: null,
  publishedAt: null,
};

/**
 * The venue page's shell (3b): the header, the tab strip and the five
 * panels. Each tab owns its fields and its Save bar; Source (part 6) and
 * Details (part 5) save only their own columns.
 */
export function VenueDetailsClient({
  venue,
  guide = EMPTY_GUIDE,
  guideLoadFailed = false,
  initialTab = 'overview',
  overview = NO_OVERVIEW,
  runs = NO_RUNS,
}: Props) {
  const isPhone = useIsPhone();
  // One re-crawl for the page: the header's Re-crawl and Overview's Re-crawl
  // anyway read and start the same one.
  const recrawl = useRecrawl(venue.id, recrawlOff(venue) !== null);
  const [tab, setTab] = useState<VenueTab>(initialTab);
  // A navigation to another `?tab=` re-renders the page with a new initial
  // tab; follow it (adjusting state during render, not in an effect).
  const [tabFromUrl, setTabFromUrl] = useState<VenueTab>(initialTab);
  if (tabFromUrl !== initialTab) {
    setTabFromUrl(initialTab);
    setTab(initialTab);
  }
  const tablistRef = useRef<HTMLDivElement | null>(null);
  /**
   * Client-only: the tab lives in state and the URL follows through
   * `history.replaceState`, which the App Router syncs with
   * `useSearchParams` without a server round trip, so nothing re-renders
   * the page or shows `loading.tsx`. The server reads `?tab=` on first load.
   */
  const changeTab = (next: VenueTab) => {
    if (next === tab) return;
    setTab(next);
    window.history.replaceState(
      window.history.state,
      '',
      venueTabHref(venue.id, next),
    );
    // Scroll ruling: a strip scrolled above the fold comes back into view, so
    // the new panel starts at its top; otherwise the page stays put.
    const strip = tablistRef.current;
    if (strip && strip.getBoundingClientRect().top < 0) {
      strip.scrollIntoView({ block: 'start' });
    }
  };
  const { setPageTitle, setPhoneBack } = usePageTitle();

  useEffect(() => {
    setPageTitle(venue.name);
    return () => setPageTitle(null);
  }, [venue.name, setPageTitle]);

  // The phone boards (venue-overview-m, source-feed-edited) draw "‹ Venues"
  // above the venue's own header, in place of the shared title bar.
  useEffect(() => {
    setPhoneBack({ label: ADMIN_COPY.venuesList.title, href: '/admin/venues' });
    return () => setPhoneBack(null);
  }, [setPhoneBack]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        maxWidth: 1080,
        paddingBottom: 32,
        position: 'relative',
      }}
    >
      {/* The venue header holds the page's one h1 (the venue name). */}
      <VenueHeader venue={venue} recrawl={recrawl} />

      <AdminTabs
        tabs={VENUE_TAB_ITEMS}
        value={tab}
        onChange={changeTab}
        label={TAB_COPY.label}
        tabId={venueTabId}
        panelId={venuePanelId}
        phone={isPhone}
        tablistRef={tablistRef}
        testId="venue-tabs"
      />

      <VenueTabPanel tab="overview" active={tab}>
        <OverviewTab venue={venue} data={overview} recrawl={recrawl} />
      </VenueTabPanel>

      <VenueTabPanel tab="runs" active={tab}>
        <RunsTab
          venueId={venue.id}
          runs={runs.runs}
          initialRun={runs.initialRun}
          active={tab === 'runs'}
        />
      </VenueTabPanel>

      <VenueTabPanel tab="details" active={tab}>
        <DetailsTab venue={venue} />
      </VenueTabPanel>

      <VenueTabPanel tab="source" active={tab}>
        <SourceTab venue={venue} />
      </VenueTabPanel>

      <VenueTabPanel tab="guide" active={tab}>
        {/* #764 first-timer guide — its own resource with its own publish
            gate, so it renders as a standalone block. */}
        <VenueGuideBlock
          venueId={venue.id}
          venueName={venue.name}
          initialGuide={guide}
          loadFailed={guideLoadFailed}
        />
      </VenueTabPanel>

      {/* The old danger zone's controls live in the header's ⋯ now. */}
    </div>
  );
}
