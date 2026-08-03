import type { ShareRatio } from '@/components/consumer/share/definitions/ratios'
import type { PosterEvent } from '@/lib/share/poster-event'

/**
 * What the share sheet can actually do in a browser, and what it does when it
 * can't.
 *
 * Every function here is feature-detected and returns a result rather than
 * throwing. A share sheet that throws leaves a modal open over a page with no
 * explanation; a share sheet that returns `'unsupported'` can say so.
 *
 * The capability objects are passed in rather than read off `window` so each
 * branch is reachable from a test — a Safari-only fallback that has never been
 * executed is not a fallback, it is a guess.
 */

/** The slice of `navigator` the sheet touches. */
export interface ShareCapabilities {
  share?: (data: ShareData) => Promise<void>
  canShare?: (data: ShareData) => boolean
  clipboard?: { writeText: (text: string) => Promise<void> }
}

export type ShareOutcome =
  | 'shared'
  /** The user dismissed the OS sheet. Not an error — say nothing. */
  | 'cancelled'
  | 'unsupported'
  | 'failed'

export interface PosterUrlParams {
  eventId: string
  ratio: ShareRatio
  theme?: string | undefined
  /** The sharer's handle, or undefined for an anonymous poster. */
  by?: string | null | undefined
}

/** The PNG route. Also what the sheet's live preview points its `<img>` at. */
export const posterImageUrl = ({
  eventId,
  ratio,
  theme,
  by,
}: PosterUrlParams): string => {
  const query = new URLSearchParams()
  if (theme !== undefined) query.set('theme', theme)
  if (by !== undefined && by !== null && by !== '') query.set('by', by)
  const suffix = query.toString()
  return `/share/${eventId}/${ratio}${suffix === '' ? '' : `?${suffix}`}`
}

/**
 * The link the poster points at: the public mirror, never the (protected)
 * event page. A recipient with no account has to land somewhere that renders.
 */
export const publicEventUrl = (eventId: string, origin: string): string =>
  `${origin}/e/${eventId}`

/** `snakebite-revival-bluebird-theater.png` — recognisable in a camera roll. */
export const posterFileName = (event: PosterEvent): string => {
  const slug = `${event.artist}-${event.venue}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug === '' ? 'concert-crawl' : slug}.png`
}

/**
 * Enough to open the OS sheet at all. Correct for any share that can degrade
 * to a URL — see `systemShare`, which does exactly that.
 */
export const canSystemShare = (caps: ShareCapabilities): boolean =>
  typeof caps.share === 'function'

/**
 * Enough to hand the OS sheet a *file*.
 *
 * `navigator.share` existing says nothing about file support: desktop Safari
 * and several Android versions ship text/URL sharing and reject `files`
 * outright. A surface with a URL fallback can discover that at share time and
 * degrade, but one whose only payload is the image — the Passport, whose sole
 * URL sits behind the owner's session — would fail in the user's face instead.
 * Those surfaces gate the button on this.
 *
 * The probe is an empty PNG: `canShare` judges the type and count of files,
 * never their contents, so a truthful answer is available before the real
 * bytes have been fetched.
 */
export const canShareFiles = (caps: ShareCapabilities): boolean => {
  if (typeof caps.share !== 'function') return false
  if (typeof caps.canShare !== 'function') return false
  if (typeof File !== 'function') return false
  try {
    return caps.canShare({
      files: [new File([], 'probe.png', { type: 'image/png' })],
    })
  } catch (err) {
    // Feature detection must never be the thing that breaks the page.
    console.warn('[share] file-share probe threw', { err })
    return false
  }
}

/**
 * Hand the poster to the OS share sheet.
 *
 * Tries the PNG first and falls back to a URL-only share, because
 * `canShare({ files })` is false on every desktop browser and on Android below
 * a certain version — and a link is still a share. The image fetch is inside
 * the try for the same reason: an offline user gets the link, not an error.
 */
export const systemShare = async (
  caps: ShareCapabilities,
  args: {
    title: string
    url: string
    imageUrl: string
    fileName: string
    fetchImpl?: typeof fetch
  },
): Promise<ShareOutcome> => {
  const { share, canShare } = caps
  if (typeof share !== 'function') return 'unsupported'

  let files: File[] | undefined
  if (typeof canShare === 'function' && typeof File === 'function') {
    try {
      const fetcher = args.fetchImpl ?? fetch
      const response = await fetcher(args.imageUrl)
      if (response.ok) {
        const blob = await response.blob()
        const candidate = [
          new File([blob], args.fileName, { type: 'image/png' }),
        ]
        if (canShare({ files: candidate })) {
          files = candidate
        }
      }
    } catch (err) {
      // Fall through to the URL-only share — this is a degradation, not a bug.
      console.warn('[share] poster fetch failed, sharing link only', { err })
    }
  }

  try {
    // The link rides along even when the image does. A poster with no way back
    // to the show is a dead end, and that link is the entire reason the card
    // exists. It goes in `text` as well as `url` because several targets drop
    // `url` outright once `files` is present, and a pasted link in the caption
    // still works where a discarded one does not.
    await share(
      files === undefined
        ? { title: args.title, url: args.url }
        : {
            title: args.title,
            text: `${args.title}\n${args.url}`,
            url: args.url,
            files,
          },
    )
    return 'shared'
  } catch (err) {
    // The spec models a dismissed sheet as an AbortError rejection, so a
    // cancel is indistinguishable from a failure except by name.
    if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
    console.error('[share] system share failed', { err })
    return 'failed'
  }
}

/**
 * `navigator.clipboard` is undefined on insecure origins and older Safari, so
 * the guard is load-bearing rather than defensive.
 */
export const copyLink = async (
  caps: ShareCapabilities,
  url: string,
): Promise<ShareOutcome> => {
  const { clipboard } = caps
  if (clipboard === undefined) return 'unsupported'
  try {
    await clipboard.writeText(url)
    return 'shared'
  } catch (err) {
    console.error('[share] clipboard write failed', { err })
    return 'failed'
  }
}
