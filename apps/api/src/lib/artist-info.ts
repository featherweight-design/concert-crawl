// apps/api/src/lib/artist-info.ts
//
// The Wikimedia half of the artist info resolver (artist-search plan PR 6).
// The route reads the MusicBrainz facts from the slim table itself; this file
// resolves the Wikipedia summary and the Commons photo, starting at the act's
// Wikidata item:
//
//   Wikidata item (from mb_artists.wikidata_id)
//     ├─ enwiki sitelink ─▶ Wikipedia REST summary (extract, article link)
//     └─ P18 image ───────▶ Commons imageinfo + extmetadata (licence, author)
//
// Plan decision 5: a Commons photo is used only when the file is hosted on
// Commons itself and its licence is free (CC0, public domain, CC BY, CC BY-SA)
// with an author to credit where the licence needs one. P18 only ever names a
// Commons file, and the `imagerepository` check proves it, so a non-free
// English Wikipedia upload can never be returned.
//
// Every Wikimedia call carries CRAWLER_USER_AGENT, whose `+` URL is the
// product's contact page, as Wikimedia's User-Agent policy asks. Calls are
// memoised per act for a day (bounded, see MEMO_MAX_ENTRIES), so a busy page
// costs Wikimedia about three requests per act per day per API instance.

import { z } from 'zod';
import { CRAWLER_USER_AGENT } from '@concert-crawl/types';
import type { ArtistInfoImage, ArtistInfoSummary } from '@concert-crawl/types';
import { apiLogger } from './logger.js';

const CREDIT_MAX_LENGTH = 200;
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const WIKIPEDIA_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

/**
 * One deadline for a whole lookup (two sequential hops), not per call: the
 * resolver runs inside a page request, so it gives up early.
 */
const LOOKUP_TIMEOUT_MS = 5_000;
const THUMB_WIDTH = 640;

export const MEMO_TTL_MS = 24 * 60 * 60 * 1_000;
/** A failed lookup is retried sooner, so one Wikimedia blip does not hide a card for a day. */
export const MEMO_FAILURE_TTL_MS = 10 * 60 * 1_000;
/** Oldest entry is evicted past this, so the memo cannot grow with the catalogue. */
export const MEMO_MAX_ENTRIES = 500;

export const WIKIPEDIA_LICENSE = {
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
} as const;

const WIKIDATA_ID = /^Q[1-9]\d*$/;

export interface WikimediaInfo {
  summary: ArtistInfoSummary | null;
  /** Always a Commons image or null; the Spotify tier is the caller's. */
  image: CommonsImage | null;
}

export type FetchLike = (
  url: string,
  init: { headers: Record<string, string>; signal: AbortSignal },
) => Promise<Response>;

/** The image tier this resolver produces; the Spotify tier is the route's. */
export type CommonsImage = Extract<ArtistInfoImage, { source: 'commons' }>;

// ── Response shapes (Zod at the boundary; only the fields we read) ─────────

const imageClaimSchema = z.object({
  rank: z.string(),
  mainsnak: z.object({
    datavalue: z.object({ value: z.string() }).optional(),
  }),
});

