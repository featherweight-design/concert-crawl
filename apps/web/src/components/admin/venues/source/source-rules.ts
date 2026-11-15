import { z } from 'zod';
import type { Venue, VenueWithCrawlHealth } from '@concert-crawl/types';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { formatMtTime } from '@/components/admin/health/health-model';

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
/**
 * The Source columns, plus who set `crawl_mode` (#688): read, never sent. The
 * API stamps it from the `crawlMode` a save sends.
 */
export type SourceColumns = Pick<Venue, SourceColumn | 'crawlModeSource'>;

export const sourceColumnsOf = (venue: SourceColumns): SourceColumns => ({
  websiteUrl: venue.websiteUrl,
  extractionStrategy: venue.extractionStrategy,
  platform: venue.platform,
  platformVenueId: venue.platformVenueId,
  apiProvider: venue.apiProvider,
  apiAccountId: venue.apiAccountId,
  crawlMode: venue.crawlMode,
  crawlModeSource: venue.crawlModeSource,
  crawlWaitUntil: venue.crawlWaitUntil,
  crawlWaitForSelector: venue.crawlWaitForSelector,
});

/**
 * Whether Page loading is set by hand: a stored mode an admin picked. The
 * crawler stores its own pick on a venue's first Automatic crawl ('auto'),
 * and an older row's is unknown (null); both read as Automatic.
 */
export const isPageLoadingForced = (columns: SourceColumns): boolean =>
  columns.crawlMode !== null && columns.crawlModeSource === 'admin';

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
 * extraction strategy, and moving off it clears the platform. Drawn by
 * `18/source-advanced-d` (Hugh's ruling 18: the selector stays).
 */
export type Reader = 'auto' | 'structured_data' | 'llm' | 'detail-page';
export const READERS: readonly Reader[] = [
  'auto',
  'structured_data',
  'llm',
  'detail-page',
];

/**
 * Advanced page loading; `auto` is a null draft `crawlMode` (`18/source-advanced-d`
 * draws Automatic · Plain fetch · Full browser). A draft holds a mode only
 * when it is set by hand, saved or not; see `isPageLoadingForced`.
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
    // The crawler's own pick (or an unknown one) reads as Automatic, so
    // picking that same mode by hand is an edit that saves it as forced.
    crawlMode: isPageLoadingForced(columns) ? columns.crawlMode : null,
    waitUntil: columns.crawlWaitUntil,
    waitFor: columns.crawlWaitForSelector ?? '',
  };
};

/**
 * A reader this tab shows but never sets (READINESS addendum 6, eng
 * clarification 1): an AEG or Live Nation feed reads its own data, and a
 * stored `manual` stays as saved. Both reuse the drawn Reader row as a
 * read-only chip, and Back to Automatic leaves them alone. VenuePilot is an
 * API provider with no reader to show, so it has none.
 */
type ReaderLock =
  { kind: 'feed'; seller: 'aeg' | 'livenation' } | { kind: 'manual' };

export const readerLockOf = (
  draft: SourceDraft,
  saved: SourceColumns,
): ReaderLock | null => {
  if (draft.mode === 'feed') {
    return draft.seller === 'aeg' || draft.seller === 'livenation'
      ? { kind: 'feed', seller: draft.seller }
      : null;
  }
  // A manual venue on Detail pages reads as Detail pages, which it does.
  return isStoredManual(saved) && readerOf(saved) === 'auto'
    ? { kind: 'manual' }
    : null;
};

/** The reader's name, for a chip: a lock's, or the pick's. */
const readerLabelOf = (draft: SourceDraft, lock: ReaderLock | null): string => {
  if (lock?.kind === 'feed') return COPY.read.seller.names[lock.seller];
  if (lock?.kind === 'manual') return COPY.advanced.reader.manual;
  return COPY.advanced.reader[draft.reader];
};

/**
 * A closed-Advanced chip: `forced` is a pick set by hand (amber, counts
 * toward "Set by hand"); `lock` is a reader the tab shows but never sets
 * (neutral, never "Set by hand").
 */
export interface AdvancedChip {
  kind: 'forced' | 'lock';
  text: string;
}

/**
 * Advanced, closed (`18/source-forced-d`): amber chips for a Page loading set
 * by hand, then a Reader that isn't Automatic, then a Wait for selector
 * (🔸 undrawn: the board draws Wait for as never a chip, but a selector is a
 * hand pick, so "All automatic" would be untrue). A feed's or a stored
 * `manual`'s reader is a neutral lock chip (🔸 undrawn). Wait until is never
 * a chip; it has no Automatic. A crawl mode the crawler stored itself is a
 * null draft mode (`draftOf`), so it is never a chip.
 */
export const closedChipsOf = (
  draft: SourceDraft,
  saved: SourceColumns,
): AdvancedChip[] => {
  const chips: AdvancedChip[] = [];
  if (draft.crawlMode !== null) {
    chips.push({
      kind: 'forced',
      text: COPY.advanced.forced.pageLoading(
        COPY.advanced.pageLoading[draft.crawlMode],
      ),
    });
  }
  const lock = readerLockOf(draft, saved);
  if (lock !== null) {
    chips.push({
      kind: 'lock',
      text: COPY.advanced.forced.reader(readerLabelOf(draft, lock)),
    });
  } else if (draft.mode === 'page' && draft.reader !== 'auto') {
    chips.push({
      kind: 'forced',
      text: COPY.advanced.forced.reader(readerLabelOf(draft, null)),
    });
  }
  const waitFor = draft.waitFor.trim();
  if (waitFor !== '') {
    chips.push({ kind: 'forced', text: COPY.advanced.forced.waitFor(waitFor) });
  }
  return chips;
};

/**
 * Whether Back to Automatic has anything to clear: a Page loading set by
 * hand, or a forced Reader (a lock never counts, and Wait for is left alone).
 */
export const canGoBackToAutomatic = (draft: SourceDraft): boolean =>
  draft.crawlMode !== null ||
  (draft.mode === 'page' && draft.reader !== 'auto');

/**
 * Back to Automatic (`18/source-advanced-states`), as a patch: Page loading
 * and Reader to Automatic, an unsaved edit. On save, a Page loading set by
 * hand is `crawl_mode = null`, and a forced JSON-LD, Haiku or Detail pages
 * reader is a null strategy and platform. Wait until and Wait for stay
 * (README); a feed's platform and a stored `manual` are locks and stay too.
 */
export const backToAutomatic = (draft: SourceDraft): Partial<SourceDraft> => {
  const patch: Partial<SourceDraft> = {};
  if (draft.crawlMode !== null) patch.crawlMode = null;
  if (draft.mode === 'page' && draft.reader !== 'auto') patch.reader = 'auto';
  return patch;
};

const ADVANCED_KEYS = [
  'crawlMode',
  'reader',
  'waitUntil',
  'waitFor',
] as const satisfies ReadonlyArray<keyof SourceDraft>;

/**
 * How many Advanced settings differ from the saved draft. The reader counts
 * only on the calendar page, where it is shown and written.
 */
export const advancedUnsavedCount = (
  draft: SourceDraft,
  saved: SourceDraft,
): number =>
  ADVANCED_KEYS.filter((key) => {
    if (key === 'waitFor') return draft.waitFor.trim() !== saved.waitFor.trim();
    if (key === 'reader' && draft.mode !== 'page') return false;
    return draft[key] !== saved[key];
  }).length;

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
 *   then it is the reader's (null is the cascade, though Automatic leaves a
 *   stored `manual` as saved). Detail pages sets
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
  // A stored `manual` is a lock: Automatic (Back to Automatic off Detail
  // pages included) leaves it as saved, never null.
  if (reader === 'auto' && isStoredManual(saved)) {
    return saved.extractionStrategy;
  }
  return reader === 'auto' ? null : reader;
};

