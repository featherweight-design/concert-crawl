'use client';

import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminSheet, PersonAvatar } from '@/components/admin/primitives';
import { SafeExternalLink } from '@/components/admin/SafeExternalLink';
import { editEventHref } from '@/lib/admin/edit-event-link';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';
import type { ResolvedCheck, ResolvedSide } from './checks-api';
import { decidedDay, decidedStamp, shortDay } from './checks-rules';
import { kindTag, ticketStyle } from './checks-styles';
import { dollars, priceRange } from './submitted-rules';

const COPY = ADMIN_COPY.pricesChecks;
const SHEET = COPY.resolved.sheet;
const OPEN_TICKET_PAGE = ADMIN_COPY.pricesPage.add.openTicketPage;
/** The phone takes five at a time (`23/checks-resolved-m`). */
export const PHONE_PAGE = 5;

const answerTone = (answer: ResolvedCheck['answer']): string =>
  answer === 'used' ? 'var(--success)' : 'var(--fg-subtle)';

/** "Used $45+" in the success tone, "Kept $50" neutral (`11/price-checks-resolved-d`, `23/…`). */
export const AnswerPill = ({
  answer,
  price,
}: {
  answer: ResolvedCheck['answer'];
  price: string;
}) => {
  const tone = answerTone(answer);
  return (
    <span
      data-testid="resolved-answer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flex: 'none',
        height: 22,
        padding: '0 9px',
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        color: answer === 'used' ? 'var(--success)' : 'var(--fg-muted)',
        background: `color-mix(in srgb, ${tone} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${tone} 32%, transparent)`,
      }}
    >
      {answer === 'used'
        ? COPY.resolved.used(price)
        : COPY.resolved.kept(price)}
    </span>
  );
};

/** The side the answer stood on: the fan's when Used, the listing when Kept. */
const chosenSide = (row: ResolvedCheck): ResolvedSide | null =>
  row.answer === 'used' ? row.challenger : row.parent;

/** The answer's price as a range ("$68–$75"), else the recorded bottom. */
const answerPrice = (row: ResolvedCheck): string => {
  const side = chosenSide(row);
  if (side?.priceMin) return priceRange(side.priceMin, side.priceMax);
  return row.price === null ? '' : dollars(row.price);
};

/** The show's title; "Price check" when the event is gone (row and sheet). */
const titleOf = (row: ResolvedCheck): string => row.title ?? COPY.priceCheck;

const handleOf = (handle: string | null): string =>
  handle === null ? COPY.noHandle : `@${handle}`;

const DecidedBy = ({ row }: { row: ResolvedCheck }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
      minWidth: 0,
      fontSize: 12,
      color: 'var(--fg-subtle)',
    }}
  >
    {row.decidedBy !== null && (
      <PersonAvatar
        initialOf={row.decidedBy}
        avatarColor={row.decidedByAvatar?.color ?? null}
        avatarSecondColor={row.decidedByAvatar?.secondColor ?? null}
        size={18}
        initialSize={8}
      />
    )}
    <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
      {[
        row.decidedBy === null ? null : `@${row.decidedBy}`,
        decidedDay(row.decidedAt),
      ]
        .filter(Boolean)
        .join(' · ')}
    </span>
  </div>
);

