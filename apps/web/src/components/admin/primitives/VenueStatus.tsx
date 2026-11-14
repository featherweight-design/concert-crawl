import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  deriveVenueStatusChips,
  type VenueCrawling,
  type VenueOnSite,
} from '@/lib/admin/venue-status';
import type { Venue } from '@concert-crawl/types';
import { VENUE_STATUS_CHIP_HEIGHT } from './geometry';

const copy = ADMIN_COPY.venueStatus;

/** Token per state. Every chip also carries a word, so colour is never the only signal. */
const ON_SITE: Record<VenueOnSite, { tone: string; label: string }> = {
  live: { tone: 'var(--success)', label: copy.onSite.live },
  hidden: { tone: 'var(--fg-subtle)', label: copy.onSite.hidden },
  draft: { tone: 'var(--fg-subtle)', label: copy.onSite.draft },
};

const CRAWLING: Record<VenueCrawling, { tone: string; label: string }> = {
  crawling: { tone: 'var(--signal)', label: copy.crawling.crawling },
  paused: { tone: 'var(--warning)', label: copy.crawling.paused },
  auto_paused: { tone: 'var(--danger)', label: copy.crawling.autoPaused },
  blocked: { tone: 'var(--danger)', label: copy.crawling.blocked },
  // "Paused: robots.txt" in warning (#178 item 29, phone addendum Source).
  robots_disallowed: {
    tone: 'var(--warning)',
    label: copy.crawling.robotsDisallowed,
  },
};

const NOT_CRAWLED = {
  tone: 'var(--fg-subtle)',
  label: copy.crawling.notCrawled,
};

/** Grey states read in the muted ink, as drawn, so the word stays legible. */
const textTone = (tone: string): string =>
  tone === 'var(--fg-subtle)' ? 'var(--fg-muted)' : tone;

const Chip = ({
  tone,
  label,
  testId,
}: {
  tone: string;
  label: string;
  testId: string;
}) => (
  <span
    data-testid={testId}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: VENUE_STATUS_CHIP_HEIGHT,
      padding: '0 9px',
      borderRadius: 999,
      fontSize: 11.5,
      fontWeight: 600,
      lineHeight: 1,
      whiteSpace: 'nowrap',
      // An Other pause shows its note, which can outrun the cell. Only the
      // crawling chip gives way; the on-site word is always short.
      maxWidth: '100%',
      flexShrink: testId === 'venue-status-crawling' ? 1 : 0,
      minWidth: 0,
      color: textTone(tone),
      background: `color-mix(in srgb, ${tone} 14%, transparent)`,
      border: `1px solid color-mix(in srgb, ${tone} 32%, transparent)`,
    }}
  >
    <span
      aria-hidden
      style={{
        width: 6,
        height: 6,
        flex: 'none',
        borderRadius: '50%',
        background: tone,
      }}
    />
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {label}
    </span>
  </span>
);

export type VenueStatusVenue = Pick<
  Venue,
  | 'active'
  | 'crawlPausedAt'
  | 'blockedAt'
  | 'consecutiveFailures'
  | 'robotsTxtAllowed'
>;

/**
 * One venue status everywhere (rule 2): on the site, then crawling, always in
 * that order. The latest run is a line of text beside it, never a third chip.
 * `crawlingLabel` lets a caller name the reason ("Paused: awaiting reply")
 * once 3c stores one.
 */
export const VenueStatus = ({
  venue,
  crawlingLabel,
  inList = false,
  only,
}: {
  venue: VenueStatusVenue;
  crawlingLabel?: string | undefined;
  /**
   * List cells say "Auto-paused" and put the failure count in the latest-run
   * line; detail views and Needs you say "Auto-paused: 3 failures" (#178
   * item 29).
   */
  inList?: boolean;
  /** One chip, for a table that gives each axis its own column (`04/venues-desktop`). */
  only?: 'onSite' | 'crawling';
}) => {
  const chips = deriveVenueStatusChips(venue);
  const onSite = ON_SITE[chips.onSite];
  // A hidden venue isn't crawled, whatever else is set (ruling 13).
  const crawling =
    chips.onSite === 'hidden'
      ? NOT_CRAWLED
      : inList && chips.crawling === 'auto_paused'
        ? { ...CRAWLING.auto_paused, label: copy.crawling.autoPausedShort }
        : CRAWLING[chips.crawling];
  return (
    <span
      data-testid="venue-status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        // A list row keeps one line, so its height never changes; a long
        // reason ellipsises instead.
        flexWrap: inList ? 'nowrap' : 'wrap',
        maxWidth: '100%',
      }}
    >
      {only !== 'crawling' && (
        <Chip
          tone={onSite.tone}
          label={onSite.label}
          testId="venue-status-on-site"
        />
      )}
      {only !== 'onSite' && (
        <Chip
          tone={crawling.tone}
          label={crawlingLabel ?? crawling.label}
          testId="venue-status-crawling"
        />
      )}
    </span>
  );
};