/**
 * Page loading as the row will hold it: a mode picked by hand is the admin's
 * (the API stamps 'admin'); Automatic over a forced mode clears it (the API
 * stamps null); Automatic over the crawler's own pick, or an unknown one,
 * leaves the row as it is.
 */
const pageLoadingColumnsOf = (
  draft: SourceDraft,
  saved: SourceColumns,
): Pick<SourceColumns, 'crawlMode' | 'crawlModeSource'> => {
  if (draft.crawlMode !== null) {
    return { crawlMode: draft.crawlMode, crawlModeSource: 'admin' };
  }
  return isPageLoadingForced(saved)
    ? { crawlMode: null, crawlModeSource: null }
    : { crawlMode: saved.crawlMode, crawlModeSource: saved.crawlModeSource };
};

export const columnsOf = (
  draft: SourceDraft,
  saved: SourceColumns,
): SourceColumns => {
  const advanced = {
    ...pageLoadingColumnsOf(draft, saved),
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
 * A change of who set the crawl mode sends `crawlMode`: picking the crawler's
 * own mode by hand is how it becomes the admin's.
 */
export const changedColumns = (
  next: SourceColumns,
  saved: SourceColumns,
): SourceColumn[] => {
  const changed = new Set(
    SOURCE_COLUMNS.filter((key) => next[key] !== saved[key]),
  );
  if (next.crawlModeSource !== saved.crawlModeSource) changed.add('crawlMode');
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
 * "3 s minimum before each page or API call, plus jitter": the stored
 * delay, never below
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

/**
 * "Daily, 2:07 AM MT": the daily crawl's real start, from the API's next
 * crawl (the cron, so it follows MST and MDT). Null when there is none to
 * name: outside production, or a venue the daily run skips. The Schedule row
 * is dropped rather than guessed. Checked once, where the venue is fetched
 * (`venueNextCrawlAt`).
 */
export const scheduleLine = (
  nextCrawlAt: VenueWithCrawlHealth['nextCrawlAt'],
): string | null =>
  nextCrawlAt === null || nextCrawlAt === undefined
    ? null
    : COPY.rules.scheduleValue(formatMtTime(nextCrawlAt));

const nextCrawlAtSchema = z.iso.datetime({ offset: true }).nullable();

/**
 * The venue read's `nextCrawlAt`, validated at the fetch: a malformed or
 * missing value is null (no Schedule row), never a guessed time.
 */
export const venueNextCrawlAt = (raw: unknown): string | null => {
  const parsed = nextCrawlAtSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
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
