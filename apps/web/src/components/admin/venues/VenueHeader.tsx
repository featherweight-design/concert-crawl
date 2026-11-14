'use client';

import { useState, type CSSProperties } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import type { VenueWithCrawlHealth } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  SaveFailedToast,
  Spinner,
  VenueStatus,
  useIsPhone,
} from '@/components/admin/primitives';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { VenueExpectedBadge } from '@/components/admin/venue-expected-badge/VenueExpectedBadge';
import { crawlingLabel } from './venue-list-rules';
import { headerLine, recrawlOff, viewOnSiteHref } from './venue-header-rules';
import type { Recrawl, RecrawlState } from './useRecrawl';
import { VenueMenu, type VenueMenuFailure } from './VenueMenu';
import {
  VENUE_HEADER_BUTTON_HEIGHT,
  VENUE_HEADER_CHIPS_GAP,
  VENUE_HEADER_LINE_HEIGHT,
  VENUE_HEADER_NAME_SIZE,
  VENUE_HEADER_NEIGHBORHOOD_GAP,
  VENUE_HEADER_NEIGHBORHOOD_SIZE,
  VENUE_HEADER_PHONE_STACK_GAP,
  VENUE_HEADER_TILE,
} from './venue-header-geometry';

const COPY = ADMIN_COPY.venueHeader;

/** The header's 36px buttons (`A3/03/re-crawl-states`). */
const BUTTON: CSSProperties = {
  height: VENUE_HEADER_BUTTON_HEIGHT,
  padding: '0 12px',
  borderRadius: 9,
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  background: 'var(--surface-2)',
  color: 'var(--fg)',
  border: '1px solid var(--border-strong)',
};

/** Settled outcomes with nothing to retry, and the line each one reads. */
const NOTICE: Partial<Record<RecrawlState, string>> = {
  ranFailed: COPY.notice.ranFailed,
  unknown: COPY.notice.unknown,
  stalled: COPY.notice.stalled,
};

/** A settled outcome that offers no retry, only a dismiss. */
const RecrawlNotice = ({
  text,
  onDismiss,
}: {
  text: string;
  onDismiss: () => void;
}) => (
  <div
    data-testid="recrawl-notice"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderRadius: 12,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-strong)',
    }}
  >
    <span
      style={{
        flex: 1,
        minWidth: 0,
        fontSize: 13,
        color: 'var(--fg)',
        overflowWrap: 'anywhere',
      }}
    >
      {text}
    </span>
    <AdminButton type="button" variant="outline" size="sm" onClick={onDismiss}>
      {COPY.notice.dismiss}
    </AdminButton>
  </div>
);

/**
 * The venue page header: glyph, name, both status chips and the line beside
 * them, then Re-crawl, View on site and the ⋯ menu per state
 * (`A3/03/re-crawl-states`, `A3/03/venue-menu-states`; phone
 * `A3/03/venue-overview-m`). Lifted out of `VenueDetailsClient`, whose old
 * danger zone the ⋯ replaces.
 *
 * Re-crawl stays one mounted button through every state, so focus is never
 * dropped: busy, it reads Queued or Crawling now and is `aria-disabled`; off,
 * it is disabled and described by the line that says why.
 */
