import { describe, expect, it } from 'vitest';
import type { TierPriceBlock } from '@concert-crawl/types';
import {
  ALSO_LIMIT,
  buildPublicPrice,
  type PublicPriceEvent,
} from './public-price';

type Headline = NonNullable<TierPriceBlock['headline']>;
type Category = 'boxoffice' | 'standard' | 'resale' | null;

const price = (
  submissionId: string,
  vendor: Headline['vendor'],
  priceMin: string,
  sourceCategory: Category = 'standard',
): Headline => ({
  submissionId,
  priceMin,
  priceMax: null,
  vendor,
  sourceCategory,
  submitterHandle: null,
  observedAt: '2026-11-13T10:00:00.000Z',
  approvedAt: '2026-11-13T10:00:00.000Z',
  approvalKind: 'fan',
  confirmsCount: 1,
});

const block = (
  tier: TierPriceBlock['tier'],
  head: TierPriceBlock['headline'],
  alternates: Headline[] = [],
): TierPriceBlock => ({
  tier,
  headline: head,
  alternates,
  pending: [],
  counterSubmission: null,
  reports: 1,
});

const event = (
  overrides: Partial<PublicPriceEvent> = {},
): PublicPriceEvent => ({
  status: 'upcoming',
  priceStatus: 'live',
  priceByTier: null,
  ticketPriceMin: null,
  ticketPriceMax: null,
  ...overrides,
});

describe('buildPublicPrice', () => {
  it('is none with no price at all', () => {
    expect(buildPublicPrice(event())).toEqual({ case: 'none' });
  });

  // Orchestrator ruling 1: a crawled price with no tier keeps the old card.
  it('falls back to the flat scalar when no tier has a headline', () => {
    expect(
      buildPublicPrice(
        event({
          ticketPriceMin: '40',
          priceByTier: [block('GA', null)],
        }),
      ),
    ).toEqual({ case: 'flat', priceMin: '40', priceMax: null });
  });

  it('names a box office headline and its kind (case A)', () => {
    const result = buildPublicPrice(
      event({
        priceByTier: [
          block('GA', price('vbo', 'VenueBoxOffice', '38.00', 'boxoffice')),
        ],
      }),
    );
    expect(result).toMatchObject({
      case: 'headline',
      kind: 'boxoffice',
      tier: 'GA',
      seller: { vendor: 'VenueBoxOffice', priceMin: '38.00' },
      also: [],
      moreCount: 0,
      resaleOnly: false,
    });
  });

  it("reads a 'standard' headline as Community", () => {
    const result = buildPublicPrice(
      event({
        priceByTier: [
          block('GA', price('tm', 'Ticketmaster', '45.00', 'standard')),
        ],
      }),
    );
    expect(result).toMatchObject({ case: 'headline', kind: 'community' });
  });

  // Orchestrator ruling 2: Also is cheapest first, not the API's trust order.
  it('lists every other seller under Also, cheapest first', () => {
    const result = buildPublicPrice(
      event({
        priceByTier: [
          block('GA', price('tm', 'Ticketmaster', '45.00'), [
            price('axs', 'AXS', '47.00'),
          ]),
          block('VIP', price('vbo', 'VenueBoxOffice', '38.00', 'boxoffice')),
        ],
      }),
    );
    if (result.case !== 'headline') throw new Error(result.case);
    expect(result.also.map((row) => [row.submissionId, row.tier])).toEqual([
      ['vbo', 'VIP'],
      ['axs', 'GA'],
    ]);
    expect(result.moreCount).toBe(0);
  });

  it(`caps Also at ${ALSO_LIMIT} rows and counts the rest`, () => {
    const result = buildPublicPrice(
      event({
        priceByTier: [
          block('GA', price('tm', 'Ticketmaster', '45.00'), [
            price('axs', 'AXS', '47.00'),
            price('sg', 'SeatGeek', '60.00', 'resale'),
            price('se', 'StubHub', '55.00', 'resale'),
            price('vs', 'VividSeats', '70.00', 'resale'),
            price('dice', 'DICE', '50.00'),
          ]),
        ],
      }),
    );
    if (result.case !== 'headline') throw new Error(result.case);
    expect(result.also.map((row) => row.submissionId)).toEqual([
      'axs',
      'dice',
      'se',
    ]);
    expect(result.moreCount).toBe(2);
  });

  it('flags resale-only when every listed price is resale (case C)', () => {
    const result = buildPublicPrice(
      event({
        priceByTier: [
          block('GA', price('sh', 'StubHub', '80.00', 'resale'), [
            price('sg', 'SeatGeek', '95.00', 'resale'),
          ]),
        ],
      }),
    );
    expect(result).toMatchObject({
      case: 'headline',
      kind: 'resale',
      resaleOnly: true,
    });
  });

  it('is not resale-only when any listed price is face value (case B)', () => {
    const result = buildPublicPrice(
      event({
        priceByTier: [
          block('GA', price('sh', 'StubHub', '80.00', 'resale')),
          block('VIP', price('vbo', 'VenueBoxOffice', '150.00', 'boxoffice')),
        ],
      }),
    );
    expect(result).toMatchObject({
      case: 'headline',
      kind: 'resale',
      resaleOnly: false,
    });
    // The face-value price that rules out resale-only is on the card too.
    if (result.case !== 'headline') throw new Error(result.case);
    expect(result.also.map((row) => row.submissionId)).toEqual(['vbo']);
  });

  // Orchestrator ruling 3: the cheapest resale comes from priceByTier.
  it('names the cheapest resale on a sold-out show (case D)', () => {
    const result = buildPublicPrice(
      event({
        priceStatus: 'soldout',
        ticketPriceMin: '25',
        priceByTier: [
          block('GA', price('vbo', 'VenueBoxOffice', '25.00', 'boxoffice'), [
            price('sg', 'SeatGeek', '120.00', 'resale'),
          ]),
          block('VIP', price('sh', 'StubHub', '95.00', 'resale')),
        ],
      }),
    );
    expect(result).toEqual({
      case: 'soldout',
      resale: { vendor: 'StubHub', priceMin: '95.00', priceMax: null },
    });
  });

  it('says only sold out when no resale is listed', () => {
    expect(
      buildPublicPrice(
        event({
          priceStatus: 'soldout',
          ticketPriceMin: '25',
          priceByTier: [
            block('GA', price('vbo', 'VenueBoxOffice', '25.00', 'boxoffice')),
          ],
        }),
      ),
    ).toEqual({ case: 'soldout', resale: null });
  });
});
