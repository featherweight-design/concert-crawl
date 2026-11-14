'use client';

import { MapPin } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  lookalikeDate,
  metaTime,
  mountainDay,
  whenChipOf,
} from '../needs-you-rules';
import type { PanelProps } from './panel-props';
import { AnswerButtons, Chip, ChipRow, Prose, Section } from './panel-parts';

const PANEL = ADMIN_COPY.needsYou.panel;

/** `02/show-renamed-moved`. */
export const ShowMovedPanel = ({ row, today, busy, onAnswer }: PanelProps) => {
  const chip = whenChipOf(row.fanDate, today);
  const target = row.moveTo;
  const date = lookalikeDate(row);
  const venue = target?.venueName ?? null;
  // The card's meta: venue, date, time, and the day we last crawled it
  // (`show-renamed-moved`: "Globe Hall · Sat Nov 14 · 7 PM · crawled Nov 10").
  const crawled = target?.crawledAt ? mountainDay(target.crawledAt) : null;
  const meta = [
    venue,
    date,
    metaTime(target?.showTime),
    crawled ? PANEL.showMoved.crawled(crawled) : null,
  ]
    .filter((part) => part !== null)
    .join(' · ');
  return (
    <>
      <ChipRow>
        {chip && (
          <Chip kind={chip.soon ? 'accent' : 'neutral'} dot>
            {chip.text}
          </Chip>
        )}
        {row.watchers > 0 && (
          <Chip kind="neutral">
            {ADMIN_COPY.needsYou.watching(row.watchers)}
          </Chip>
        )}
      </ChipRow>
      {target && venue && (
        <Section label={PANEL.whatHappened}>
          <Prose>{PANEL.showMoved.nowLists(venue)}</Prose>
        </Section>
      )}
      {target && (
        <Section label={PANEL.matchingShow}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--surface-1)',
            }}
          >
            <span
              aria-hidden
              style={{
                flex: 'none',
                width: 44,
                height: 44,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 10,
                background: 'var(--surface-2)',
                color: 'var(--signal)',
              }}
            >
              <MapPin size={20} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--fg)',
                  overflowWrap: 'anywhere',
                }}
              >
                {target.title}
              </div>
              {meta && (
                <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                  {meta}
                </div>
              )}
            </div>
            <Chip kind="success" dot>
              {PANEL.match}
            </Chip>
          </div>
        </Section>
      )}
      <Section label={PANEL.whatMovingDoes}>
        <Prose muted small>
          {PANEL.showMoved.doesWhat(venue, row.venueName, row.watchers)}
        </Prose>
      </Section>
      <AnswerButtons row={row} busy={busy} note={null} onAnswer={onAnswer} />
    </>
  );
};
