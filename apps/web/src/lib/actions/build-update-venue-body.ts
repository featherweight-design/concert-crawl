import { isVenuePlatform, platformRequiresVenueId } from '@concert-crawl/types';
import type { VenuePlatform } from '@concert-crawl/types';

// Narrow a raw string to one of a fixed set of literals without an `as` cast.
// `find` compares by value and returns the matched literal (typed as the union
// member) or undefined, so TypeScript infers the union without an assertion.
function matchLiteral<T extends string>(
  value: string,
  allowed: readonly T[],
): T | undefined {
  return allowed.find((option) => option === value);
}

// Assemble the PATCH body from the edit-venue FormData. Lives outside the
// 'use server' action module so (a) Next.js doesn't reject it for being a
// synchronous export from a server-action file, and (b) the FormData→JSON
// normalization (notably the paired apiProvider/apiAccountId fields) stays
// unit-testable without pulling in the Next.js server runtime.
//
// A key missing from the FormData leaves its field out of the body, so one
// tab's save (Source, 3b part 6) sends only that tab's fields. The request
// delay is never sent: the crawl rules are read-only and the API refuses it.
export function buildUpdateVenueBody(
  formData: FormData,
): Record<string, unknown> {
  /** Absent → undefined (left out of the JSON body); present → `read(raw)`. */
  const ifPresent = <T>(
    key: string,
    read: (raw: FormDataEntryValue) => T,
  ): T | undefined => {
    const raw = formData.get(key);
    return raw === null ? undefined : read(raw);
  };
  /** A trimmed string, with empty as null (clear). */
  const trimmedOrNull = (raw: FormDataEntryValue): string | null =>
    String(raw).trim() === '' ? null : String(raw).trim();

  const crawlWaitUntilRaw = String(formData.get('crawlWaitUntil') ?? '');
  const VALID_WAIT_UNTIL = ['networkidle', 'load', 'domcontentloaded'] as const;
  const crawlWaitUntil = matchLiteral(crawlWaitUntilRaw, VALID_WAIT_UNTIL);

  // The browser-gate fields (crawl mode, selector, platform, API provider)
  // leave the body when their keys are absent, so a save that does not touch
  // them skips the API's browser-mode selector guard.
  const crawlWaitForSelectorRaw = formData.get('crawlWaitForSelector');
  const crawlWaitForSelector =
    crawlWaitForSelectorRaw === null
      ? undefined
      : String(crawlWaitForSelectorRaw).trim() === ''
        ? null
        : String(crawlWaitForSelectorRaw).trim();

  const ticketVendor = ifPresent('ticketVendor', trimmedOrNull);

  const crawlModeRaw = formData.get('crawlMode');
  const crawlMode =
    crawlModeRaw === 'http' || crawlModeRaw === 'browser'
      ? crawlModeRaw
      : crawlModeRaw === ''
        ? null
        : undefined;

  const VALID_EXTRACTION_STRATEGIES = [
    'structured_data',
    'llm',
    'manual',
  ] as const;
  const extractionStrategy = ifPresent('extractionStrategy', (raw) =>
    String(raw) === ''
      ? null
      : matchLiteral(String(raw), VALID_EXTRACTION_STRATEGIES),
  );

  const address = ifPresent('address', trimmedOrNull);

  const capacity = ifPresent('capacity', (raw) => {
    const trimmed = String(raw).trim();
    if (trimmed === '') return null;
    const num = Number(trimmed);
    return Number.isFinite(num) && Number.isInteger(num) && num > 0
      ? num
      : undefined;
  });

  const venueType = ifPresent('venueType', trimmedOrNull);
  const about = ifPresent('about', trimmedOrNull);
  const neighborhood = ifPresent('neighborhood', trimmedOrNull);

  const featuredRaw = formData.get('featured');
  const featured = featuredRaw !== null ? featuredRaw === 'true' : undefined;

  const priceUrl = ifPresent('priceUrl', trimmedOrNull);

  const debugCaptureHtmlRaw = formData.get('debugCaptureHtml');
  const debugCaptureHtml =
    debugCaptureHtmlRaw !== null ? debugCaptureHtmlRaw === 'true' : undefined;

  // Platform routing (#721/#665). Empty string means "Auto (no platform)".
  // When platform is null the API force-clears platformVenueId anyway, but
  // send null explicitly so the payload states the full intent.
  const platformRaw = formData.get('platform');
  const platform: VenuePlatform | null | undefined = isVenuePlatform(
    platformRaw,
  )
    ? platformRaw
    : platformRaw === null
      ? undefined
      : null;
  const platformVenueIdRaw = formData.get('platformVenueId');
  const platformVenueIdTrimmed =
    platformVenueIdRaw !== null ? String(platformVenueIdRaw).trim() : '';
  // A platform that takes no venue ID (detail-page, #1295) sends null: the
  // API rejects an ID paired with such a platform rather than dropping it.
  const platformVenueId =
    platform === undefined
      ? undefined
      : !platformRequiresVenueId(platform) || platformVenueIdTrimmed === ''
        ? null
        : platformVenueIdTrimmed;

  // API integration routing (#506/#505). A missing apiProvider key leaves
  // both fields untouched; an empty or whitespace-only value is None. When the
  // provider is null the account ID is forced to null so an orphaned ID can't
  // linger after the admin sets the provider back to None; the API's
  // superRefine independently rejects the inverse (provider set, account ID
  // missing).
  const apiProviderRaw = formData.get('apiProvider');
  const apiProvider =
    apiProviderRaw === null
      ? undefined
      : typeof apiProviderRaw === 'string' && apiProviderRaw.trim() !== ''
        ? apiProviderRaw.trim()
        : null;
  const apiAccountIdRaw = formData.get('apiAccountId');
  const apiAccountIdStr =
    typeof apiAccountIdRaw === 'string' ? apiAccountIdRaw.trim() : '';
  const apiAccountId =
    apiProvider === undefined
      ? undefined
      : apiProvider === null || apiAccountIdStr === ''
        ? null
        : apiAccountIdStr;

  return {
    name: ifPresent('name', String),
    slug: ifPresent('slug', String),
    websiteUrl: ifPresent('websiteUrl', (raw) => String(raw).trim()),
    city: ifPresent('city', (raw) => String(raw) || 'Denver'),
    // Absent means unchanged: the settings save never sends it.
    active: formData.has('active')
      ? formData.get('active') === 'true'
      : undefined,
    crawlWaitUntil,
    crawlWaitForSelector,
    ticketVendor,
    crawlMode,
    address,
    capacity,
    venueType,
    about,
    neighborhood,
    featured,
    priceUrl,
    extractionStrategy,
    debugCaptureHtml,
    platform,
    platformVenueId,
    apiProvider,
    apiAccountId,
  };
}
