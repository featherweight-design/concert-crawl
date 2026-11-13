'use client';

import type { CSSProperties } from 'react';
import {
  AdminButton,
  KindLabel,
  useIsPhone,
} from '@/components/admin/primitives';
import {
  cardAnswers,
  impactOf,
  isUrgent,
  kindLabelOf,
  metaOf,
  whatOf,
  whenOf,
} from './needs-you-rules';
import type { NeedsYouAnswer, QueueRow } from './needs-you-api';
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
        padding: isPhone ? 18 : '14px 16px',
        borderRadius: isPhone ? 20 : 14,
        background: 'var(--surface-1)',
        border: selected ? '1px solid transparent' : '1px solid var(--border)',
        ...(selected
          ? {
              background:
                'linear-gradient(var(--surface-1), var(--surface-1)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
            }
          : {}),
        opacity: busy ? 0.6 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: isPhone ? 10 : 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <KindLabel kind={kindLabelOf(row.kind)} />
        {when && (
          <span
            style={{
              fontSize: 13,
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
            fontSize: 12.5,
            color: isUrgent(row.kind) ? 'var(--danger)' : 'var(--fg-subtle)',
          }}
        >
          {impactOf(row)}
        </span>
      </div>
      <h2
        style={{
          margin: 0,
          fontSize: isPhone ? 20 : 16,
          fontWeight: 800,
          letterSpacing: '-0.01em',
          color: 'var(--fg)',
        }}
      >
        {row.title}
      </h2>
      {meta && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)' }}>
          {meta}
        </p>
      )}
      <p style={{ margin: 0, fontSize: 14, color: 'var(--fg)' }}>
        {whatOf(row)}
      </p>
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          display: isPhone ? 'grid' : 'flex',
          gridTemplateColumns: isPhone ? '1fr 1fr' : undefined,
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          marginTop: 4,
        }}
      >
        {buttons.map((answer) => (
          <AdminButton
            key={answer.slug}
            variant="outline"
            disabled={busy}
            data-testid="needs-you-answer"
            data-slug={answer.slug}
            onClick={() => onAnswer(answer)}
            style={
              answer.suggested
                ? {
                    color: 'var(--signal)',
                    background:
                      'color-mix(in srgb, var(--signal) 14%, transparent)',
                    borderColor:
                      'color-mix(in srgb, var(--signal) 40%, transparent)',
                  }
                : undefined
            }
          >
            {answer.label}
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
              padding: '6px 8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--fg-muted)',
            }}
          >
            {answer.label}
          </button>
        ))}
        <span
          style={{
            marginLeft: isPhone ? 0 : 'auto',
            gridColumn: isPhone ? '1 / -1' : undefined,
            justifySelf: 'center',
          }}
        >
          <SnoozeMenu
            disabled={busy}
            onSnooze={onSnooze}
            onNotUseful={row.venueId ? onNotUseful : undefined}
          />
        </span>
      </div>
    </article>
  );
};
