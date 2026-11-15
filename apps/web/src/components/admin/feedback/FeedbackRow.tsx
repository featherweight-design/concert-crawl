'use client';

import { ChevronRight } from 'lucide-react';
import { KindLabel } from '@/components/admin/primitives';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { AdminFeedbackItem, FeedbackCategory } from '@concert-crawl/types';
import {
  FEEDBACK_KIND,
  doneLine,
  firstLine,
  metaLine,
} from './feedback-list-rules';

export type FeedbackItem = AdminFeedbackItem;

/** Readable category names: the GitHub issue title uses it. */
export const CATEGORY_LABEL: Record<FeedbackCategory, string> =
  ADMIN_COPY.feedback.row.categoryLabel;

const COPY = ADMIN_COPY.feedback.row;

interface FeedbackRowProps {
  item: FeedbackItem;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  /** Done's rows say who finished them on the right. */
  isDone: boolean;
  isPhone: boolean;
  isFirst: boolean;
}

/**
 * One row of `07/feedback`: the kind, a pink dot while unread, the message's
 * first line, and who sent it when. Desktop adds a right side (Done's "Done
 * by", nothing under To read) and a chevron; the phone draws neither. It
 * opens today's inline detail, which 4b replaces.
 */
export function FeedbackRow({
  item,
  isExpanded,
  onToggle,
  isDone,
  isPhone,
  isFirst,
}: FeedbackRowProps) {
  const meta = metaLine(item);
  const title = firstLine(item.message);
  return (
    <button
      type="button"
      data-testid="feedback-row"
      onClick={() => onToggle(item.id)}
      aria-expanded={isExpanded}
      // The "Expand feedback" stem is what the ui-audit harness clicks.
      aria-label={[
        `${isExpanded ? COPY.collapseLabel : COPY.expandLabel} ${meta}`,
        title,
      ].join(COPY.separator)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '13px 16px',
        border: 'none',
        borderTop: isFirst ? 'none' : '1px solid var(--border)',
        background: 'none',
        color: 'var(--fg)',
        textAlign: 'left',
        cursor: 'pointer',
        font: 'inherit',
      }}
    >
      <span style={{ flex: 1, minWidth: 0, display: 'block' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <KindLabel kind={FEEDBACK_KIND[item.category]} />
          {item.status === 'unread' && (
            <span
              data-testid="feedback-unread-dot"
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--accent)',
                flex: 'none',
              }}
            />
          )}
        </span>
        <span
          data-testid="feedback-row-title"
          style={{
            display: isPhone ? '-webkit-box' : 'block',
            marginTop: 7,
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            // The phone board wraps a long title to a second line.
            ...(isPhone
              ? { WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }
              : { whiteSpace: 'nowrap' }),
          }}
        >
          {title}
        </span>
        <span
          style={{
            display: 'block',
            marginTop: 4,
            fontSize: 12,
            color: 'var(--fg-muted)',
          }}
        >
          {meta}
        </span>
      </span>
      {!isPhone && isDone && (
        <span
          data-testid="feedback-done-by"
          style={{
            flex: 'none',
            fontSize: 12,
            color: 'var(--fg-subtle)',
            whiteSpace: 'nowrap',
          }}
        >
          {doneLine(item)}
        </span>
      )}
      {!isPhone && (
        <ChevronRight
          size={14}
          strokeWidth={1.8}
          aria-hidden="true"
          style={{ flex: 'none', display: 'block', color: 'var(--fg-subtle)' }}
        />
      )}
    </button>
  );
}
