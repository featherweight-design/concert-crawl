'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { ChevronRight, RefreshCw } from 'lucide-react';
import type { VenueWithCrawlHealth } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  AdminCard as Card,
  AdminCardRow as Row,
  CouldntLoad,
  KindLabel,
  MonoLabel,
  SaveFailedToast,
  useIsPhone,
} from '@/components/admin/primitives';
import { ApiError, apiClient } from '@/lib/api';
import { venueRunHref, venueTabHref } from '@/lib/admin/venue-tabs';
import type { Recrawl } from '../useRecrawl';
import { headerLine, recrawlOff } from '../venue-header-rules';
import type { OverviewData, OverviewSnooze } from './overview-data';
import {
  LAST_RUNS,
  NEEDS_YOU_KIND_LABEL,
  isUnchanged,
  legendKinds,
  offSinceLine,
  runBars,
  runOutcome,
  runSentence,
  runWhen,
  shortDate,
  type BarKind,
} from './overview-rules';

const COPY = ADMIN_COPY.venueOverview;
const NEVER = ADMIN_COPY.venuesList.latestRun.never;

/** The board's 30px card buttons, drawn as links (`04/venue-overview`). */
const linkButton = (
  variant: 'outline' | 'ghost',
  grow: boolean,
): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 30,
  padding: '0 12px',
  borderRadius: 9,
  fontSize: 12.5,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  flex: grow ? 1 : 'none',
  ...(variant === 'outline'
    ? {
        background: 'var(--surface-2)',
        color: 'var(--fg)',
        border: '1px solid var(--border-strong)',
      }
    : {
        background: 'transparent',
        color: 'var(--fg-muted)',
        border: '1px solid transparent',
      }),
});

// ── Latest run ───────────────────────────────────────────────

const LatestRunCard = ({
  venue,
  recrawl,
  phone,
}: {
  venue: VenueWithCrawlHealth;
  recrawl: Recrawl;
  phone: boolean;
}) => {
  const run = venue.latestRun ?? null;
  if (run === null) {
    return (
      <Card
        title={COPY.latestRun.title}
        phone={phone}
        testId="overview-latest-run"
      >
        <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{NEVER}</div>
      </Card>
    );
  }
  const sentence = runSentence(run, venue.lastFullRun ?? null);
  const unchanged = isUnchanged(run);
  const off = recrawlOff(venue);
  const busy = recrawl.state === 'queued' || recrawl.state === 'running';
  return (
    <Card
      title={COPY.latestRun.title}
      phone={phone}
      testId="overview-latest-run"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          columnGap: 10,
        }}
      >
        <span
          data-testid="overview-run-outcome"
          style={{ fontSize: phone ? 18 : 20, fontWeight: 800 }}
        >
          {runOutcome(run)}
        </span>
        <span style={{ fontSize: phone ? 12.5 : 13, color: 'var(--fg-muted)' }}>
          {runWhen(run.at)}
        </span>
      </div>
      {sentence !== null && (
        <div
          data-testid="overview-run-sentence"
          style={{
            fontSize: phone ? 13.5 : 14,
            lineHeight: 1.5,
            overflowWrap: 'anywhere',
          }}
        >
          {sentence}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Link
          href={venueRunHref(venue.id, run.id)}
          style={{ ...linkButton('outline', phone), height: phone ? 32 : 30 }}
        >
          {COPY.latestRun.openRun}
        </Link>
        {unchanged && (
          <AdminButton
            type="button"
            variant={phone ? 'outline' : 'ghost'}
            icon={RefreshCw}
            data-testid="overview-recrawl-anyway"
            // As the header's Re-crawl: busy stays focusable (the hook makes
            // the click a no-op); only off is natively disabled.
            disabled={off !== null}
            aria-disabled={busy || undefined}
            // The header's line says why it is off.
            aria-describedby={
              // Only while the header draws that line (`VenueHeader`).
              off !== null && headerLine(venue, phone) !== ''
                ? `venue-header-line-${venue.id}`
                : undefined
            }
            onClick={() => recrawl.start(true)}
            style={{
              height: phone ? 32 : 30,
              fontSize: 12.5,
              borderRadius: 9,
              flex: phone ? 1 : 'none',
              ...(phone && {
                background: 'var(--surface-2)',
                justifyContent: 'center',
              }),
              ...((off !== null || busy) && {
                opacity: 0.45,
                cursor: 'not-allowed',
              }),
            }}
          >
            {COPY.latestRun.recrawlAnyway}
          </AdminButton>
        )}
      </div>
    </Card>
  );
};

