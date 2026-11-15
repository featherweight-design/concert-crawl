'use client';

import type { CSSProperties } from 'react';
import { ChevronRight } from 'lucide-react';
import { KindLabel } from '@/components/admin/primitives';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { AdminFeedbackItem } from '@concert-crawl/types';
import {
  doneLine,
  firstLine,
  kindOf,
  metaLine,
  rowHints,
} from './feedback-list-rules';

export type FeedbackItem = AdminFeedbackItem;

const COPY = ADMIN_COPY.feedback.row;

/** The row's right-side text: Done's "Done by" and To read's marks. */
const sideStyle: CSSProperties = {
  flex: 'none',
  fontSize: 12,
  color: 'var(--fg-subtle)',
  whiteSpace: 'nowrap',
};

interface FeedbackRowProps {
  item: FeedbackItem;
  /** Opens the item: the side panel, or the page on the phone. */
  onOpen: (id: string) => void;
  /** Done's rows say who finished them on the right. */
  isDone: boolean;
  isPhone: boolean;
  isFirst: boolean;
}

/**
 * One row of `07/feedback`: the kind, a pink dot while unread, the message's
 * first line, and who sent it when. Desktop adds a right side (Done's "Done
 * by", nothing under To read) and a chevron; the phone draws neither. It
 * opens the item (4b).
 */
export function FeedbackRow({
  item,
  onOpen,
  isDone,
  isPhone,
  isFirst,
}: FeedbackRowProps) {
  const meta = metaLine(item);
  const title = firstLine(item.message);
  const hints = rowHints(item);
  return (
    <button
      type="button"
      data-testid="feedback-row"
      onClick={() => onOpen(item.id)}
      aria-haspopup="dialog"
      // The "Expand feedback" stem is what the ui-audit harness clicks.
      // The label replaces the row's text, so it carries what the dot and the
      // Done side say too.
      aria-label={[
        `${COPY.expandLabel} ${meta}`,
        item.status === 'unread' ? COPY.unread : null,
        title,
        isDone ? doneLine(item) : null,
        ...(isDone ? [] : hints),
      ]
        .filter((part): part is string => part !== null)
        .join(COPY.separator)}
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
          <KindLabel kind={kindOf(item)} />
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
        {/* No phone list board for the marks (addendum 7): they take a line
            under the meta, since the phone row has no right side. */}
        {isPhone && !isDone && hints.length > 0 && (
          <span
            data-testid="feedback-hints"
            style={{ ...sideStyle, display: 'block', marginTop: 4 }}
          >
            {hints.join(COPY.separator)}
          </span>
        )}
      </span>
      {!isPhone && isDone && (
        <span data-testid="feedback-done-by" style={sideStyle}>
          {doneLine(item)}
        </span>
      )}
      {!isPhone && !isDone && hints.length > 0 && (
        <span data-testid="feedback-hints" style={sideStyle}>
          {hints.join(COPY.separator)}
        </span>
      )}
      {/* The Done board draws no chevron; 1.8 on its 16 grid is 2.7 on Lucide's 24. */}
      {!isPhone && !isDone && (
        <ChevronRight
          size={14}
          strokeWidth={2.7}
          aria-hidden="true"
          style={{ flex: 'none', display: 'block', color: 'var(--fg-subtle)' }}
        />
      )}
    </button>
  );
}
