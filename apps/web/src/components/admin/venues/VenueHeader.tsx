'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import type { VenueWithCrawlHealth } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  SaveFailedToast,
  VenueStatus,
  useIsPhone,
} from '@/components/admin/primitives';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { VenueExpectedBadge } from '@/components/admin/venue-expected-badge/VenueExpectedBadge';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';
import { crawlingLabel } from './venue-list-rules';
import { headerLine, recrawlOff, showsViewOnSite } from './venue-header-rules';
import { useRecrawl } from './useRecrawl';

const COPY = ADMIN_COPY.venueHeader;

/** The header's 36px buttons (`A3/03/re-crawl-states`). */
const BUTTON: CSSProperties = {
  height: 36,
  padding: '0 12px',
  borderRadius: 9,
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  background: 'var(--surface-2)',
  color: 'var(--fg)',
  border: '1px solid var(--border-strong)',
};

/** Queued and Crawling now draw a spinner in place of the icon. */
const Spinner = ({ tone }: { tone: string }) => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke={tone}
    strokeWidth={2.4}
    strokeLinecap="round"
    aria-hidden
    className="animate-spin"
    style={{ flex: 'none' }}
  >
    <circle cx={12} cy={12} r={9} opacity={0.25} />
    <path d="M21 12a9 9 0 00-9-9" />
  </svg>
);

/**
 * The venue page header: glyph, name, both status chips and the line beside
 * them, then Re-crawl and View on site (`A3/03/re-crawl-states`; phone
 * `A3/03/venue-overview-m`). Lifted out of `VenueDetailsClient`. `actions`
 * holds what follows View on site: the old Flagship button until the ⋯ menu
 * takes its place.
 */
export const VenueHeader = ({
  venue,
  actions,
}: {
  venue: VenueWithCrawlHealth;
  actions?: ReactNode;
}) => {
  const isPhone = useIsPhone();
  const recrawl = useRecrawl(venue.id);
  const off = recrawlOff(venue);
  const line = headerLine(venue, isPhone);
  const busy = recrawl.state === 'queued' || recrawl.state === 'running';
  const grow = isPhone ? 1 : 'none';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        data-testid="venue-header"
        style={{
          display: 'flex',
          flexDirection: isPhone ? 'column' : 'row',
          alignItems: isPhone ? 'stretch' : 'center',
          gap: isPhone ? 12 : 16,
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
              size={isPhone ? 48 : 56}
            />
          </span>
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: isPhone ? 22 : 26,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--fg)',
                overflowWrap: 'anywhere',
              }}
            >
              {venue.name}
            </h2>
            {isPhone && venue.neighborhood && (
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--fg-muted)',
                  marginTop: 2,
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
                marginTop: 6,
              }}
            >
              <VenueStatus venue={venue} crawlingLabel={crawlingLabel(venue)} />
              {/* Only while a triage fault is acknowledged (#1575). */}
              <VenueExpectedBadge venueId={venue.id} />
              {line !== '' && (
                <span
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {busy ? (
            <span
              role="status"
              style={{
                ...BUTTON,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: 'var(--fg-muted)',
                flex: grow,
              }}
            >
              <Spinner
                tone={
                  recrawl.state === 'running' ? 'var(--signal)' : 'currentColor'
                }
              />
              {recrawl.state === 'running' ? COPY.running : COPY.queued}
            </span>
          ) : (
            <AdminButton
              type="button"
              icon={RefreshCw}
              disabled={off !== null}
              onClick={recrawl.start}
              style={{
                ...BUTTON,
                flex: grow,
                ...(off !== null && { opacity: 0.45, cursor: 'not-allowed' }),
              }}
            >
              {COPY.recrawl}
            </AdminButton>
          )}
          {showsViewOnSite(venue) && isSafeHttpUrl(venue.websiteUrl) && (
            <a
              href={venue.websiteUrl}
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
          {actions}
        </div>
      </div>
      {recrawl.state === 'failed' && (
        <SaveFailedToast
          what={COPY.failed.recrawl(venue.name)}
          saved={COPY.failed.recrawlSaved}
          onRetry={recrawl.start}
        />
      )}
    </div>
  );
};