// ── Last 14 runs ─────────────────────────────────────────────

/** Each kind's drawn bar (`A3/03/last-14-runs-legend`), in a 40px box. */
const BAR_STYLE: Record<BarKind, CSSProperties> = {
  found: {
    height: 40,
    borderRadius: '3px 3px 0 0',
    background: 'color-mix(in srgb, var(--signal) 75%, transparent)',
  },
  unchanged: {
    height: 20,
    borderRadius: '3px 3px 0 0',
    background: 'var(--border)',
  },
  partial: {
    height: 14,
    borderRadius: '3px 3px 0 0',
    background: 'color-mix(in srgb, var(--warning) 75%, transparent)',
  },
  failed: {
    height: 10,
    borderRadius: '3px 3px 0 0',
    background: 'color-mix(in srgb, var(--danger) 75%, transparent)',
  },
  paused: {
    height: 6,
    borderRadius: 2,
    border: '1px dashed var(--border-strong)',
  },
};

/**
 * The in-card legend swatch (`04/venue-overview`): a 10px square in the
 * bar's colour, and a 10×4 line for the low bars (Skipped, unchanged and
 * Paused, the latter dashed as its bar is).
 */
const Swatch = ({ kind }: { kind: BarKind }) => {
  const { background, border } = BAR_STYLE[kind];
  const line = kind === 'unchanged' || kind === 'paused';
  return (
    <span
      aria-hidden
      style={{
        width: 10,
        height: line ? 4 : 10,
        borderRadius: 2,
        boxSizing: 'border-box',
        flex: 'none',
        background,
        border,
      }}
    />
  );
};

