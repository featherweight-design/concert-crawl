'use client';

import { ExternalLink } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { metaDate, metaTime, whenChipOf } from '../needs-you-rules';
import type { PanelProps } from './panel-props';
import {
  AnswerButtons,
  Chip,
  ChipRow,
  LinkButton,
  Prose,
  RowCard,
  Section,
} from './panel-parts';

const PANEL = ADMIN_COPY.needsYou.panel;
const MAX_QUOTE = 600;

/** `02/event-low-confidence`. */
export const EventPanel = ({ row, today, busy, onAnswer }: PanelProps) => {
  const facts = row.eventFacts;
  const chip = whenChipOf(row.fanDate, today);
  const { confidence, autoApproveBar } = facts ?? {
    confidence: null,
    autoApproveBar: null,
  };
  // The bar is the crawler's own; the sentence says which side of it the score
  // is on, as the item was selected for being unverified, not for the score.
  const why =
    confidence !== null && autoApproveBar !== null
      ? confidence < autoApproveBar
        ? PANEL.event.underBar(confidence.toFixed(2), String(autoApproveBar))
        : PANEL.event.overBar(confidence.toFixed(2), String(autoApproveBar))
      : null;
  const description = facts?.description?.trim() ?? '';
  const quote =
    description.length > MAX_QUOTE
      ? `${description.slice(0, MAX_QUOTE - 1)}…`
      : description;
  const whenText = [
    row.fanDate ? metaDate(row.fanDate) : null,
    metaTime(row.showTime),
  ]
    .filter((part) => part !== null)
    .join(' · ');
  const rows = [
    ...(facts?.artist
      ? [{ label: PANEL.event.artist, value: facts.artist }]
      : []),
    ...(whenText ? [{ label: PANEL.event.when, value: whenText }] : []),
    ...(row.venueName
      ? [{ label: PANEL.event.where, value: row.venueName }]
      : []),
  ];

  return (
    <>
      {chip && (
        <ChipRow>
          <Chip kind={chip.soon ? 'accent' : 'neutral'} dot>
            {chip.text}
          </Chip>
        </ChipRow>
      )}
      {why && (
        <Section label={PANEL.event.whyUnsure}>
          <Prose>{why}</Prose>
        </Section>
      )}
      {quote && (
        <Section label={PANEL.event.fromPage}>
          <blockquote
            data-testid="venue-quote"
            style={{
              margin: 0,
              padding: '12px 14px',
              borderRadius: 14,
              border: '1px solid var(--border)',
              background: 'var(--surface-1)',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 12.5,
              lineHeight: 1.55,
              color: 'var(--fg-muted)',
              overflowWrap: 'anywhere',
            }}
          >
            {`“${quote}”`}
          </blockquote>
        </Section>
      )}
      {rows.length > 0 && (
        <Section label={PANEL.event.wouldList}>
          <RowCard rows={rows} />
        </Section>
      )}
      <AnswerButtons
        row={row}
        busy={busy}
        note={PANEL.event.note}
        hide={['edit_then_list']}
        extra={
          facts?.eventId ? (
            <LinkButton
              href={`/admin/events/${facts.eventId}`}
              testId="edit-event"
              icon={<ExternalLink size={14} aria-hidden />}
            >
              {PANEL.event.edit}
            </LinkButton>
          ) : null
        }
        extraLast
        onAnswer={onAnswer}
      />
    </>
  );
};
