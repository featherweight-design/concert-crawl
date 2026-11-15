import { AUDIT_ACTION_KEYS, type AuditActionKey } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const SENTENCES = ADMIN_COPY.operations.log.sentences;
type Sentences = typeof SENTENCES;
type Words = readonly [string, string];

/** The sentence keys whose wording depends on the row (a function). */
type VariantKey = {
  [K in keyof Sentences]: Sentences[K] extends (args: never) => Words
    ? K
    : never;
}[keyof Sentences];

const onOff = (sentence: (args: { on: boolean | null }) => Words) => [
  sentence({ on: null }),
  sentence({ on: true }),
  sentence({ on: false }),
];

/**
 * Every wording a variant sentence can take, so a search for "hid" or
 * "tagged" finds it. A row-supplied value (a price range, a role, a date) is
 * left out: the API's own search reads the row's metadata for those. A new
 * function sentence fails typecheck here until its wordings are listed.
 */
const VARIANT_WORDS: Record<VariantKey, readonly Words[]> = {
  'artist.visibility.update': onOff(SENTENCES['artist.visibility.update']),
  'feature_flag.toggle': onOff(SENTENCES['feature_flag.toggle']),
  'price.submission.edit_price': [
    SENTENCES['price.submission.edit_price']({ range: null }),
  ],
  'price.settings.update': [
    SENTENCES['price.settings.update']({ approve: null }),
    SENTENCES['price.settings.update']({ approve: true }),
    SENTENCES['price.settings.update']({ approve: false }),
  ],
  'settings.update': [
    SENTENCES['settings.update']({ settings: null }),
    SENTENCES['settings.update']({ settings: 'budget' }),
    SENTENCES['settings.update']({ settings: 'approveOn' }),
    SENTENCES['settings.update']({ settings: 'approveOff' }),
  ],
  'user.role.update': [SENTENCES['user.role.update']({ role: null })],
  'user.test_account.set': onOff(SENTENCES['user.test_account.set']),
  'venue.crawl_pause': [SENTENCES['venue.crawl_pause']({ until: null })],
};

const isVariantKey = (key: string): key is VariantKey =>
  Object.hasOwn(VARIANT_WORDS, key);

const isActionKey = (key: string): key is AuditActionKey =>
  AUDIT_ACTION_KEYS.some((known) => known === key);

/** The API's cap on `search`; past it the read is a 400. */
export const SEARCH_MAX_LENGTH = 100;

/** The API's cap on `actions` (`GET /v1/admin/audit-log`). */
export const MAX_SEARCH_ACTIONS = 200;

/** Each action key the API knows, with every wording of its sentence. */
const SEARCHABLE: readonly { key: AuditActionKey; text: string }[] =
  Object.entries(SENTENCES).flatMap(([key, entry]) => {
    if (!isActionKey(key)) return [];
    const wordings: readonly Words[] = isVariantKey(key)
      ? VARIANT_WORDS[key]
      : typeof entry === 'function'
        ? []
        : [entry];
    return [
      {
        key,
        text: wordings
          .map(([lead, tail]) => `${lead} ${tail}`)
          .join(' ')
          .toLowerCase(),
      },
    ];
  });

/**
 * "Search the log" (addendum 6 #37): the action keys whose sentence holds
 * every typed word, sent as `actions=` beside `search=`. The sentences live
 * only in the web's copy, so the API can't match them itself. A leading `@`
 * is dropped, as the API does; a blank search matches nothing.
 */
export const actionsMatching = (search: string): AuditActionKey[] => {
  const words = search
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== '');
  if (words.length === 0) return [];
  return SEARCHABLE.filter(({ text }) =>
    words.every((word) => text.includes(word)),
  )
    .map(({ key }) => key)
    .slice(0, MAX_SEARCH_ACTIONS);
};
