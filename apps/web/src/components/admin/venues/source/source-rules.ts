import type { Venue } from '@concert-crawl/types';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.venueSource;

/**
 * The columns the Source tab reads and writes (3b part 6). Nothing else: the
 * request delay and the robots.txt columns are the crawl rules, shown and
 * never sent, and `debug_capture_html` is held (Hugh, row 13). The type
 * refuses a crawl-rule column at compile time.
 */
type CrawlRuleColumn =
  'crawlDelayMs' | 'robotsTxtAllowed' | 'robotsTxtCheckedAt';
export const SOURCE_COLUMNS = [
  'websiteUrl',
  'extractionStrategy',
  'platform',
  'platformVenueId',
  'apiProvider',
  'apiAccountId',
  'crawlMode',
  'crawlWaitUntil',
  'crawlWaitForSelector',
] as const satisfies ReadonlyArray<Exclude<keyof Venue, CrawlRuleColumn>>;
export type SourceColumn = (typeof SOURCE_COLUMNS)[number];
export type SourceColumns = Pick<Venue, SourceColumn>;

export const sourceColumnsOf = (venue: SourceColumns): SourceColumns => ({
  websiteUrl: venue.websiteUrl,
  extractionStrategy: venue.extractionStrategy,
  platform: venue.platform,
  platformVenueId: venue.platformVenueId,
  apiProvider: venue.apiProvider,
  apiAccountId: venue.apiAccountId,
  crawlMode: venue.crawlMode,
  crawlWaitUntil: venue.crawlWaitUntil,
  crawlWaitForSelector: venue.crawlWaitForSelector,
});

/**
 * The radios of How we read it. Don't crawl is out of 6b: the crawler does not
 * honour `extraction_strategy = 'manual'` yet, so the tab never writes it.
 */
export type ReadMode = 'page' | 'feed';
export const READ_MODES: readonly ReadMode[] = ['page', 'feed'];

/**
 * The real feeds only (A3 §3b row 1): VenuePilot is an API provider, AEG and
 * Live Nation are platforms. Each one addresses the venue by an ID.
 */
export const FEED_SELLERS = ['venuepilot', 'aeg', 'livenation'] as const;
export type FeedSeller = (typeof FEED_SELLERS)[number];
export const isFeedSeller = (value: unknown): value is FeedSeller =>
  FEED_SELLERS.some((seller) => seller === value);

/**
 * The Advanced reader (ruling c); `auto` is the cascade. `detail-page` is the
 * `platform = 'detail-page'` way of reading the calendar page (#1295), not an
 * extraction strategy, and moving off it clears the platform.
 *
 * ⏸ removal waits on Design item 18: the board draws no reader selector, but
 * it is the only way to clear a forced strategy or detail-page today.
 */
export type Reader = 'auto' | 'structured_data' | 'llm' | 'detail-page';
export const READERS: readonly Reader[] = [
  'auto',
  'structured_data',
  'llm',
  'detail-page',
];

/**
 * Advanced page loading; `auto` is `crawl_mode = null`.
 *
 * ⏸ pending Design item 18: the board draws two segments (Plain fetch, Full
 * browser), but main offers Automatic today, so it stays as a third segment
 * in the drawn control (coordinator ruling) and a save can set it back.
 */
export type PageLoading = 'auto' | NonNullable<Venue['crawlMode']>;
export const PAGE_LOADINGS: readonly PageLoading[] = [
  'auto',
  'http',
  'browser',
];
export const pageLoadingOf = (crawlMode: Venue['crawlMode']): PageLoading =>
  crawlMode ?? 'auto';
export const crawlModeOf = (loading: PageLoading): Venue['crawlMode'] =>
  loading === 'auto' ? null : loading;

export type WaitUntil = Venue['crawlWaitUntil'];

/** What the tab's inputs hold. Strings stay as typed until a save. */
export interface SourceDraft {
  mode: ReadMode;
  websiteUrl: string;
  seller: FeedSeller | null;
  feedId: string;
  reader: Reader;
  crawlMode: Venue['crawlMode'];
  waitUntil: WaitUntil;
  waitFor: string;
}

/**
 * The radio a saved venue reads as (spec row 2): VenuePilot (which the
 * crawler's dispatch also prefers), then AEG or Live Nation. Everything else,
 * Ticketure, `detail-page` and a stored `manual` included, reads the calendar
 * page, which is what the crawler does with it today.
 */
export const readModeOf = (columns: SourceColumns): ReadMode => {
  if (columns.apiProvider === 'venuepilot') return 'feed';
  if (columns.platform === 'aeg' || columns.platform === 'livenation') {
    return 'feed';
  }
  return 'page';
};

