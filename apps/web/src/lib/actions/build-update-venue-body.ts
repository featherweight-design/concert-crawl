import { isVenuePlatform, platformRequiresVenueId } from '@concert-crawl/types'
import type { VenuePlatform } from '@concert-crawl/types'

// Narrow a raw string to one of a fixed set of literals without an `as` cast.
// `find` compares by value and returns the matched literal (typed as the union
// member) or undefined, so TypeScript infers the union without an assertion.
function matchLiteral<T extends string>(
  value: string,
  allowed: readonly T[],
): T | undefined {
  return allowed.find((option) => option === value)
}

// Assemble the PATCH body from the edit-venue FormData. Lives outside the
// 'use server' action module so (a) Next.js doesn't reject it for being a
// synchronous export from a server-action file, and (b) the FormData→JSON
// normalization (notably the paired apiProvider/apiAccountId fields) stays
// unit-testable without pulling in the Next.js server runtime.
export function buildUpdateVenueBody(
  formData: FormData,
): Record<string, unknown> {
  const crawlDelayRaw = formData.get('crawlDelayMs')
  const crawlDelayNum = crawlDelayRaw
    ? Number(String(crawlDelayRaw))
    : undefined
  const crawlDelayMs =
    crawlDelayNum !== undefined &&
    Number.isFinite(crawlDelayNum) &&
    Number.isInteger(crawlDelayNum)
      ? crawlDelayNum
      : undefined

  const crawlWaitUntilRaw = String(formData.get('crawlWaitUntil') ?? '')
  const VALID_WAIT_UNTIL = ['networkidle', 'load', 'domcontentloaded'] as const
  const crawlWaitUntil = matchLiteral(crawlWaitUntilRaw, VALID_WAIT_UNTIL)

  // The browser-gate fields (crawl mode, selector, platform, API provider)
  // leave the body when their keys are absent, so a save that does not touch
  // them skips the API's browser-mode selector guard.
  const crawlWaitForSelectorRaw = formData.get('crawlWaitForSelector')
  const crawlWaitForSelector =
    crawlWaitForSelectorRaw === null
      ? undefined
      : String(crawlWaitForSelectorRaw).trim() === ''
        ? null
        : String(crawlWaitForSelectorRaw).trim()

  const ticketVendorRaw = formData.get('ticketVendor')
  const ticketVendor =
    ticketVendorRaw === null || String(ticketVendorRaw).trim() === ''
      ? null
      : String(ticketVendorRaw).trim()

  const crawlModeRaw = formData.get('crawlMode')
  const crawlMode =
    crawlModeRaw === 'http' || crawlModeRaw === 'browser'
      ? crawlModeRaw
      : crawlModeRaw === ''
        ? null
        : undefined

  const extractionStrategyRaw = String(formData.get('extractionStrategy') ?? '')
  const VALID_EXTRACTION_STRATEGIES = [
    'structured_data',
    'llm',
    'manual',
  ] as const
  const extractionStrategy =
    matchLiteral(extractionStrategyRaw, VALID_EXTRACTION_STRATEGIES) ??
    (extractionStrategyRaw === '' ? null : undefined)

  const addressRaw = formData.get('address')
  const address =
    addressRaw !== null && String(addressRaw).trim()
      ? String(addressRaw).trim()
      : null

  const capacityRaw = formData.get('capacity')
  const capacityTrimmed = capacityRaw !== null ? String(capacityRaw).trim() : ''
  let capacity: number | null | undefined
  if (capacityTrimmed === '') {
    capacity = null
  } else {
    const num = Number(capacityTrimmed)
    capacity =
      Number.isFinite(num) && Number.isInteger(num) && num > 0 ? num : undefined
  }

  const venueTypeRaw = formData.get('venueType')
  const venueType =
    venueTypeRaw !== null && String(venueTypeRaw).trim()
      ? String(venueTypeRaw).trim()
      : null

  const aboutRaw = formData.get('about')
  const about =
    aboutRaw !== null && String(aboutRaw).trim()
      ? String(aboutRaw).trim()
      : null

  const neighborhoodRaw = formData.get('neighborhood')
  const neighborhood =
    neighborhoodRaw !== null && String(neighborhoodRaw).trim()
      ? String(neighborhoodRaw).trim()
      : null

  const featuredRaw = formData.get('featured')
  const featured = featuredRaw !== null ? featuredRaw === 'true' : undefined

  const priceUrlRaw = formData.get('priceUrl')
  const priceUrl =
    priceUrlRaw !== null && String(priceUrlRaw).trim()
      ? String(priceUrlRaw).trim()
      : null

  const debugCaptureHtmlRaw = formData.get('debugCaptureHtml')
  const debugCaptureHtml =
    debugCaptureHtmlRaw !== null ? debugCaptureHtmlRaw === 'true' : undefined

  // Platform routing (#721/#665). Empty string means "Auto (no platform)".
  // When platform is null the API force-clears platformVenueId anyway, but
  // send null explicitly so the payload states the full intent.
  const platformRaw = formData.get('platform')
  const platform: VenuePlatform | null | undefined = isVenuePlatform(
    platformRaw,
  )
    ? platformRaw
    : platformRaw === null
      ? undefined
      : null
  const platformVenueIdRaw = formData.get('platformVenueId')
  const platformVenueIdTrimmed =
    platformVenueIdRaw !== null ? String(platformVenueIdRaw).trim() : ''
  // A platform that takes no venue ID (detail-page, #1295) sends null: the
  // API rejects an ID paired with such a platform rather than dropping it.
  const platformVenueId =
    platform === undefined
      ? undefined
      : !platformRequiresVenueId(platform) || platformVenueIdTrimmed === ''
        ? null
        : platformVenueIdTrimmed

  // API integration routing (#506/#505). A missing apiProvider key leaves
  // both fields untouched; an empty or whitespace-only value is None. When the
  // provider is null the account ID is forced to null so an orphaned ID can't
  // linger after the admin sets the provider back to None; the API's
  // superRefine independently rejects the inverse (provider set, account ID
  // missing).
  const apiProviderRaw = formData.get('apiProvider')
  const apiProvider =
    apiProviderRaw === null
      ? undefined
      : typeof apiProviderRaw === 'string' && apiProviderRaw.trim() !== ''
        ? apiProviderRaw.trim()
        : null
  const apiAccountIdRaw = formData.get('apiAccountId')
  const apiAccountIdStr =
    typeof apiAccountIdRaw === 'string' ? apiAccountIdRaw.trim() : ''
  const apiAccountId =
    apiProvider === undefined
      ? undefined
      : apiProvider === null || apiAccountIdStr === ''
        ? null
        : apiAccountIdStr

  return {
    name: formData.get('name'),
    slug: formData.get('slug'),
    websiteUrl: formData.get('websiteUrl'),
    city: formData.get('city') || 'Denver',
    // Absent means unchanged: the settings save never sends it.
    active: formData.has('active')
      ? formData.get('active') === 'true'
      : undefined,
    crawlWaitUntil,
    crawlDelayMs,
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
  }
}