const wikidataSchema = z.object({
  error: z.object({ code: z.string() }).optional(),
  entities: z
    .record(
      z.string(),
      z.object({
        sitelinks: z
          .object({ enwiki: z.object({ title: z.string() }).optional() })
          .optional(),
        claims: z
          .object({
            P18: z.array(imageClaimSchema).optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

/** Only `standard` pages carry every field; other types are checked before use. */
const summarySchema = z.object({
  type: z.string(),
  title: z.string(),
  extract: z.string().optional(),
  content_urls: z
    .object({ desktop: z.object({ page: z.string() }) })
    .optional(),
});

const metaValue = z.object({ value: z.string() }).optional();

const commonsSchema = z.object({
  query: z.object({
    pages: z.array(
      z.object({
        missing: z.boolean().optional(),
        imagerepository: z.string().optional(),
        imageinfo: z
          .array(
            z.object({
              thumburl: z.string().optional(),
              descriptionurl: z.string(),
              extmetadata: z
                .object({
                  License: metaValue,
                  LicenseShortName: metaValue,
                  LicenseUrl: metaValue,
                  Artist: metaValue,
                  NonFree: metaValue,
                })
                .optional(),
            }),
          )
          .optional(),
      }),
    ),
  }),
});

// ── Pure helpers (exported for the unit tests) ─────────────────────────────

type ImageClaim = z.infer<typeof imageClaimSchema>;

/** The P18 file to use: a preferred-rank claim first, never a deprecated one. */
export const pickImageFile = (claims: ImageClaim[]): string | null => {
  const usable = claims.filter(
    (claim) => claim.rank !== 'deprecated' && claim.mainsnak.datavalue,
  );
  const chosen =
    usable.find((claim) => claim.rank === 'preferred') ?? usable[0];
  return chosen?.mainsnak.datavalue?.value ?? null;
};

/**
 * Commons' machine licence codes (`License`) that permit reuse: CC0, public
 * domain, and CC BY or CC BY-SA at any version. Anything else (NC, ND, GFDL
 * only, fair use, unknown) is refused.
 */
const FREE_LICENSE = /^(cc0|pd(-.*)?|cc-by-(sa-)?\d(\.\d)?(-[a-z]+)?)$/;

/** Licences whose terms do not require naming the author. */
const NO_ATTRIBUTION = /^(cc0|pd(-.*)?)$/;

/** extmetadata `Artist` is HTML. The credit is plain text the client renders as text. */
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
};

/** One pass, so an escaped entity (`&amp;lt;`) is decoded once, not twice. */
const decodeEntities = (text: string): string =>
  text.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi,
    (
      whole,
      dec: string | undefined,
      hex: string | undefined,
      name: string | undefined,
    ) => {
      const code = dec ? Number(dec) : hex ? parseInt(hex, 16) : null;
      if (code !== null)
        return code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : whole;
      return NAMED_ENTITIES[(name ?? '').toLowerCase()] ?? whole;
    },
  );

export const plainCredit = (html: string): string | null => {
  const text = decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  return text.length > CREDIT_MAX_LENGTH
    ? `${text.slice(0, CREDIT_MAX_LENGTH - 1)}…`
    : text;
};

const isHttpsOn = (value: string, host: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === host;
  } catch {
    return false;
  }
};

/** Decision 5's licence check on one Commons imageinfo answer. */
export const commonsImageFrom = (
  body: z.infer<typeof commonsSchema>,
): CommonsImage | null => {
  const page = body.query.pages[0];
  // `local` on the Commons API means the file lives on Commons itself.
  if (!page || page.missing || page.imagerepository !== 'local') return null;
  const info = page.imageinfo?.[0];
  const meta = info?.extmetadata;
  if (!info?.thumburl || !meta) return null;
  if (meta.NonFree?.value === 'true') return null;

  const code = meta.License?.value.trim().toLowerCase() ?? '';
  const shortName = meta.LicenseShortName?.value.trim();
  if (!FREE_LICENSE.test(code) || !shortName) return null;

  const credit = meta.Artist ? plainCredit(meta.Artist.value) : null;
  if (!credit && !NO_ATTRIBUTION.test(code)) return null;

  if (!isHttpsOn(info.thumburl, 'upload.wikimedia.org')) return null;
  if (!isHttpsOn(info.descriptionurl, 'commons.wikimedia.org')) return null;

  return {
    source: 'commons',
    url: info.thumburl,
    credit,
    license: shortName,
    licenseUrl: licenceLink(meta.LicenseUrl?.value),
    fileUrl: info.descriptionurl,
  };
};

/**
 * The licence link, https only. Older Commons files still name
 * `http://creativecommons.org/...`, which is upgraded rather than dropped,
 * since CC BY needs the link.
 */
const licenceLink = (raw: string | undefined): string | null => {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' && url.hostname === 'creativecommons.org')
      url.protocol = 'https:';
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};

// ── Fetching ───────────────────────────────────────────────────────────────

/** Resolves to the parsed JSON, or throws. A 404 resolves to null. */
const getJson = async (
  fetchImpl: FetchLike,
  url: string,
  signal: AbortSignal,
): Promise<unknown> => {
  const response = await fetchImpl(url, {
    headers: { 'User-Agent': CRAWLER_USER_AGENT, Accept: 'application/json' },
    signal,
  });
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
  return response.json();
};

const loadSummary = async (
  fetchImpl: FetchLike,
  title: string,
  signal: AbortSignal,
): Promise<ArtistInfoSummary | null> => {
  const body = await getJson(
    fetchImpl,
    `${WIKIPEDIA_SUMMARY}${encodeURIComponent(title.replace(/ /g, '_'))}`,
    signal,
  );
  if (body === null) return null;
  const parsed = summarySchema.parse(body);
  // A disambiguation page is about several acts, so its text is about none;
  // `no-extract` and the other non-standard types have nothing to show.
  const extract = parsed.extract?.trim();
  const articleUrl = parsed.content_urls?.desktop.page;
  if (parsed.type !== 'standard' || !extract || !articleUrl) return null;
  if (!isHttpsOn(articleUrl, 'en.wikipedia.org')) return null;
  return {
    extract: parsed.extract ?? extract,
    articleTitle: parsed.title,
    articleUrl,
    ...WIKIPEDIA_LICENSE,
  };
};

const loadCommonsImage = async (
  fetchImpl: FetchLike,
  file: string,
  signal: AbortSignal,
): Promise<WikimediaInfo['image']> => {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: String(THUMB_WIDTH),
    iiextmetadatafilter: 'License|LicenseShortName|LicenseUrl|Artist|NonFree',
    titles: `File:${file}`,
  });
  const body = await getJson(fetchImpl, `${COMMONS_API}?${params}`, signal);
  return body === null ? null : commonsImageFrom(commonsSchema.parse(body));
};

export const isWikidataId = (value: string): boolean => WIKIDATA_ID.test(value);

/**
 * The uncached lookup. The Wikidata hop throws on a network, HTTP or shape
 * failure. The summary and the image are then fetched independently: a
 * failure in one is reported through `onPartialFailure` and answers null for
 * that half only, so a Commons outage does not cost the act its summary. A
 * missing item, article or image is not a failure.
 */
export const lookupWikimedia = async (
  wikidataId: string,
  fetchImpl: FetchLike,
  onPartialFailure: (err: unknown) => void = () => {},
): Promise<WikimediaInfo> => {
  if (!isWikidataId(wikidataId)) return { summary: null, image: null };
  const signal = AbortSignal.timeout(LOOKUP_TIMEOUT_MS);
  const params = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    formatversion: '2',
    ids: wikidataId,
    props: 'sitelinks|claims',
    sitefilter: 'enwiki',
  });
  const body = await getJson(fetchImpl, `${WIKIDATA_API}?${params}`, signal);
  if (body === null) return { summary: null, image: null };
  const parsed = wikidataSchema.parse(body);
  // A deleted item answers 200 with an error body: a lasting "no data".
  if (parsed.error?.code === 'no-such-entity')
    return { summary: null, image: null };
  if (!parsed.entities)
    throw new Error(`Wikidata error ${parsed.error?.code ?? 'unknown'}`);
  // A merged item answers under the id it redirects to, so fall back to the
  // only entity asked for.
  const entity =
    parsed.entities[wikidataId] ?? Object.values(parsed.entities)[0];
  const title = entity?.sitelinks?.enwiki?.title;
  const file = pickImageFile(entity?.claims?.P18 ?? []);

  const [summary, image] = await Promise.allSettled([
    title ? loadSummary(fetchImpl, title, signal) : null,
    file ? loadCommonsImage(fetchImpl, file, signal) : null,
  ]);
  const settled = <T>(result: PromiseSettledResult<T | null>): T | null => {
    if (result.status === 'fulfilled') return result.value;
    onPartialFailure(result.reason);
    return null;
  };
  return { summary: settled(summary), image: settled(image) };
};

