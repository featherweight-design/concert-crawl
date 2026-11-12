// The Passport teaser (#70), design_handoff_concert_history/history-routes.jsx:300-351.
//
// This is the ENTIRE Passport scope in this build. The keepsake card itself —
// the 320×500 compact, the 1080×1080 share render, the rasterization — is owned
// by #85 and deliberately not built here.
//
// #85 has shipped /passport, so the strip is a link. The null branch stays:
// never a dead href — a link that goes nowhere is worse than no link.

import Link from 'next/link';
import type { HistoryShow, HistoryStats } from '@concert-crawl/types';
import { VenueStamp } from '@/components/consumer/venue-stamp';
import { HISTORY_COPY } from './definitions/copy';
import { PASSPORT_ROUTE } from './definitions/constants';

const COPY = HISTORY_COPY.passport;

// B+ rule 4: the teaser shows the Passport's own venue stamps, one per venue,
// from the most recent nights. Four fill the 2×2 block; a shorter history shows
// what it has rather than inventing venues it never went to.
const TEASER_STAMPS = 4;

/** The board's teaser stamp (`addendum-2/03/concerts-round-stamps-{d,m}`), in px. */
export const TEASER_STAMP_SIZE = 50;

export const teaserStampsFor = (
  shows: readonly HistoryShow[],
): HistoryShow[] => {
  const seen = new Set<string>();
  const picked: HistoryShow[] = [];
  for (const show of shows) {
    if (picked.length === TEASER_STAMPS) break;
    if (seen.has(show.venueSlug)) continue;
    seen.add(show.venueSlug);
    picked.push(show);
  }
  return picked;
};

const TeaserBody = ({
  stats,
  shows,
}: {
  stats: HistoryStats;
  shows: readonly HistoryShow[];
}) => {
  const stamps = teaserStampsFor(shows);
  return (
    <>
      <span
        data-testid="passport-teaser-body"
        className="flex min-w-0 flex-1 flex-col justify-center gap-1"
        style={{ padding: '16px 16px 14px 18px', background: BODY_GROUND }}
      >
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 15.5,
            fontWeight: 800,
            letterSpacing: '-0.015em',
            color: 'var(--fg)',
          }}
        >
          {COPY.headline}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: '0.02em',
            color: 'var(--fg-muted)',
          }}
        >
          {COPY.summary(stats.nights, stats.venues, stats.topGenre)}
        </span>
        {PASSPORT_ROUTE !== null && (
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '-0.005em',
              color: 'var(--signal)',
            }}
          >
            {COPY.link}
          </span>
        )}
      </span>
      {/* Decorative — the stat line above already carries every fact. With no
        stamps the column would be a bare dashed rule, so it is left out. */}
      {stamps.length > 0 && (
        <span
          aria-hidden
          data-testid="passport-teaser-stamps"
          className="grid shrink-0 grid-cols-2 gap-1.5 self-stretch border-l border-dashed border-border-strong p-3"
          style={{ alignContent: 'center', background: TEASER_STAMP_GROUND }}
        >
          {stamps.map((show) => (
            <VenueStamp
              key={show.venueSlug}
              venueSlug={show.venueSlug}
              venueName={show.venueName}
              size={TEASER_STAMP_SIZE}
            />
          ))}
        </span>
      )}
    </>
  );
};

// The board's teaser card (`addendum-2/03/concerts-round-stamps-{d,m}`): a
// gradient hairline fading to the border, radius 18, no wash. The text panel
// sits on a surface-2 to surface-1 sweep and the stamps on the booklet's dot
// grid.
const SHELL = 'flex items-stretch overflow-hidden rounded-[18px] no-underline';

export const TEASER_SHELL_STYLE = {
  border: '1px solid transparent',
  background:
    'linear-gradient(var(--surface-1), var(--surface-1)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
} as const;

const BODY_GROUND =
  'linear-gradient(135deg, var(--surface-2), var(--surface-1))';

export const TEASER_STAMP_GROUND =
  'radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--fg) 6%, transparent) 1px, transparent 1.5px) 0 0 / 12px 12px, var(--surface-1)';
export const PassportTeaser = ({
  stats,
  shows,
}: {
  stats: HistoryStats;
  shows: readonly HistoryShow[];
}) => {
  if (PASSPORT_ROUTE === null) {
    return (
      <div className={SHELL} style={TEASER_SHELL_STYLE}>
        <TeaserBody stats={stats} shows={shows} />
      </div>
    );
  }

  return (
    <Link
      href={PASSPORT_ROUTE}
      className={`history-passport-teaser min-h-[44px] ${SHELL}`}
      style={TEASER_SHELL_STYLE}
    >
      <TeaserBody stats={stats} shows={shows} />
    </Link>
  );
};
