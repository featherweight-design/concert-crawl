'use client';

import Link from 'next/link';
import {
  Fragment,
  useContext,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, Pause, RefreshCw, type LucideIcon } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, StatusBadge } from '@/components/admin/primitives';
import type { StatusKind } from '@/components/admin/primitives';
import { PhoneFooterContext } from '../PhoneItemPage';
import { leadFirst } from '../needs-you-rules';
import type { AnswerParams, NeedsYouAnswer, QueueRow } from '../needs-you-api';

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
  <StatusBadge kind={kind} variant="filled" dot={dot}>
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
 * A drawn button that goes somewhere instead of answering: an internal page
 * (Edit, then list) or an outside one in a new tab (Open ticket page).
 */
export const LinkButton = ({
  href,
  testId,
  icon,
  external = false,
  children,
}: {
  href: string;
  testId: string;
  icon: ReactNode;
  external?: boolean;
  children: ReactNode;
}) => {
  const style: CSSProperties = {
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
  };
  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={testId}
      style={style}
    >
      {icon}
      {children}
    </a>
  ) : (
    <Link href={href} data-testid={testId} style={style}>
      {icon}
      {children}
    </Link>
  );
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
  extraFirst = false,
  extraLast = false,
  hide,
  labelOf,
  paramsOf,
  onAnswer,
}: {
  row: QueueRow;
  busy: boolean;
  note: string | null;
  /** A drawn button that is a link, not an answer (e.g. Check source). */
  extra?: ReactNode;
  /** Put `extra` above the answers, full width (the price check's ticket page). */
  extraFirst?: boolean;
  /** Put `extra` after every answer, not after the lead. */
  extraLast?: boolean;
  /** Answers a drawn link stands in for (e.g. Edit, then list). */
  hide?: string[] | undefined;
  /** The label a board draws for an answer, when it differs from the API's. */
  labelOf?: (answer: NeedsYouAnswer) => string;
  /** The fields an answer carries from the panel (a picked artist). */
  paramsOf?: (answer: NeedsYouAnswer) => AnswerParams | undefined;
  onAnswer: (answer: NeedsYouAnswer, params?: AnswerParams) => void;
}) => {
  const [lead, ...rest] = leadFirst({
    answers: row.answers.filter((answer) => !hide?.includes(answer.slug)),
  });
  // On the phone's item page the answers pin to its footer (`an-item-mobile`):
  // the lead 46 high and full width, the rest 40 high in one row.
  const footer = useContext(PhoneFooterContext);
  const button = (answer: NeedsYouAnswer, wide: boolean) => (
    <AdminButton
      key={answer.slug}
      variant={answer.suggested ? 'gradient' : 'outline'}
      disabled={busy}
      data-testid="needs-you-answer"
      data-slug={answer.slug}
      {...iconProps(answer.slug)}
      onClick={() => {
        const params = paramsOf?.(answer);
        if (params) onAnswer(answer, params);
        else onAnswer(answer);
      }}
      style={
        footer
          ? wide
            ? { width: '100%', minHeight: 46, minWidth: 0, fontSize: 15 }
            : {
                // Auto basis: an equal share when the labels fit one row, and
                // a wrap to the next line when they do not.
                flex: '1 1 auto',
                minHeight: 40,
                whiteSpace: 'nowrap',
                fontSize: 13.5,
              }
          : wide
            ? { width: '100%', minHeight: 40, minWidth: 0 }
            : { flex: '1 1 auto', minHeight: 36, whiteSpace: 'nowrap' }
      }
    >
      {labelOf ? labelOf(answer) : answer.label}
    </AdminButton>
  );
  const others = lead && !lead.suggested ? [lead, ...rest] : rest;
  if (footer)
    return (
      <>
        {note && (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--fg-muted)',
            }}
          >
            {note}
          </p>
        )}
        {createPortal(
          <>
            {extraFirst && extra}
            {lead?.suggested && button(lead, true)}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {!extraLast && !extraFirst && lead?.suggested && extra}
              {others.map((answer, index) => (
                <Fragment key={answer.slug}>
                  {button(answer, false)}
                  {!extraLast &&
                    !extraFirst &&
                    !lead?.suggested &&
                    index === 0 &&
                    extra}
                </Fragment>
              ))}
              {extraLast && extra}
            </div>
          </>,
          footer,
        )}
      </>
    );
  return (
    <Section label={ADMIN_COPY.needsYou.panel.yourAnswer}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {extraFirst && extra}
        {lead?.suggested && button(lead, true)}
        <div
          // Labels stay on one line; a row that runs out of room wraps whole
          // buttons to the next line, each growing to fill its row.
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
        >
          {/* The board's order: the lead, then Check source, then the rest.
              With no lead drawn full width, the first answer stands in. */}
          {!extraLast && !extraFirst && lead?.suggested && extra}
          {others.map((answer, index) => (
            <Fragment key={answer.slug}>
              {button(answer, false)}
              {!extraLast &&
                !extraFirst &&
                !lead?.suggested &&
                index === 0 &&
                extra}
            </Fragment>
          ))}
          {extraLast && extra}
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
