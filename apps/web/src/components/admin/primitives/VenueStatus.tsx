import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  deriveVenueStatusChips,
  type VenueCrawling,
  type VenueOnSite,
} from '@/lib/admin/venue-status';
import type { Venue } from '@concert-crawl/types';

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
      height: 22,
      padding: '0 9px',
      borderRadius: 999,
      fontSize: 11.5,
      fontWeight: 600,
      lineHeight: 1,
      whiteSpace: 'nowrap',
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
    {label}
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
}: {
  venue: VenueStatusVenue;
  crawlingLabel?: string;
  /**
   * List cells say "Auto-paused" and put the failure count in the latest-run
   * line; detail views and Needs you say "Auto-paused: 3 failures" (#178
   * item 29).
   */
  inList?: boolean;
}) => {
  const chips = deriveVenueStatusChips(venue);
  const onSite = ON_SITE[chips.onSite];
  const crawling =
    inList && chips.crawling === 'auto_paused'
      ? { ...CRAWLING.auto_paused, label: copy.crawling.autoPausedShort }
      : CRAWLING[chips.crawling];
  return (
    <span
      data-testid="venue-status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
      }}
    >
      <Chip
        tone={onSite.tone}
        label={onSite.label}
        testId="venue-status-on-site"
      />
      <Chip
        tone={crawling.tone}
        label={crawlingLabel ?? crawling.label}
        testId="venue-status-crawling"
      />
    </span>
  );
};