const sellerOf = (columns: SourceColumns): FeedSeller | null => {
  if (columns.apiProvider === 'venuepilot') return 'venuepilot';
  if (columns.platform === 'aeg' || columns.platform === 'livenation') {
    return columns.platform;
  }
  return null;
};

const feedIdOf = (columns: SourceColumns, seller: FeedSeller | null) =>
  (seller === 'venuepilot'
    ? columns.apiAccountId
    : seller === null
      ? null
      : columns.platformVenueId) ?? '';

/** The reader a saved venue shows: `detail-page` first, then a forced one. */
export const readerOf = (columns: SourceColumns): Reader => {
  if (columns.platform === 'detail-page') return 'detail-page';
  if (
    columns.extractionStrategy === 'structured_data' ||
    columns.extractionStrategy === 'llm'
  ) {
    return columns.extractionStrategy;
  }
  return 'auto';
};

/** A stored `manual` the crawler does not skip yet, shown with a note. */
export const isStoredManual = (columns: SourceColumns): boolean =>
  columns.extractionStrategy === 'manual';

export const draftOf = (columns: SourceColumns): SourceDraft => {
  const seller = sellerOf(columns);
  return {
    mode: readModeOf(columns),
    websiteUrl: columns.websiteUrl,
    seller,
    feedId: feedIdOf(columns, seller),
    reader: readerOf(columns),
    crawlMode: columns.crawlMode,
    waitUntil: columns.crawlWaitUntil,
    waitFor: columns.crawlWaitForSelector ?? '',
  };
};

const DRAFT_KEYS = [
  'mode',
  'websiteUrl',
  'seller',
  'feedId',
  'reader',
  'crawlMode',
  'waitUntil',
  'waitFor',
] as const satisfies ReadonlyArray<keyof SourceDraft>;

/**
 * A dirty draft moved onto a newer server row: the fields edited against the
 * old row stay, every other field takes the new row's value. The seller and
 * its ID move together, so an edited ID never lands on another seller.
 */
export const rebaseDraft = (
  draft: SourceDraft,
  oldSaved: SourceDraft,
  newSaved: SourceDraft,
): SourceDraft => {
  const next: SourceDraft = { ...newSaved };
  const keep = <K extends keyof SourceDraft>(key: K) => {
    next[key] = draft[key];
  };
  for (const key of DRAFT_KEYS) {
    if (draft[key] !== oldSaved[key]) keep(key);
  }
  if (draft.seller !== oldSaved.seller || draft.feedId !== oldSaved.feedId) {
    keep('seller');
    keep('feedId');
  }
  return next;
};

/**
 * The feed ID a seller pick starts with: the saved ID when it is the saved
 * seller, so a mis-tap and back loses nothing; otherwise empty.
 */
export const feedIdForSeller = (
  seller: FeedSeller,
  saved: SourceColumns,
): string => (sellerOf(saved) === seller ? feedIdOf(saved, seller) : '');

/**
 * What a draft writes, over the saved columns (spec "How we read it"):
 *
 * - Calendar page: no API provider, and the reader. `extraction_strategy`
 *   stays as saved (a stored `manual` included) until the reader changes;
 *   then it is the reader's (null is the cascade). Detail pages sets
 *   `platform = 'detail-page'` with no venue ID and, like the old Platform
 *   select, leaves the strategy alone; any other reader clears the platform.
 * - Ticketing feed: no extraction strategy; VenuePilot sets `api_provider`
 *   and `api_account_id` and clears the platform, AEG and Live Nation set
 *   `platform` and `platform_venue_id` and clear the provider.
 *
 * The calendar page and Advanced only write while they are shown.
 */
const strategyOf = (
  reader: Reader,
  saved: SourceColumns,
): SourceColumns['extractionStrategy'] => {
  if (reader === readerOf(saved) || reader === 'detail-page') {
    return saved.extractionStrategy;
  }
  return reader === 'auto' ? null : reader;
};

export const columnsOf = (
  draft: SourceDraft,
  saved: SourceColumns,
): SourceColumns => {
  const advanced = {
    crawlMode: draft.crawlMode,
    crawlWaitUntil: draft.waitUntil,
    crawlWaitForSelector: draft.waitFor.trim() || null,
  };
  if (draft.mode === 'page') {
    return {
      ...advanced,
      websiteUrl: draft.websiteUrl.trim(),
      extractionStrategy: strategyOf(draft.reader, saved),
      platform: draft.reader === 'detail-page' ? 'detail-page' : null,
      platformVenueId: null,
      apiProvider: null,
      apiAccountId: null,
    };
  }
  const feedId = draft.feedId.trim() || null;
  const { seller } = draft;
  const venuePilot = seller === 'venuepilot';
  return {
    ...advanced,
    websiteUrl: saved.websiteUrl,
    extractionStrategy: null,
    platform: seller === 'aeg' || seller === 'livenation' ? seller : null,
    platformVenueId: venuePilot ? null : feedId,
    apiProvider: venuePilot ? 'venuepilot' : null,
    apiAccountId: venuePilot ? feedId : null,
  };
};