export const VenueHeader = ({
  venue,
  recrawl,
}: {
  venue: VenueWithCrawlHealth;
  /**
   * The page's one `useRecrawl` (built with `recrawlOff(venue)`), shared with
   * Overview's Re-crawl anyway so both read the same state.
   */
  recrawl: Recrawl;
}) => {
  const isPhone = useIsPhone();
  const form = isPhone ? 'phone' : 'desktop';
  const [failure, setFailure] = useState<VenueMenuFailure | null>(null);
  // While any menu change runs, the toast's Try again holds rather than
  // swallowing a press.
  const [menuBusy, setMenuBusy] = useState(false);
  const off = recrawlOff(venue);
  const line = headerLine(venue, isPhone);
  const busy = recrawl.state === 'queued' || recrawl.state === 'running';
  const busyLabel = recrawl.state === 'running' ? COPY.running : COPY.queued;
  const notice = NOTICE[recrawl.state];
  const siteHref = viewOnSiteHref(venue);
  const lineId = `venue-header-line-${venue.id}`;
  const grow = isPhone ? 1 : 'none';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        data-testid="venue-header"
        style={{
          display: 'flex',
          flexDirection: isPhone ? 'column' : 'row',
          alignItems: isPhone ? 'stretch' : 'center',
          gap: isPhone ? VENUE_HEADER_PHONE_STACK_GAP : 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isPhone ? 12 : 16,
            flex: 1,
            minWidth: 0,
          }}
        >
          <span style={{ display: 'flex', flex: 'none' }}>
            <VenueTile
              slug={venue.slug}
              name={venue.name}
              size={VENUE_HEADER_TILE[form]}
            />
          </span>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: VENUE_HEADER_NAME_SIZE[form],
                lineHeight: VENUE_HEADER_LINE_HEIGHT,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--fg)',
                overflowWrap: 'anywhere',
              }}
            >
              {venue.name}
            </h1>
            {isPhone && venue.neighborhood && (
              <div
                style={{
                  fontSize: VENUE_HEADER_NEIGHBORHOOD_SIZE,
                  lineHeight: VENUE_HEADER_LINE_HEIGHT,
                  color: 'var(--fg-muted)',
                  marginTop: VENUE_HEADER_NEIGHBORHOOD_GAP,
                }}
              >
                {venue.neighborhood}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: isPhone ? 6 : 8,
                marginTop: VENUE_HEADER_CHIPS_GAP,
              }}
            >
              <VenueStatus venue={venue} crawlingLabel={crawlingLabel(venue)} />
              {/* Only while a triage fault is acknowledged (#1575). */}
              <VenueExpectedBadge venueId={venue.id} />
              {line !== '' && (
                <span
                  id={lineId}
                  data-testid="venue-header-line"
                  style={{
                    fontSize: isPhone ? 12.5 : 13,
                    color: 'var(--fg-muted)',
                    marginLeft: isPhone ? 0 : 4,
                  }}
                >
                  {line}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Wraps so the nowrap buttons never overflow a 320px phone. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <AdminButton
            type="button"
            data-testid="recrawl-button"
            {...(!busy && { icon: RefreshCw })}
            disabled={off !== null}
            aria-disabled={busy || undefined}
            aria-describedby={off !== null && line !== '' ? lineId : undefined}
            // A no-op while busy or off: the hook guards both.
            onClick={() => recrawl.start()}
            style={{
              ...BUTTON,
              gap: busy ? 8 : 6,
              flex: grow,
              ...(busy && { color: 'var(--fg-muted)', cursor: 'default' }),
              ...(off !== null && { opacity: 0.45, cursor: 'not-allowed' }),
            }}
          >
            {/* Queued and Crawling now draw a spinner in place of the icon. */}
            {busy && (
              <Spinner
                size={14}
                tone={
                  recrawl.state === 'running' ? 'var(--signal)' : 'currentColor'
                }
              />
            )}
            {busy ? busyLabel : COPY.recrawl}
          </AdminButton>
          {/* Always mounted, so a screen reader hears each state change. */}
          <span role="status" aria-live="polite" className="sr-only">
            {busy ? busyLabel : (notice ?? '')}
          </span>
          {siteHref !== null && (
            <a
              href={siteHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...BUTTON,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                textDecoration: 'none',
                flex: grow,
              }}
            >
              <ExternalLink size={14} aria-hidden />
              {COPY.viewOnSite}
            </a>
          )}
          <VenueMenu
            venue={venue}
            onFailure={setFailure}
            onBusy={setMenuBusy}
            triggerStyle={{
              ...BUTTON,
              width: 36,
              padding: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </div>
      </div>
      {/* Try again only where nothing was queued, and never on a venue
          Re-crawl is off for (the hook clears `refused` when `off` lands). */}
      {recrawl.state === 'refused' && off === null && (
        <SaveFailedToast
          what={COPY.failed.recrawl(venue.name)}
          saved={recrawl.reason ?? COPY.failed.recrawlSaved}
          onRetry={recrawl.retry}
        />
      )}
      {failure !== null && (
        <SaveFailedToast
          what={failure.what}
          saved={failure.saved}
          {...(failure.retry !== null && { onRetry: failure.retry })}
          retrying={failure.retrying || menuBusy}
          onDismiss={() => setFailure(null)}
        />
      )}
      {notice !== undefined && (
        <RecrawlNotice text={notice} onDismiss={recrawl.dismiss} />
      )}
    </div>
  );
};
