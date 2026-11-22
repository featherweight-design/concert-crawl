'use client';

// PublicPriceCard — the read-only price card on the public event page
// (B+ addendum 10, boards/01-public-resale). The trust pill names the kind of
// price and the Sold by line names its seller, in the item 38 and 40
// language of the signed-in card. Every other listed price sits under Also.
//
// Read-only on purpose: it is not EventDetailPriceBlock, which wires price
// submission behind `useAuth`, and it does not carry the Where it's sold
// card, whose › jumps to price cards the mirror does not have.

import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { formatPrice } from '@/components/consumer/definitions/lib';
import { TrustPill } from '@/components/consumer/glyphs';
import { resolveAlternateKind } from '@/components/consumer/lib/price-source-kind';
import { displayVendor } from '@/components/consumer/vendor-display';
import { withResaleWord } from '@/components/consumer/where-its-sold/trust-line';
import { sellerName } from '@/components/consumer/where-its-sold/WhereItsSoldCard';
import type { ListedPrice, PublicPrice } from './public-price';

const copy = CONSUMER_COPY.eventDetail;
const publicCopy = CONSUMER_COPY.publicEvent;

// The seller as the subject of a sentence: "Sold by the venue box office".
const sentenceSeller = (vendor: string): string =>
  vendor === 'VenueBoxOffice'
    ? publicCopy.boxOfficeSeller
    : displayVendor(vendor);

/**
 * Fill a `{slot}` template with nodes. Literal text between the slots passes
 * through `text`, so a caller can colour a word in it.
 */
function fill(
  template: string,
  slots: Record<string, ReactNode>,
  text: (part: string) => ReactNode = (part) => part,
): ReactNode {
  return template.split(/(\{\w+\})/).map((part, index) => {
    const slot = /^\{(\w+)\}$/.exec(part)?.[1];
    return (
      <Fragment key={index}>
        {slot !== undefined && slot in slots ? slots[slot] : text(part)}
      </Fragment>
    );
  });
}

const strong = (children: ReactNode, weight = 700): ReactNode => (
  <span className="text-fg" style={{ fontWeight: weight }}>
    {children}
  </span>
);

const EYEBROW_STYLE = {
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.2em',
} as const;

const LINE_STYLE = { fontSize: 13, lineHeight: 1.4 } as const;

function CardShell({
  pill,
  children,
}: {
  pill: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      data-testid="public-event-price"
      className="rounded-[14px] p-4 lg:px-5 lg:py-[18px]"
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className="m-0 font-mono uppercase text-fg-subtle"
          style={EYEBROW_STYLE}
        >
          {copy.priceRowLabel}
        </p>
        {pill}
      </div>
      {children}
    </div>
  );
}

function AlsoRow({ row }: { row: ListedPrice }) {
  const resale =
    resolveAlternateKind(row.vendor, row.sourceCategory) === 'resale';
  return (
    <li
      data-testid="public-price-also-row"
      className="flex items-center"
      style={{
        gap: 10,
        minHeight: 40,
        padding: '8px 0',
        borderTop: '1px solid var(--border)',
      }}
    >
      <span className="flex min-w-0 flex-1 items-baseline" style={{ gap: 8 }}>
        <span
          className="truncate text-fg"
          style={{ fontSize: 14, fontWeight: 700 }}
        >
          {sellerName(row.vendor)}
        </span>
        <span
          className="shrink-0 font-mono uppercase text-fg-subtle"
          style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em' }}
        >
          {row.tier}
        </span>
      </span>
      {resale && <TrustPill kind="resale" />}
      <span
        className="shrink-0 whitespace-nowrap text-fg"
        style={{ fontSize: 16, fontWeight: 800 }}
      >
        {formatPrice(row.priceMin, row.priceMax)}
      </span>
    </li>
  );
}

