import Link from 'next/link';
import { Panel } from '@/components/consumer/image-slot';
import { slotRadiusFor } from '@/components/consumer/image-slot/lib/slot-metrics';
import { genreRing } from '@/components/consumer/event-row/lib/genre-ring';
import { genreColor, NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';
import { StatusPill } from './StatusPill';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import {
  CRED_PER_CONFIRMED_PRICE,
  formatAgo,
  formatDate,
  priceLabelOf,
} from './submission-format';
import type { UserSubmissionItem } from '@concert-crawl/types';

const SETTINGS_COPY = CONSUMER_COPY.settings;

interface SubmissionItemProps {
  submission: UserSubmissionItem;
  isLast?: boolean;
}

export function SubmissionItem({
  submission,
  isLast = false,
}: SubmissionItemProps) {
  const ago = formatAgo(submission.submittedAt);
  const confirms = submission.corroborationCount;
  // A closed row (stale, archived or not used) is no longer a price that stands: its
  // price goes muted and the line beside the pill says why (addendum-4 §6).
  const closed = submission.status === 'closed';

  return (
    <Link
      href={`/events/${submission.eventId}`}
      className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal"
      style={isLast ? undefined : { borderBottom: '1px solid var(--border)' }}
    >
      {/* The show's art, ringed in its lead genre (B+ rule 2): the event's
          artwork, then the headliner's portrait, then Panel's name-keyed mark. */}
      <span
        data-testid="submission-art-ring"
        className="block shrink-0 overflow-hidden"
        style={{
          width: 44,
          height: 44,
          // The same radius the slot inside draws, so ring and art agree.
          borderRadius: slotRadiusFor(44),
          boxShadow: genreRing(
            genreColor(submission.genre) ?? NEUTRAL_GENRE_COLOR,
          ),
        }}
      >
        <Panel
          surface="event"
          name={submission.artist}
          artworkUrl={submission.imageUrl}
          photoUrl={submission.artistPhotoUrl}
          size={44}
        />
      </span>

      {/* Middle: who, where, and how the price is doing */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="truncate text-[16px] font-extrabold leading-snug tracking-[-0.01em] text-fg">
          {submission.artist}
        </span>
        <span
          className="truncate text-[11px] text-fg-muted"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
        >
          {submission.venue}
          {submission.date && ` · ${formatDate(submission.date)}`}
        </span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusPill status={submission.status} />
          {!closed && confirms > 0 && (
            <span className="text-[12px] text-fg-muted">
              {SETTINGS_COPY.submissionConfirms(confirms)}
            </span>
          )}
          {submission.status === 'confirmed' && (
            <span
              data-testid="submission-cred-tag"
              className="text-[10px] font-bold uppercase text-accent"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
            >
              {SETTINGS_COPY.submissionCredTag(CRED_PER_CONFIRMED_PRICE)}
            </span>
          )}
          {closed && submission.closedReason !== undefined && (
            <span className="text-[12px] text-fg-muted">
              {SETTINGS_COPY.submissionClosedReason[submission.closedReason]}
            </span>
          )}
          {submission.status === 'disputed' && (
            <span className="text-[12px]" style={{ color: 'var(--danger)' }}>
              {SETTINGS_COPY.submissionDisputed}
            </span>
          )}
        </div>
      </div>

      {/* Right: the price, its tier, and when */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={`text-[18px] font-black leading-none tracking-[-0.02em] ${closed ? 'text-fg-muted' : 'text-fg'}`}
        >
          {priceLabelOf(submission)}
        </span>
        <span
          className="text-[10px] font-bold uppercase text-fg-subtle"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
        >
          {submission.tier}
        </span>
        <span
          className="text-[10px] text-fg-subtle"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {SETTINGS_COPY.submissionAge(ago)}
        </span>
      </div>
    </Link>
  );
}