const LastRunsCard = ({
  venueId,
  runs,
  phone,
  onRetry,
}: {
  venueId: string;
  runs: OverviewData['runs'];
  phone: boolean;
  onRetry: () => void;
}) => {
  // The phone board draws no All runs; the Runs tab is one tap away there.
  const allRuns = phone ? undefined : (
    <Link
      href={venueTabHref(venueId, 'runs')}
      style={{ ...linkButton('ghost', false), height: 28 }}
    >
      <ChevronRight size={14} aria-hidden />
      {COPY.lastRuns.allRuns}
    </Link>
  );
  if (runs === null) {
    return (
      <Card
        title={COPY.lastRuns.title}
        action={allRuns}
        phone={phone}
        testId="overview-last-runs"
      >
        <CouldntLoad page={COPY.lastRuns.title} onRetry={onRetry} />
      </Card>
    );
  }
  const bars = runBars(runs);
  const kinds = legendKinds(bars);
  return (
    <Card
      title={COPY.lastRuns.title}
      action={allRuns}
      phone={phone}
      testId="overview-last-runs"
    >
      {bars.length > 0 && (
        <>
          <div
            role="group"
            aria-label={COPY.lastRuns.chart}
            style={{ display: 'flex', gap: 4 }}
          >
            {/* 14 slots, so fewer runs leave the bars left-aligned at the
                same width. */}
            {Array.from({ length: LAST_RUNS }, (_, index) => {
              const bar = bars[index];
              return (
                <div
                  key={bar?.id ?? `empty-${index}`}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'flex-end',
                    height: 40,
                  }}
                >
                  {bar && (
                    <div
                      role="img"
                      aria-label={bar.label}
                      data-testid="overview-run-bar"
                      data-kind={bar.kind}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        ...BAR_STYLE[bar.kind],
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <ul
            aria-label={COPY.lastRuns.legend}
            data-testid="overview-runs-legend"
            style={{
              listStyle: 'none',
              margin: '8px 0 0',
              padding: 0,
              display: 'flex',
              flexWrap: 'wrap',
              columnGap: 14,
              rowGap: 6,
            }}
          >
            {kinds.map((kind) => (
              <li
                key={kind}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Swatch kind={kind} />
                <span style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>
                  {COPY.lastRuns.kinds[kind]}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
};

// ── Shows ────────────────────────────────────────────────────

const ShowsCard = ({
  venue,
  phone,
}: {
  venue: VenueWithCrawlHealth;
  phone: boolean;
}) => {
  const full = venue.lastFullRun ?? null;
  // The Events list filtered to this venue (`venueIds`, 4b #422). Desktop
  // says "Open in Events", phone "Events" (venue-overview, venue-overview-m).
  const openInEvents = (
    <Link
      href={`/admin/events?venueIds=${encodeURIComponent(venue.id)}`}
      style={{ ...linkButton('ghost', false), height: 28 }}
      aria-label={phone ? COPY.shows.eventsAriaLabel : undefined}
    >
      <ChevronRight size={14} aria-hidden />
      {phone ? COPY.shows.events : COPY.shows.openInEvents}
    </Link>
  );
  return (
    <Card
      title={COPY.shows.title}
      phone={phone}
      testId="overview-shows"
      action={openInEvents}
    >
      <div>
        <Row label={COPY.shows.upcoming}>
          <b>{(venue.upcomingShows ?? 0).toLocaleString('en-US')}</b>
        </Row>
        <Row label={COPY.shows.lastFullRun}>
          {full === null
            ? COPY.shows.noneYet
            : COPY.shows.lastFullRunValue(full.eventsFound, shortDate(full.at))}
        </Row>
        <Row label={COPY.shows.hidden}>
          {(venue.hiddenUpcomingShows ?? 0).toLocaleString('en-US')}
        </Row>
      </div>
    </Card>
  );
};

// ── In Needs you ─────────────────────────────────────────────

const NeedsYouCard = ({
  venue,
  needsYou,
  snoozes,
  phone,
  onRetry,
}: {
  venue: VenueWithCrawlHealth;
  needsYou: OverviewData['needsYou'];
  snoozes: OverviewData['snoozes'];
  phone: boolean;
  onRetry: () => void;
}) => {
  const { getToken } = useAuth();
  const router = useRouter();
  const [turningOn, setTurningOn] = useState<string | null>(null);
  const [failed, setFailed] = useState<OverviewSnooze | null>(null);

  const turnBackOn = async (snooze: OverviewSnooze) => {
    if (turningOn !== null) return;
    setTurningOn(snooze.id);
    setFailed(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error(ADMIN_COPY.crawlTriggerButton.errors.notAuthenticated);
      }
      await apiClient.delete(
        `/v1/admin/needs-you/snoozes/${encodeURIComponent(snooze.id)}`,
        token,
      );
      router.refresh();
    } catch (err: unknown) {
      // Already back on (turned on elsewhere): the row is stale, not stuck.
      if (err instanceof ApiError && err.status === 404) {
        console.warn('Overview: snooze already gone, refreshing', {
          id: snooze.id,
        });
        router.refresh();
        return;
      }
      console.error('Overview: turn back on failed', { id: snooze.id, err });
      setFailed(snooze);
    } finally {
      setTurningOn(null);
    }
  };

  if (needsYou === null) {
    return (
      <Card
        title={COPY.needsYou.title}
        phone={phone}
        testId="overview-needs-you"
      >
        <CouldntLoad page={COPY.needsYou.title} onRetry={onRetry} />
      </Card>
    );
  }
  return (
    <Card title={COPY.needsYou.title} phone={phone} testId="overview-needs-you">
      {needsYou.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
          {COPY.needsYou.empty(venue.name)}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {needsYou.map((item) => (
            <li key={item.key} style={{ borderTop: '1px solid var(--border)' }}>
              <Link
                href={`/admin/needs-you?item=${encodeURIComponent(item.key)}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 0',
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  textDecoration: 'none',
                  minWidth: 0,
                }}
              >
                <KindLabel kind={NEEDS_YOU_KIND_LABEL[item.kind]} />
                <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                  {item.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {snoozes === null && (
        // Only the turned-off section failed: the items above still read.
        <>
          <div style={{ marginTop: 2 }}>
            <MonoLabel>{COPY.needsYou.turnedOff}</MonoLabel>
          </div>
          <CouldntLoad page={COPY.needsYou.turnedOffPage} onRetry={onRetry} />
        </>
      )}
      {snoozes !== null && snoozes.length > 0 && (
        <>
          <div style={{ marginTop: 2 }}>
            <MonoLabel>{COPY.needsYou.turnedOff}</MonoLabel>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {snoozes.map((snooze) => {
              const name = COPY.needsYou.kinds[snooze.kind];
              return (
                <li
                  key={snooze.id}
                  data-testid="overview-snooze"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 0',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                      {name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--fg-muted)',
                        marginTop: 2,
                        lineHeight: 1.4,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {offSinceLine(snooze)}
                    </div>
                  </div>
                  <AdminButton
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={turningOn !== null}
                    aria-label={COPY.needsYou.turnBackOnLabel(name)}
                    onClick={() => void turnBackOn(snooze)}
                    style={{
                      flex: 'none',
                      borderRadius: 9,
                      background: 'var(--surface-2)',
                    }}
                  >
                    {COPY.needsYou.turnBackOn}
                  </AdminButton>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {failed !== null && (
        <SaveFailedToast
          what={COPY.needsYou.kinds[failed.kind]}
          saved={COPY.needsYou.turnBackOnSaved}
          onRetry={() => void turnBackOn(failed)}
          retrying={turningOn !== null}
          onDismiss={() => setFailed(null)}
        />
      )}
    </Card>
  );
};

// ── The tab ──────────────────────────────────────────────────

/**
 * The venue page's Overview (3b part 3, `04/venue-overview`; phone
 * `A3/03/venue-overview-m`). Desktop is a 1.3fr/1fr grid: Latest run and
 * Last 14 runs on the left, Shows and In Needs you on the right. The phone
 * stacks them in that order. HOLD: What's normal here, the ticketing-feed
 * card, and Low.
 *
 * Latest run reads the venue; the other cards read their own fetches, so one
 * failing shows Couldn't load in that card only.
 */
export const OverviewTab = ({
  venue,
  data,
  recrawl,
}: {
  venue: VenueWithCrawlHealth;
  data: OverviewData;
  /** The header's re-crawl, so Re-crawl anyway shares its state. */
  recrawl: Recrawl;
}) => {
  const phone = useIsPhone();
  const router = useRouter();
  const retry = () => router.refresh();
  const column: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minWidth: 0,
  };
  return (
    <div
      data-testid="venue-overview"
      style={{
        display: 'grid',
        gridTemplateColumns: phone
          ? 'minmax(0, 1fr)'
          : 'minmax(0, 1.3fr) minmax(0, 1fr)',
        gap: 16,
        alignItems: 'start',
      }}
    >
      <div style={column}>
        <LatestRunCard venue={venue} recrawl={recrawl} phone={phone} />
        <LastRunsCard
          venueId={venue.id}
          runs={data.runs}
          phone={phone}
          onRetry={retry}
        />
      </div>
      <div style={column}>
        <ShowsCard venue={venue} phone={phone} />
        <NeedsYouCard
          venue={venue}
          needsYou={data.needsYou}
          snoozes={data.snoozes}
          phone={phone}
          onRetry={retry}
        />
      </div>
    </div>
  );
};
