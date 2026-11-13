'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { venueTabHref } from '@/lib/admin/venue-tabs';
import {
  causeText,
  httpStatusOf,
  lastRunsOf,
  metaDate,
  statusPhrase,
} from '../needs-you-rules';
import type { PanelProps } from './panel-props';
import { AnswerButtons, Chip, ChipRow, Prose, Section } from './panel-parts';

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
              gridTemplateColumns: '56px 64px minmax(0, 1fr)',
              gap: 8,
              padding: '10px 0',
              fontSize: 13,
              borderTop: index === 0 ? 'none' : '1px solid var(--border)',
            }}
          >
            <span style={{ color: 'var(--fg-muted)' }}>{run.day}</span>
            <span
              style={{
                fontWeight: 700,
                color: run.ok ? 'var(--success)' : 'var(--danger)',
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
  const who = (
    <Section label={PANEL.whoSeesIt}>
      <Prose>
        {PANEL.venue.stayListed(row.fanDate ? metaDate(row.fanDate) : null)}
      </Prose>
    </Section>
  );
  return (
    <>
      {blocked ? (
        <>
          {status && (
            <ChipRow>
              <Chip kind="danger" dot>
                {PANEL.blockedChip(status)}
              </Chip>
            </ChipRow>
          )}
          <Section label={PANEL.whatHappened}>
            <Prose>
              {status
                ? PANEL.venue.answered(row.venueName, statusPhrase(status))
                : PANEL.venue.refused}
            </Prose>
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
        extra={
          !blocked && row.venueId ? (
            <Link
              href={venueTabHref(row.venueId, 'source')}
              data-testid="check-source"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                minHeight: 36,
                minWidth: 0,
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
