'use client';

import type { CSSProperties } from 'react';
import {
  AdminButton,
  KindLabel,
  useIsPhone,
} from '@/components/admin/primitives';
import {
  cardAnswers,
  cardLabelOf,
  impactOf,
  isUrgent,
  kindLabelOf,
  metaOf,
  whatOf,
  whenOf,
} from './needs-you-rules';
import type { NeedsYouAnswer, QueueRow } from './needs-you-api';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { SnoozeMenu } from './SnoozeMenu';

interface QueueItemProps {
  row: QueueRow;
  /** Mountain Time's today, `YYYY-MM-DD`. */
  today: string;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onAnswer: (answer: NeedsYouAnswer) => void;
  onSnooze: (until: string) => void;
  onNotUseful: (reason: string) => void;
}

const MONO: CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

/**
 * One decision, as `02/needs-you-desktop` and `needs-you-mobile` draw it: the
 * kind and the when word, what is at stake, what happened, then the answers.
 * The suggested answer is the highlighted one. On the phone the first two
 * answers are buttons side by side and the rest sit under them.
 */
export const QueueItem = ({
  row,
  today,
  selected,
  busy,
  onSelect,
  onAnswer,
  onSnooze,
  onNotUseful,
}: QueueItemProps) => {
  const isPhone = useIsPhone();
  const when = whenOf(row.fanDate, today);
  const meta = metaOf(row);
  const answers = cardAnswers(row);
  // Two buttons, the rest as quiet links, at both widths (the boards draw it so).
  const buttons = answers.slice(0, 2);
  const links = answers.slice(2);

  return (
    <article
      data-testid="needs-you-item"
      data-item-key={row.key}
      aria-current={selected ? 'true' : undefined}
      onClick={onSelect}
      style={{
        cursor: 'pointer',
        // `needs-you-desktop`: a borderless card, radius 12, padding 12/14,
        // gap 7. `needs-you-mobile`: a hairline border, radius 14, padding 14.
        // The desktop border stays 1px but transparent so the selected ring
        // does not move the card.
        padding: isPhone ? 14 : '12px 14px',
        borderRadius: isPhone ? 14 : 12,
        background: 'var(--surface-1)',
        border:
          selected || !isPhone
            ? '1px solid transparent'
            : '1px solid var(--border)',
        ...(selected
          ? {
              background:
                'linear-gradient(var(--surface-1), var(--surface-1)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
            }
          : {}),
        opacity: busy ? 0.6 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <KindLabel kind={kindLabelOf(row.kind)} />
        {when && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: when.soon ? 'var(--accent)' : 'var(--fg-muted)',
            }}
          >
            {when.word}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontSize: isPhone ? 11.5 : 12,
            color: isUrgent(row.kind) ? 'var(--danger)' : 'var(--fg-subtle)',
          }}
        >
          {impactOf(row)}
        </span>
        {/* On the phone the clock lives in the item page's ⋯ sheet
            (`01-snooze/answered-m` draws no clock on the cards). */}
        {!isPhone && (
          <span onClick={(event) => event.stopPropagation()}>
            <SnoozeMenu
              disabled={busy}
              onSnooze={onSnooze}
              onNotUseful={row.venueId ? onNotUseful : undefined}
              about={{
                warning: ADMIN_COPY.needsYou.snooze.warningOf[row.kind],
                venue: row.venueId ? (row.venueName ?? null) : null,
              }}
            />
          </span>
        )}
      </div>
      <h2
        style={{
          margin: 0,
          // Desktop: 14.5/700 on one line with an ellipsis. Phone: 15/700,
          // wrapping, line height 1.3.
          fontSize: isPhone ? 15 : 14.5,
          fontWeight: 700,
          lineHeight: isPhone ? 1.3 : undefined,
          letterSpacing: '-0.01em',
          color: 'var(--fg)',
          ...(isPhone
            ? {}
            : {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }),
        }}
      >
        {row.title}
      </h2>
      {meta && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--fg-muted)' }}>
          {meta}
        </p>
      )}
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: isPhone ? 1.45 : undefined,
          color: 'var(--fg)',
          opacity: 0.86,
        }}
      >
        {whatOf(row)}
      </p>
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          display: isPhone ? 'grid' : 'flex',
          // Two across when they fit, one per row at 320.
          gridTemplateColumns: isPhone
            ? 'repeat(auto-fit, minmax(140px, 1fr))'
            : undefined,
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 6,
          marginTop: 2,
        }}
      >
        {buttons.map((answer) => (
          <AdminButton
            key={answer.slug}
            variant="outline"
            size={isPhone ? 'md' : 'sm'}
            disabled={busy}
            data-testid="needs-you-answer"
            data-slug={answer.slug}
            onClick={() => onAnswer(answer)}
            style={{
              // 28h/12.5 on desktop, 36h/13 side by side on the phone.
              ...(isPhone ? { height: 36, fontSize: 13 } : { fontSize: 12.5 }),
              // The board tints the lead answer cyan. Only the answer the API
              // suggests is tinted: its order is not a ranking, so the first
              // drawn is not implied to be a recommendation.
              ...(answer.suggested
                ? {
                    color: 'var(--signal)',
                    background:
                      'color-mix(in srgb, var(--signal) 14%, transparent)',
                    borderColor:
                      'color-mix(in srgb, var(--signal) 40%, transparent)',
                  }
                : {}),
            }}
          >
            {cardLabelOf(row, answer)}
          </AdminButton>
        ))}
        {links.map((answer) => (
          <button
            key={answer.slug}
            type="button"
            disabled={busy}
            data-testid="needs-you-answer"
            data-slug={answer.slug}
            onClick={() => onAnswer(answer)}
            style={{
              ...MONO,
              gridColumn: isPhone ? '1 / -1' : undefined,
              // The third answer: a quiet 12.5/600 text button, 28h
              // (30h centred on the phone).
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: isPhone ? 30 : 28,
              padding: '0 8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--fg-muted)',
            }}
          >
            {answer.label}
          </button>
        ))}
        {row.kind === 'price-check' && row.priceFacts?.ticketUrl && (
          // The card's third action: the ticket page, a quiet link beside the
          // two answers (`price-check-m`). A link, not an answer: no API call.
          <a
            href={row.priceFacts.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="card-open-ticket-page"
            style={{
              ...MONO,
              gridColumn: isPhone ? '1 / -1' : undefined,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: isPhone ? 30 : 28,
              padding: '0 8px',
              textAlign: 'center',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--fg-muted)',
              textDecoration: 'none',
            }}
          >
            {ADMIN_COPY.needsYou.panel.priceCheck.openTicket}
          </a>
        )}
      </div>
    </article>
  );
};