/**
 * The saved columns as an untouched draft would write them. Dirty and the
 * save compare against this, not the raw row, so an old row's leftovers (an
 * account ID with no provider) never read as an edit nobody made.
 */
export const pristineColumns = (saved: SourceColumns): SourceColumns =>
  columnsOf(draftOf(saved), saved);

/**
 * The columns a save sends: the changed ones, with each pair whole. The API
 * wants a platform's venue ID in the same body as the platform, and an
 * account ID with its provider. Unchanged browser-gate fields stay out, so an
 * old browser venue with no selector can still change its calendar page.
 */
export const changedColumns = (
  next: SourceColumns,
  saved: SourceColumns,
): SourceColumn[] => {
  const changed = new Set(
    SOURCE_COLUMNS.filter((key) => next[key] !== saved[key]),
  );
  const pairs: ReadonlyArray<readonly [SourceColumn, SourceColumn]> = [
    ['platform', 'platformVenueId'],
    ['apiProvider', 'apiAccountId'],
  ];
  for (const [first, second] of pairs) {
    if (changed.has(first) || changed.has(second)) {
      changed.add(first);
      changed.add(second);
    }
  }
  return SOURCE_COLUMNS.filter((key) => changed.has(key));
};

/**
 * The columns a draft changes, against the pristine baseline. Dirty and the
 * save both call this, never `changedColumns` on the raw row, so an old row's
 * leftovers are never sent as a clear the admin didn't make.
 */
export const dirtyColumns = (
  draft: SourceDraft,
  saved: SourceColumns,
): SourceColumn[] =>
  changedColumns(columnsOf(draft, saved), pristineColumns(saved));

/** The update action's FormData for those columns; empty means null. */
export const sourceFormData = (
  next: SourceColumns,
  keys: readonly SourceColumn[],
): FormData => {
  const formData = new FormData();
  for (const key of keys) formData.set(key, next[key] ?? '');
  return formData;
};

/** The inputs a save can be refused on. */
export type SourceField = 'mode' | 'websiteUrl' | 'feedId' | 'waitFor';
export type SourceErrors = Partial<Record<SourceField, string>>;

export const sellerName = (seller: FeedSeller): string =>
  COPY.read.seller.names[seller];

/**
 * Checked before any request: the calendar page and the feed fields. The
 * API's browser-mode selector check is not mirrored; its 400 lands on Wait for
 * through `sourceFieldOf`.
 */
export const validateSource = (draft: SourceDraft): SourceErrors => {
  if (draft.mode === 'page' && !isSafeHttpUrl(draft.websiteUrl.trim())) {
    return { websiteUrl: COPY.read.calendarPage.invalid };
  }
  if (draft.mode === 'feed') {
    if (draft.seller === null) return { mode: COPY.read.seller.required };
    if (draft.feedId.trim() === '') {
      return { feedId: COPY.read.feedId.required(sellerName(draft.seller)) };
    }
  }
  return {};
};

/** Where the API's `field` lands in this tab, if it is one of ours. */
export const sourceFieldOf = (
  field: string | undefined,
): SourceField | null => {
  if (field === 'websiteUrl') return 'websiteUrl';
  if (field === 'platformVenueId' || field === 'apiAccountId') return 'feedId';
  if (field === 'crawlWaitForSelector') return 'waitFor';
  return null;
};

/**
 * "3 s minimum between pages, plus jitter": the stored delay, never below
 * 3 s. robots.txt's Crawl-delay is resolved at crawl time and not stored, so
 * the board's "raised by robots.txt to 10 s" clause has nothing to read yet.
 */
export const paceLine = (crawlDelayMs: number): string => {
  // Rounded to a tenth first, so 3999 reads "4", never "4.0".
  const seconds = Math.round(Math.max(3000, crawlDelayMs) / 100) / 10;
  return COPY.rules.paceValue(
    Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(1),
  );
};

/** What is still saved, for the save-failed toast. */
export const stillSavedLine = (columns: SourceColumns): string => {
  const seller = sellerOf(columns);
  if (readModeOf(columns) === 'feed' && seller !== null) {
    return COPY.failed.saved.feed(sellerName(seller));
  }
  return COPY.failed.saved.page;
};

export type RobotsState = 'allowed' | 'disallowed' | 'unchecked';
export const robotsStateOf = (allowed: boolean | null): RobotsState =>
  allowed === null ? 'unchecked' : allowed ? 'allowed' : 'disallowed';