/** A WAS LISTED / USED card. The chosen one is outlined; the other is struck. */
const SideCard = ({
  label,
  side,
  chosen,
  tone,
}: {
  label: string;
  side: ResolvedSide;
  chosen: boolean;
  tone: string;
}) => {
  const detail = [
    handleOf(side.handle),
    side.note
      ? SHEET.quoted(side.note)
      : side.confirmed === null
        ? null
        : SHEET.confirmed(side.confirmed),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <div
      data-testid={chosen ? 'resolved-side-chosen' : 'resolved-side-other'}
      style={{
        minWidth: 0,
        borderRadius: 10,
        padding: 10,
        background: 'var(--surface-2)',
        ...(chosen
          ? {
              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tone} 50%, transparent)`,
            }
          : { opacity: 0.6 }),
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: chosen ? tone : 'var(--fg-subtle)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          marginTop: 4,
          fontVariantNumeric: 'tabular-nums',
          textDecoration: chosen ? 'none' : 'line-through',
        }}
      >
        {side.priceMin === null ? '' : priceRange(side.priceMin, side.priceMax)}
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: 'var(--fg-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {detail}
      </div>
    </div>
  );
};

const InfoRow = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      fontSize: 13,
      padding: '8px 0',
      borderTop: '1px solid var(--border)',
    }}
  >
    <span style={{ flex: 'none', color: 'var(--fg-muted)' }}>{label}</span>
    <span style={{ minWidth: 0, textAlign: 'right', overflowWrap: 'anywhere' }}>
      {children}
    </span>
  </div>
);

const toldWords = (row: ResolvedCheck): string | null => {
  const { told } = row;
  if (told === null) return null;
  if (told.includes('parent') && told.includes('challenger')) {
    return SHEET.toldBoth;
  }
  const [only] = told;
  if (only === undefined) return SHEET.toldNone;
  const side = only === 'parent' ? row.parent : row.challenger;
  return SHEET.toldOne(handleOf(side?.handle ?? null));
};

const sheetButton: CSSProperties = {
  ...ticketStyle,
  flex: 1,
  minWidth: 0,
  height: 40,
  fontSize: 13.5,
};

/** `23/checks-resolved-detail-m`: read only, from the row's own data. */
const ResolvedSheet = ({
  row,
  onClose,
}: {
  row: ResolvedCheck;
  onClose: () => void;
}) => {
  const used = row.answer === 'used';
  const tone = used ? 'var(--success)' : 'var(--fg-muted)';
  const title = titleOf(row);
  const told = toldWords(row);
  const ticketUrl = isSafeHttpUrl(row.ticketUrl) ? row.ticketUrl : null;
  // A deleted event keeps its id in the audit entry but has no title: there
  // is no show to open.
  const showId = row.title === null ? null : row.eventId;
  // The listing on the left, the fan's check on the right, whichever won.
  const sides = [
    row.parent && {
      key: 'parent',
      label: used ? SHEET.wasListed : SHEET.kept,
      side: row.parent,
      chosen: !used,
    },
    row.challenger && {
      key: 'challenger',
      label: used ? SHEET.used : COPY.priceCheck,
      side: row.challenger,
      chosen: used,
    },
  ].flatMap((entry) => (entry ? [entry] : []));

  return (
    <AdminSheet
      onClose={onClose}
      label={title}
      eyebrow={
        <>
          <span style={kindTag}>{COPY.priceCheck}</span>
          <AnswerPill answer={row.answer} price={answerPrice(row)} />
        </>
      }
      title={<span style={{ fontSize: 19 }}>{title}</span>}
      subtitle={[
        row.venueName,
        row.date === null ? null : shortDay(row.date, true),
      ]
        .filter(Boolean)
        .join(' · ')}
      footer={
        <>
          {(showId !== null || ticketUrl !== null) && (
            <div style={{ display: 'flex', gap: 8 }}>
              {showId !== null && (
                <Link href={editEventHref(showId)} style={sheetButton}>
                  <ExternalLink
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  {SHEET.openShow}
                </Link>
              )}
              {ticketUrl !== null && (
                <SafeExternalLink href={ticketUrl} style={sheetButton}>
                  <ExternalLink
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  {OPEN_TICKET_PAGE}
                </SafeExternalLink>
              )}
            </div>
          )}
          <p
            style={{
              margin: 0,
              fontSize: 12.5,
              lineHeight: 1.45,
              color: 'var(--fg-muted)',
            }}
          >
            {SHEET.readOnly}
          </p>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sides.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: 8,
            }}
          >
            {sides.map((entry) => (
              <SideCard
                key={entry.key}
                label={entry.label}
                side={entry.side}
                chosen={entry.chosen}
                tone={tone}
              />
            ))}
          </div>
        )}
        <InfoRow label={SHEET.decided}>
          {[
            row.decidedBy === null ? null : `@${row.decidedBy}`,
            decidedStamp(row.decidedAt),
          ]
            .filter(Boolean)
            .join(' · ')}
        </InfoRow>
        {told !== null && <InfoRow label={SHEET.told}>{told}</InfoRow>}
        {row.note && <InfoRow label={SHEET.note}>{row.note}</InfoRow>}
      </div>
    </AdminSheet>
  );
};

/**
 * The phone's Resolved list (`23/checks-resolved-m`): show, venue · date, who
 * decided and when, the answer and a chevron; a row opens the read-only sheet.
 */
export const ResolvedChecksPhone = ({
  rows,
  total,
  more,
  onLoadMore,
}: {
  rows: ResolvedCheck[];
  total: number;
  more: 'idle' | 'loading' | 'failed';
  onLoadMore: () => void;
}) => {
  const [openedId, setOpenedId] = useState<string | null>(null);
  const opened = rows.find((row) => row.id === openedId) ?? null;

  return (
    <div>
      <ul
        aria-label={COPY.resolvedLabel}
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
      >
        {rows.map((row) => (
          <li key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setOpenedId(row.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '12px 0',
                border: 'none',
                background: 'transparent',
                color: 'var(--fg)',
                font: 'inherit',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14.5,
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {titleOf(row)}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: 'var(--fg-muted)',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {[
                    row.venueName,
                    row.date === null ? null : shortDay(row.date),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
                <DecidedBy row={row} />
              </div>
              <AnswerPill answer={row.answer} price={answerPrice(row)} />
              <ChevronRight
                size={14}
                // The board's 1.8 on a 16 box, on lucide's 24.
                strokeWidth={2.7}
                aria-hidden="true"
                style={{ flex: 'none', color: 'var(--fg-subtle)' }}
              />
            </button>
          </li>
        ))}
      </ul>
      <div
        style={{
          padding: '14px 0',
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--fg-muted)',
        }}
      >
        <span>{COPY.resolved.showing(rows.length, total)}</span>
        {total > rows.length && (
          <>
            {' · '}
            <button
              type="button"
              aria-disabled={more === 'loading' || undefined}
              onClick={() => {
                if (more !== 'loading') onLoadMore();
              }}
              style={{
                padding: 0,
                border: 'none',
                background: 'transparent',
                font: 'inherit',
                fontWeight: 600,
                color: 'var(--signal)',
                cursor: 'pointer',
              }}
            >
              {more === 'loading'
                ? COPY.resolved.loadingMore
                : COPY.resolved.loadMore}
            </button>
          </>
        )}
        {more === 'failed' && (
          <div role="alert" style={{ marginTop: 6, color: 'var(--danger)' }}>
            {COPY.resolved.loadMoreFailed}
          </div>
        )}
      </div>
      {opened && (
        <ResolvedSheet row={opened} onClose={() => setOpenedId(null)} />
      )}
    </div>
  );
};
