// apps/api/src/lib/artist-info.ts
//
// The artist info resolver (artist-search plan PR 6). This part holds the
// pure checks on what Wikimedia returns; the fetch chain and its memo build
// on them.
//
// Plan decision 5: a Commons photo is used only when the file is hosted on
// Commons itself and its licence is free (CC0, public domain, CC BY, CC BY-SA)
// with an author to credit where the licence needs one. The Wikidata P18
// image only ever names a Commons file, and the `imagerepository` check
// proves it, so a non-free English Wikipedia upload can never be returned.

import { z } from 'zod';
import type { ArtistInfoImage } from '@concert-crawl/types';

const CREDIT_MAX_LENGTH = 200;

/** The image tier this resolver produces; the Spotify tier is the route's. */
export type CommonsImage = Extract<ArtistInfoImage, { source: 'commons' }>;

// ── Response shapes (Zod at the boundary; only the fields we read) ─────────
// Exported for the fetch chain, which parses Wikimedia answers with them.

export const imageClaimSchema = z.object({
  rank: z.string(),
  mainsnak: z.object({
    datavalue: z.object({ value: z.string() }).optional(),
  }),
});

const metaValue = z.object({ value: z.string() }).optional();

export const commonsSchema = z.object({
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
