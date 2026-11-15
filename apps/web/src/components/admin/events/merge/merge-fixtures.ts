import type { MergeListing, MergePreview } from './merge-api';

/** A crawled listing with a price and Watchers: the board's first card. */
export const CRAWLED: MergeListing = {
  id: 'e-crawled',
  title: 'Clipse & J.I.D',
  date: '2026-11-12',
  showTime: '19:00:00',
  venueId: 'v1',
  venueName: 'Red Rocks',
  source: 'crawled',
  manual: false,
  createdBy: null,
  addedBy: null,
  hidden: false,
  status: 'upcoming',
  lineup: [
    {
      name: 'Clipse',
      role: 'headliner',
      position: 0,
      artistId: 'a1',
      slug: 'clipse',
      unsure: false,
    },
    {
      name: 'J.I.D',
      role: 'support',
      position: 1,
      artistId: 'a2',
      slug: 'jid',
      unsure: false,
    },
  ],
  price: { min: '65', max: '495' },
  watchers: 31,
  concerts: 0,
  submittedPrices: 0,
  reports: { total: 0, byKind: {} },
};

/** The hand-added duplicate: no price, three Watchers, one open report. */
export const MANUAL: MergeListing = {
  ...CRAWLED,
  id: 'e-manual',
  title: 'CLIPSE with special guest JID',
  source: 'manual',
  manual: true,
  createdBy: 'user_admin',
  addedBy: { handle: 'dlo' },
  lineup: [
    {
      name: 'CLIPSE with special guest JID',
      role: 'headliner',
      position: 0,
      artistId: null,
      slug: null,
      unsure: true,
    },
  ],
  price: { min: null, max: null },
  watchers: 3,
  reports: { total: 1, byKind: { 'sold-out': 1 } },
};

/** Keeping the crawled listing (`:id`) and merging the manual one into it. */
export const KEEP_CRAWLED: MergePreview = {
  keptId: CRAWLED.id,
  sourceId: MANUAL.id,
  move: false,
  kept: CRAWLED,
  other: MANUAL,
  sameVenue: true,
  sameDay: true,
  sameNight: true,
  after: { watchers: 34, price: { min: '65', max: '495' } },
  fills: [],
  skipped: [],
};

/** Keeping the manual listing: it takes the crawled row's price. */
export const KEEP_MANUAL: MergePreview = {
  keptId: MANUAL.id,
  sourceId: CRAWLED.id,
  move: false,
  kept: MANUAL,
  other: CRAWLED,
  sameVenue: true,
  sameDay: true,
  sameNight: true,
  after: { watchers: 34, price: { min: '65', max: '495' } },
  fills: ['ticketPriceMin'],
  skipped: [],
};
