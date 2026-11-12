'use client';

import type {
  ArtistMatchSummary,
  ArtistReportSummary,
} from '@concert-crawl/types';
import { UserX } from 'lucide-react';
import { useState } from 'react';

import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants';
import { TierPickerSheet } from '@/components/consumer/tier-picker/lazy';
import { ReportFooterLink } from '@/components/consumer/reporting/ReportFooterLink';

import { ArtistReportSheet } from './ArtistReportSheet';
import { ARTIST_COPY } from './definitions/copy';

const copy = ARTIST_COPY.report;

export interface ArtistReportCardProps {
  slug: string;
  name: string;
  photoUrl: string | null;
  match: ArtistMatchSummary | null;
  /** The viewer's open report from the page load. */
  myOpenReport: ArtistReportSummary | null;
  signedOut: boolean;
}

/**
 * The wrong-artist card and its sheets. The card is the event page's
 * "Spot something off?" component, not a lookalike. Mounted once per page, at the
 * foot of the main column on every viewport.
 *
 * The host keys this on the artist and the loaded report, so a different
 * artist or a refreshed report starts from the new props instead of this
 * component's copy of the old ones.
 */
export const ArtistReportCard = ({
  slug,
  name,
  photoUrl,
  match,
  myOpenReport,
  signedOut,
}: ArtistReportCardProps) => {
  const [open, setOpen] = useState(false);
  // Seeded from the page load, then owned here: a report made or withdrawn in
  // the sheet changes the card at once, without waiting for a refetch.
  const [reported, setReported] = useState(myOpenReport);
  const isReported = reported !== null;

  return (
    <>
      <ReportFooterLink
        flush
        testId="artist-report-card"
        icon={<UserX size={18} strokeWidth={1.8} />}
        title={isReported ? copy.card.reportedTitle : copy.card.title}
        subtitle={
          isReported ? copy.card.reportedSubtitle : copy.card.subtitle(name)
        }
        footnote={isReported ? copy.card.reportedFootnote : copy.card.footnote}
        ariaSignedOut={copy.card.ariaSignedOut}
        reported={isReported}
        reportedChip={copy.card.reportedChip}
        signedOut={signedOut}
        onOpen={() => setOpen(true)}
      />
      {signedOut ? (
        // The same hand-off the event page's report row gives a visitor.
        <TierPickerSheet
          open={open}
          onClose={() => setOpen(false)}
          planState={LOGGED_OUT_PLAN_STATE}
          // No payment element is reachable signed out; `true` only adds legal
          // copy, matching the other logged-out picker call-sites.
          scaRegion
          entry="logged-out-artist-report"
        />
      ) : (
        <ArtistReportSheet
          open={open}
          onClose={() => setOpen(false)}
          slug={slug}
          name={name}
          photoUrl={photoUrl}
          match={match}
          reported={reported}
          onReported={setReported}
          onWithdrawn={() => setReported(null)}
        />
      )}
    </>
  );
};
