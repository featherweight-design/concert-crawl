// public-price.ts — what the public event page's read-only price card says
// (B+ addendum 10, boards/01-public-resale). The card names the kind of price
// (the trust pill) and who sells it (the Sold by line). Also lists the other
// sellers the signed-in Where it's sold card lists: shown only when two or
// more sellers price the show, so one seller's other tiers do not appear.
//
// Every price here is one the API already resolved in `priceByTier` or the
// Where it's sold rows; nothing reads the denormalised `ticketPriceMin`
// except the flat fallback, which keeps the pre-addendum card exactly.

import type {
  EventDetailResponse,
  SourceCategory,
  Tier,
  Vendor,
} from '@concert-crawl/types';
import { pickApprovedHeadline } from '@/components/consumer/price-region/lib/pick-headline';
import {
  buildWhereItsSoldRows,
  type WhereItsSoldRow,
} from '@/components/consumer/where-its-sold/rows';
import { resolveAlternateKind } from '@/components/consumer/lib/price-source-kind';

/** The Also section shows at most this many rows, then "+N more". */
export const ALSO_LIMIT = 3;

export interface PublicSeller {
  vendor: Vendor;
  priceMin: string;
  priceMax: string | null;
}

export type PublicPrice =
  /** No price at all: the page draws no card. */
  | { case: 'none' }
  /**
   * A crawled price with no corroborated tier: the pre-addendum card, a bare
   * number with no pill and no Sold by line (orchestrator ruling 1).
   */
  | { case: 'flat'; priceMin: string | null; priceMax: string | null }
  /**
   * Sold out (case D). `resale` is the cheapest resale price still listed,
   * or null, when the card says Sold out and nothing else.
   */
  | { case: 'soldout'; resale: PublicSeller | null }
  /** A corroborated headline (cases A, B and C). */
  | {
      case: 'headline';
      kind: 'boxoffice' | 'resale' | 'community';
      tier: Tier;
      seller: PublicSeller;
      /** The other Where it's sold rows, cheapest first, at most ALSO_LIMIT. */
      also: WhereItsSoldRow[];
      /** How many more listed prices the Also section leaves out. */
      moreCount: number;
      /** Case C: resale is the only kind of price listed anywhere. */
      resaleOnly: boolean;
    };

export type PublicPriceEvent = Pick<
  EventDetailResponse,
  | 'status'
  | 'priceStatus'
  | 'priceSubmissionId'
  | 'priceAlternates'
  | 'priceByTier'
  | 'counterSubmission'
  | 'ticketPriceMin'
  | 'ticketPriceMax'
>;

interface Listed {
  vendor: Vendor;
  priceMin: string;
  priceMax: string | null;
  sourceCategory: SourceCategory | null;
}

// Every corroborated price in the per-tier aggregation: each tier's headline
// and its alternates. Pending submissions are left out; this card cannot mark
// an unconfirmed price, so it never shows one.
function listedPrices(event: PublicPriceEvent): Listed[] {
  const out: Listed[] = [];
  for (const block of event.priceByTier ?? []) {
    if (block.headline !== null) out.push(block.headline);
    out.push(...block.alternates);
  }
  return out;
}

const amount = (priceMin: string): number => {
  const value = parseFloat(priceMin);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
};

export function buildPublicPrice(event: PublicPriceEvent): PublicPrice {
  // Sold out leads whatever else is listed: a shared link is often opened
  // after the show sold out, and a price next to a gone show reads as
  // availability. The cheapest resale moves to the line under it. It is read
  // from priceByTier directly, because the Where it's sold rows are empty on
  // a sold-out show (orchestrator ruling 3).
  if (event.priceStatus === 'soldout') {
    let resale: Listed | null = null;
    for (const price of listedPrices(event)) {
      if (
        resolveAlternateKind(price.vendor, price.sourceCategory) !== 'resale'
      ) {
        continue;
      }
      if (resale === null || amount(price.priceMin) < amount(resale.priceMin)) {
        resale = price;
      }
    }
    return {
      case: 'soldout',
      resale:
        resale === null
          ? null
          : {
              vendor: resale.vendor,
              priceMin: resale.priceMin,
              priceMax: resale.priceMax,
            },
    };
  }

  // The cheapest tier's corroborated headline, the one the protected page and
  // the rows lead with.
  const headline = pickApprovedHeadline(event.priceByTier);
  const block =
    headline === null
      ? undefined
      : (event.priceByTier ?? []).find((tier) => tier.headline === headline);
  if (headline === null || block === undefined) {
    if (event.ticketPriceMin === null && event.ticketPriceMax === null) {
      return { case: 'none' };
    }
    return {
      case: 'flat',
      priceMin: event.ticketPriceMin,
      priceMax: event.ticketPriceMax,
    };
  }

  const kind = resolveAlternateKind(headline.vendor, headline.sourceCategory);

  // Also: the Where it's sold rows less the headline, cheapest first
  // (orchestrator ruling 2). The rows arrive in trust order for the signed-in
  // card; this card leads with price, so it re-sorts. Ties keep trust order.
  const others = buildWhereItsSoldRows(event)
    .filter((row) => row.id !== headline.submissionId)
    .map((row, index) => ({ row, index }))
    .sort(
      (left, right) =>
        amount(left.row.priceMin) - amount(right.row.priceMin) ||
        left.index - right.index,
    )
    .map(({ row }) => row);

  const resaleOnly =
    kind === 'resale' &&
    listedPrices(event).every(
      (price) =>
        resolveAlternateKind(price.vendor, price.sourceCategory) === 'resale',
    );

  return {
    case: 'headline',
    kind,
    tier: block.tier,
    seller: {
      vendor: headline.vendor,
      priceMin: headline.priceMin,
      priceMax: headline.priceMax,
    },
    also: others.slice(0, ALSO_LIMIT),
    moreCount: Math.max(0, others.length - ALSO_LIMIT),
    resaleOnly,
  };
}
