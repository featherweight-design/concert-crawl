'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton } from '@/components/admin/primitives';
import { venueTabHref } from '@/lib/admin/venue-tabs';
import {
  causeText,
  failuresOf,
  httpStatusOf,
  lastRunsOf,
  latestRunWhen,
  metaDate,
  robotsText,
  statusPhrase,
} from '../needs-you-rules';
import type { PanelProps } from './panel-props';
import {
  AnswerButtons,
  Chip,
  ChipRow,
  Prose,
  RowCard,
  Section,
} from './panel-parts';

const PANEL = ADMIN_COPY.needsYou.panel;

const RunRows = ({ row }: Pick<PanelProps, 'row'>) => {
  const runs = lastRunsOf(row);
  if (runs.length === 0) return null;
  return (
    <Section label={PANEL.lastRuns}>
      <div data-testid="last-runs">
        {runs.map((run, index) => (
          <div
            key={`${run.day}-${index}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '54px 70px minmax(0, 1fr)',
              gap: 8,
              padding: '8px 0',
              fontSize: 13,
              // A rule under every row, the last included (`venue-auto-paused`).
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span
              style={{
                color: 'var(--fg-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {run.day}
            </span>
            <span
              style={{
                fontWeight: 600,
                color: run.tone,
              }}
            >
              {run.status}
            </span>
            <span
              style={{ color: 'var(--fg-muted)', overflowWrap: 'anywhere' }}
            >
              {run.detail}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
};

/** `02/venue-auto-paused-after-3-failures` and `02/venue-blocked-403-429`. */
export const VenuePanel = ({ row, busy, onAnswer }: PanelProps) => {
  const blocked = row.kind === 'venue-blocked';
  const status = httpStatusOf(row);
  const failures = failuresOf(row);
  const robots = robotsText(row.robots);
  const checked = [
    ...(robots ? [{ label: PANEL.venue.robotsTxt, value: robots }] : []),
    // Our pace is the crawler's fixed delay, not a recorded value.
    { label: PANEL.venue.ourPace, value: PANEL.venue.pace },
    ...(row.pagesThisRun !== null
      ? [
          {
            label: PANEL.venue.pagesRun,
            value: PANEL.venue.pages(row.pagesThisRun),
          },
        ]
      : []),
    ...(row.okStreakBefore
      ? [
          {
            label: PANEL.venue.beforeThis,
            value: PANEL.venue.okRuns(row.okStreakBefore),
          },
        ]
      : []),
  ];
  const who = (
    <Section label={PANEL.whoSeesIt}>
      <Prose>
        {PANEL.venue.stayListed(
          row.fanDate ? metaDate(row.fanDate) : null,
          row.showCount,
        )}
      </Prose>
    </Section>
  );
  const chips = (
    <ChipRow>
      {row.venueLive && (
        <Chip kind="success" dot>
          {PANEL.venue.live}
        </Chip>
      )}
      {blocked && status && (
        <Chip kind="danger" dot>
          {PANEL.blockedChip(status)}
        </Chip>
      )}
      {!blocked && row.pausedAt && failures && (
        <Chip kind="danger" dot>
          {PANEL.venue.autoPaused(failures)}
        </Chip>
      )}
    </ChipRow>
  );
  return (
    <>
      {(row.venueLive || (blocked && status) || (row.pausedAt && failures)) &&
        chips}
      {blocked ? (
        <>
          <Section label={PANEL.whatHappened}>
            <Prose>
              {status
                ? PANEL.venue.answered(
                    row.venueName,
                    statusPhrase(status),
                    latestRunWhen(row),
                  )
                : PANEL.venue.refused}
            </Prose>
          </Section>
          <Section label={PANEL.checkedForYou}>
            <RowCard rows={checked} />
          </Section>
          {who}
        </>
      ) : (
        <>
          {row.cause && (
            <Section label={PANEL.likelyCause}>
              <Prose>{causeText(row.cause)}</Prose>
            </Section>
          )}
          <RunRows row={row} />
          {who}
        </>
      )}
      <AnswerButtons
        row={row}
        busy={busy}
        note={blocked ? PANEL.venue.blockedNote : PANEL.venue.failingNote}
        // A blocked venue leads with Ask the venue, drawn disabled until Add a
        // venue ships it (`10/venue-blocked-before-3c`).
        extra={
          blocked ? (
            <>
              <AdminButton
                variant="outline"
                disabled
                fullWidth
                aria-describedby="ask-venue-why"
              >
                {PANEL.venue.askVenue}
              </AdminButton>
              <p
                id="ask-venue-why"
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'var(--fg-muted)',
                }}
              >
                {PANEL.venue.askVenueLine}
              </p>
            </>
          ) : row.venueId ? (
            <Link
              href={venueTabHref(row.venueId, 'source')}
              data-testid="check-source"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                minHeight: 36,
                flex: '1 1 auto',
                whiteSpace: 'nowrap',
                padding: '0 12px',
                borderRadius: 12,
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-elevated)',
                color: 'var(--fg)',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={14} aria-hidden />
              {PANEL.venue.checkSource}
            </Link>
          ) : null
        }
        onAnswer={onAnswer}
      />
    </>
  );
};
