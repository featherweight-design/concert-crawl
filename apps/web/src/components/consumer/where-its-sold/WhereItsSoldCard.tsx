'use client';

// WhereItsSoldCard — B+ TS3, screens/06-states/bp-s-tiers_board (VENDORS):
// a WHERE IT'S SOLD eyebrow over hairline-separated rows, each a 28px letter
// tile, the seller in Inter bold, a "GA · all-in" / "face value · no fees"
// line, the price right-aligned in bold and a ›.
//
// The › scrolls to the price card holding the prices (an in-page anchor named
// by the submission id, placed at the top of the price slot). There is no
// per-seller URL to send anyone to, so the row never links out (Design
// item 34).

import {
  CONSUMER_COPY,
  VENDOR_PICKER_COPY,
} from '@/components/consumer/definitions/copy';
import { formatPrice } from '@/components/consumer/definitions/lib';
import { Eyebrow, PRICE_EYEBROW } from '@/components/consumer/glyphs';
import { GlyphChevron } from '@/components/consumer/following/my-shows/Glyphs';
import { resolveAlternateKind } from '@/components/consumer/lib/price-source-kind';
import { displayVendor } from '@/components/consumer/vendor-display';
import {
  priceAnchorId,
  type WhereItsSoldRow,
} from '@/components/consumer/where-its-sold/rows';

const copy = CONSUMER_COPY.whereItsSold;

const EYEBROW_ID = 'where-its-sold-eyebrow';

/** The row's seller name. `Other` reads as the picker's "Somewhere else". */
export const sellerName = (vendor: string): string =>
  vendor === 'Other' ? VENDOR_PICKER_COPY.vendors.Other : displayVendor(vendor);

/** The tile's letter: the seller's initial, or "?" for an unnamed seller. */
export const sellerTile = (vendor: string): string =>
  vendor === 'Other'
    ? copy.otherTile
    : sellerName(vendor).charAt(0).toUpperCase();

/**
 * The line under the seller: box office is face value, the rest all-in.
 * Design item 40 (⏸): the board draws no resale line, so resale reuses
 * "{tier} · all-in", and the box office line drops the tier, so two box
 * office tiers read alike. Both wait on Design.
 */
export const sellerLine = (row: WhereItsSoldRow): string =>
  resolveAlternateKind(row.vendor, row.sourceCategory) === 'boxoffice'
    ? copy.faceValue
    : copy.allIn.replace('{tier}', row.tier);

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
                  <span
                    className="truncate"
                    data-testid="where-its-sold-line"
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: '12px',
                      lineHeight: 1.3,
                      color: 'var(--fg-subtle)',
                    }}
                  >
                    {sellerLine(row)}
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