// ── Memo ───────────────────────────────────────────────────────────────────

interface MemoEntry {
  expiresAt: number;
  value: Promise<WikimediaInfo>;
}

const memo = new Map<string, MemoEntry>();

export const resetArtistInfoMemo = (): void => memo.clear();

const empty = (): WikimediaInfo => ({ summary: null, image: null });

/**
 * The memoised lookup, keyed by MBID and Wikidata id (a weekly reload can
 * change the item an MBID points at). Concurrent requests for one act share
 * one in-flight lookup. Never rejects: a failure is logged, answers what it
 * could (or empty), and is kept for MEMO_FAILURE_TTL_MS only. A malformed id
 * answers empty without taking a memo slot.
 */
export const resolveWikimediaInfo = (
  mbid: string,
  wikidataId: string,
  fetchImpl: FetchLike = fetch,
  now: () => number = Date.now,
): Promise<WikimediaInfo> => {
  if (!isWikidataId(wikidataId)) return Promise.resolve(empty());
  const key = `${mbid}:${wikidataId}`;
  const hit = memo.get(key);
  if (hit && hit.expiresAt > now()) return hit.value;
  memo.delete(key);

  const failed = (err: unknown): void => {
    const entry = memo.get(key);
    if (entry?.value === value) entry.expiresAt = now() + MEMO_FAILURE_TTL_MS;
    apiLogger.warn(
      { err, mbid, wikidataId },
      'artist info: Wikimedia lookup failed',
    );
  };
  const value = lookupWikimedia(wikidataId, fetchImpl, failed).catch(
    (err: unknown) => {
      failed(err);
      return empty();
    },
  );

  // A Map iterates in insertion order, so the first key is the oldest.
  while (memo.size >= MEMO_MAX_ENTRIES) {
    const oldest = memo.keys().next().value;
    if (oldest === undefined) break;
    memo.delete(oldest);
  }
  memo.set(key, { expiresAt: now() + MEMO_TTL_MS, value });
  return value;
};