export function PublicPriceCard({ price }: { price: PublicPrice }) {
  if (price.case === 'none') return null;

  // The pre-addendum card, unchanged: a crawled number with no seller to
  // name. With no number there is no card.
  if (price.case === 'flat') {
    const label = formatPrice(price.priceMin, price.priceMax);
    if (label === null) return null;
    return (
      <CardShell pill={null}>
        <p
          className="m-0 mt-1 text-fg"
          style={{
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}
        >
          {label}
        </p>
      </CardShell>
    );
  }

  // Case D. Sold out still leads; the cheapest resale moves to the line
  // under it, so a sold-out show never reads as available at face value.
  if (price.case === 'soldout') {
    const { resale } = price;
    return (
      <CardShell pill={resale === null ? null : <TrustPill kind="resale" />}>
        <p
          className="m-0 mt-1 text-fg"
          style={{
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}
        >
          {copy.soldOut}
        </p>
        {resale !== null && (
          <p
            data-testid="public-price-soldout-resale"
            className="m-0 text-fg-muted"
            style={{ ...LINE_STYLE, marginTop: 6 }}
          >
            {fill(
              publicCopy.soldOutResale,
              {
                price: strong(
                  formatPrice(resale.priceMin, resale.priceMax),
                  800,
                ),
                seller: strong(sentenceSeller(resale.vendor)),
              },
              (part) =>
                withResaleWord(part, publicCopy.aboveFaceValue, {
                  weight: 600,
                }),
            )}
          </p>
        )}
      </CardShell>
    );
  }

  // Cases A, B and C.
  const { kind, tier, seller, also, moreCount, resaleOnly } = price;
  const qualifier = (
    kind === 'boxoffice'
      ? publicCopy.priceQualifierBoxOffice
      : publicCopy.priceQualifier
  ).replace('{tier}', tier);
  const soldByTemplate =
    kind === 'resale'
      ? publicCopy.soldByResale
      : kind === 'boxoffice'
        ? publicCopy.soldByBoxOffice
        : publicCopy.soldBy;

  return (
    <CardShell pill={<TrustPill kind={kind} />}>
      {/* The qualifier may wrap under the price at 320 (orchestrator ruling
          5); the pill above never does. */}
      <div
        className="mt-1 flex flex-wrap items-baseline"
        style={{ columnGap: 10 }}
      >
        <span
          data-testid="public-price-amount"
          className="text-[34px] text-fg lg:text-[36px]"
          style={{
            fontWeight: 900,
            letterSpacing: '-0.035em',
            lineHeight: 1.1,
          }}
        >
          {formatPrice(seller.priceMin, seller.priceMax)}
        </span>
        <span
          data-testid="public-price-qualifier"
          className="font-mono uppercase text-fg-muted"
          style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em' }}
        >
          {qualifier}
        </span>
      </div>
      <p
        data-testid="public-price-sold-by"
        className="m-0 text-fg-muted"
        style={{ ...LINE_STYLE, marginTop: 6 }}
      >
        {fill(
          soldByTemplate,
          { seller: strong(sentenceSeller(seller.vendor)) },
          (part) =>
            kind === 'resale'
              ? withResaleWord(part, publicCopy.resaleWord, {
                  testId: 'public-price-resale-word',
                  weight: 600,
                })
              : part,
        )}
      </p>

      {also.length > 0 && (
        <div data-testid="public-price-also" style={{ marginTop: 14 }}>
          <p
            className="m-0 font-mono uppercase text-fg-subtle"
            style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.14em' }}
          >
            {publicCopy.alsoLabel}
          </p>
          <ul className="m-0 list-none p-0" style={{ marginTop: 6 }}>
            {also.map((row) => (
              <AlsoRow key={row.submissionId} row={row} />
            ))}
          </ul>
          {moreCount > 0 && (
            <p
              data-testid="public-price-also-more"
              className="m-0 text-fg-muted"
              style={{
                ...LINE_STYLE,
                paddingTop: 8,
                borderTop: '1px solid var(--border)',
              }}
            >
              {publicCopy.alsoMore.replace('{count}', String(moreCount))}
            </p>
          )}
        </div>
      )}

      {resaleOnly && (
        <div
          data-testid="public-price-resale-only"
          className="flex items-start"
          style={{
            gap: 10,
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px dashed var(--border-strong)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              marginTop: 6,
              flexShrink: 0,
              borderRadius: '50%',
              background: 'var(--trust-resale)',
            }}
          />
          <p
            className="m-0 text-fg-muted"
            style={{ fontSize: 13, lineHeight: 1.45 }}
          >
            {publicCopy.resaleOnlyNote}
          </p>
        </div>
      )}
    </CardShell>
  );
}
