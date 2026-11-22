'use client';

// WhereItsSoldCard — B+ TS3, screens/06-states/bp-s-tiers_board (VENDORS):
// a WHERE IT'S SOLD eyebrow over hairline-separated rows, each a 28px letter
// tile, the seller in Inter bold, a "GA · all-in" / "face value · no fees"
// line, the price right-aligned in bold and a ›.
//
// The › scrolls to the price card holding that row's tier (the card or "Other
// tiers" row marked `data-price-tier`); where none is marked, to an in-page
// anchor named by the submission id at the top of the price slot. There is no
// per-seller URL to send anyone to, so the row never links out (Design
// item 34).

import type { MouseEvent } from 'react';
import {
  CONSUMER_COPY,
  VENDOR_PICKER_COPY,
} from '@/components/consumer/definitions/copy';
import { formatPrice } from '@/components/consumer/definitions/lib';
import {
  Eyebrow,
  PRICE_EYEBROW,
  TRUST_TOKENS,
} from '@/components/consumer/glyphs';
import { GlyphChevron } from '@/components/consumer/following/my-shows/Glyphs';
import { resolveAlternateKind } from '@/components/consumer/lib/price-source-kind';
import { displayVendor } from '@/components/consumer/vendor-display';
import {
  priceAnchorId,
  priceTierSelector,
  type WhereItsSoldRow,
} from '@/components/consumer/where-its-sold/rows';

const copy = CONSUMER_COPY.whereItsSold;

const EYEBROW_ID = 'where-its-sold-eyebrow';

// Scroll to the card (or "Other tiers" row) that shows this row's tier. With
// none on the page the link falls through to the row's own anchor.
function scrollToTierCard(
  event: MouseEvent<HTMLAnchorElement>,
  row: WhereItsSoldRow,
): void {
  const target = document.querySelector(priceTierSelector(row.tier));
  if (target === null) return;
  event.preventDefault();
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView?.({
    behavior: calm ? 'auto' : 'smooth',
    block: 'start',
  });
}

/** The row's seller name. `Other` reads as the picker's "Somewhere else". */
export const sellerName = (vendor: string): string =>
  vendor === 'Other' ? VENDOR_PICKER_COPY.vendors.Other : displayVendor(vendor);

/** The tile's letter: the seller's initial, or "?" for an unnamed seller. */
export const sellerTile = (vendor: string): string =>
  vendor === 'Other'
    ? copy.otherTile
    : sellerName(vendor).charAt(0).toUpperCase();

/**
 * The line under the seller, always led by the tier (`40/where-its-sold`):
 * box office "{tier} · face value · no fees", resale "{tier} · resale ·
 * all-in" with "resale" in the Resale trust colour, the rest "{tier} · all-in".
 */
export function SellerLine({ row }: { row: WhereItsSoldRow }) {
  const kind = resolveAlternateKind(row.vendor, row.sourceCategory);
  if (kind === 'boxoffice') {
    return <>{copy.faceValue.replace('{tier}', row.tier)}</>;
  }
  if (kind === 'resale') {
    const line = copy.resaleLine.replace('{tier}', row.tier);
    const at = line.indexOf(copy.resaleWord);
    if (at === -1) return <>{line}</>;
    return (
      <>
        {line.slice(0, at)}
        <span
          data-testid="where-its-sold-resale"
          style={{ color: TRUST_TOKENS.resale.text }}
        >
          {copy.resaleWord}
        </span>
        {line.slice(at + copy.resaleWord.length)}
      </>
    );
  }
  return <>{copy.allIn.replace('{tier}', row.tier)}</>;
}

/**
 * One empty anchor per listed price, all at the top of the price slot, so a
 * row's › scrolls to the price card holding the prices.
 */
export function WhereItsSoldAnchors({ rows }: { rows: WhereItsSoldRow[] }) {
  return (
    <>
      {rows.map((row) => (
        <span
          key={row.id}
          id={priceAnchorId(row.id)}
          data-testid="price-anchor"
          aria-hidden="true"
          className="block scroll-mt-24"
        />
      ))}
    </>
  );
}

export function WhereItsSoldCard({ rows }: { rows: WhereItsSoldRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section
      data-testid="where-its-sold"
      aria-labelledby={EYEBROW_ID}
      style={{
        borderRadius: '16px',
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        // The board leaves about 16px under the last row.
        padding: '22px 18px 16px',
      }}
    >
      <div id={EYEBROW_ID} style={{ paddingBottom: '10px' }}>
        <Eyebrow size={PRICE_EYEBROW.size} tracking={PRICE_EYEBROW.tracking}>
          {copy.eyebrow}
        </Eyebrow>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((row) => {
          const name = sellerName(row.vendor);
          return (
            <li
              key={row.id}
              data-testid="where-its-sold-row"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <a
                href={`#${priceAnchorId(row.id)}`}
                onClick={(event) => scrollToTierCard(event, row)}
                data-price-id={row.id}
                className="flex min-w-0 items-center"
                style={{
                  minHeight: '58px',
                  gap: '14px',
                  color: 'var(--fg)',
                  textDecoration: 'none',
                }}
              >
                <span
                  aria-hidden="true"
                  data-testid="where-its-sold-tile"
                  style={{
                    width: '28px',
                    height: '28px',
                    flexShrink: 0,
                    borderRadius: '8px',
                    background: 'var(--surface-2)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 800,
                    fontSize: '11px',
                  }}
                >
                  {sellerTile(row.vendor)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className="truncate"
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontWeight: 700,
                      fontSize: '16px',
                      lineHeight: 1.25,
                    }}
                  >
                    {name}
                  </span>
                  {/* The line wraps rather than truncates: the tier it now
                      carries is what tells two box office rows apart, and an
                      ellipsis at 320px cut it off. */}
                  <span
                    data-testid="where-its-sold-line"
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: '12px',
                      lineHeight: 1.3,
                      color: 'var(--fg-subtle)',
                    }}
                  >
                    <SellerLine row={row} />
                  </span>
                </span>
                <span
                  data-testid="where-its-sold-price"
                  style={{
                    flexShrink: 0,
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 800,
                    fontSize: '16px',
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatPrice(row.priceMin, row.priceMax)}
                </span>
                <span
                  style={{ color: 'var(--fg-muted)', display: 'inline-flex' }}
                >
                  <GlyphChevron size={12} />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
