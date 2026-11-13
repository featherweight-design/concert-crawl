'use client';

import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { Check, Pause, RefreshCw, type LucideIcon } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, StatusBadge } from '@/components/admin/primitives';
import type { StatusKind } from '@/components/admin/primitives';
import { leadFirst } from '../needs-you-rules';
import type { NeedsYouAnswer, QueueRow } from '../needs-you-api';

const MONO: CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

/** A labelled block of a panel: the small-caps label, then its content. */
export const Section = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <section style={{ minWidth: 0 }}>
    <h3
      style={{
        ...MONO,
        margin: '0 0 10px',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.14em',
        color: 'var(--fg-subtle)',
      }}
    >
      {label}
    </h3>
    {children}
  </section>
);

export const Prose = ({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) => (
  <p
    style={{
      margin: 0,
      fontSize: 14,
      lineHeight: 1.5,
      overflowWrap: 'anywhere',
      color: muted ? 'var(--fg-muted)' : 'var(--fg)',
    }}
  >
    {children}
  </p>
);

/** The ruled card of label and value rows (CHECKED FOR YOU). */
export const RowCard = ({
  rows,
}: {
  rows: { label: string; value: string }[];
}) => (
  <dl
    style={{
      margin: 0,
      padding: '2px 14px',
      borderRadius: 14,
      border: '1px solid var(--border)',
      background: 'var(--surface-1)',
    }}
  >
    {rows.map((row, index) => (
      <div
        key={row.label}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          padding: '10px 0',
          borderTop: index === 0 ? 'none' : '1px solid var(--border)',
        }}
      >
        <dt style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{row.label}</dt>
        <dd
          style={{
            margin: 0,
            fontSize: 13,
            color: 'var(--fg)',
            textAlign: 'right',
            overflowWrap: 'anywhere',
          }}
        >
          {row.value}
        </dd>
      </div>
    ))}
  </dl>
);

/** The chips under a panel's title. */
export const ChipRow = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>
);

export const Chip = ({
  kind,
  dot = false,
  children,
}: {
  kind: StatusKind;
  dot?: boolean;
  children: ReactNode;
}) => (
  <StatusBadge kind={kind} variant="outline" dot={dot}>
    {children}
  </StatusBadge>
);

const ANSWER_ICONS: Record<string, LucideIcon> = {
  still_on: Check,
  re_crawl_now: RefreshCw,
  re_crawl_once: RefreshCw,
  keep_paused: Pause,
  pause_crawling: Pause,
};

const iconProps = (slug: string): { icon?: LucideIcon } => {
  const icon = ANSWER_ICONS[slug];
  return icon ? { icon } : {};
};

/**
 * YOUR ANSWER: the suggested answer full width in the lead style, the rest in
 * a row under it, then the drawn note. Every button goes through the card's
 * own `onAnswer`.
 */
export const AnswerButtons = ({
  row,
  busy,
  note,
  extra,
  onAnswer,
}: {
  row: QueueRow;
  busy: boolean;
  note: string | null;
  /** A drawn button that is a link, not an answer (e.g. Check source). */
  extra?: ReactNode;
  onAnswer: (answer: NeedsYouAnswer) => void;
}) => {
  const [lead, ...rest] = leadFirst(row);
  const button = (answer: NeedsYouAnswer, wide: boolean) => (
    <AdminButton
      key={answer.slug}
      variant={answer.suggested ? 'gradient' : 'outline'}
      disabled={busy}
      data-testid="needs-you-answer"
      data-slug={answer.slug}
      {...iconProps(answer.slug)}
      onClick={() => onAnswer(answer)}
      style={{ width: '100%', minHeight: wide ? 40 : 36, minWidth: 0 }}
    >
      {answer.label}
    </AdminButton>
  );
  const others = lead && !lead.suggested ? [lead, ...rest] : rest;
  return (
    <Section label={ADMIN_COPY.needsYou.panel.yourAnswer}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lead?.suggested && button(lead, true)}
        <div
          style={{
            display: 'grid',
            gap: 8,
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          }}
        >
          {/* The board's order: the lead, then Check source, then the rest.
              With no lead drawn full width, the first answer stands in. */}
          {lead?.suggested && extra}
          {others.map((answer, index) => (
            <Fragment key={answer.slug}>
              {button(answer, false)}
              {!lead?.suggested && index === 0 && extra}
            </Fragment>
          ))}
        </div>
        {note && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--fg-muted)',
            }}
          >
            {note}
          </p>
        )}
      </div>
    </Section>
  );
};
