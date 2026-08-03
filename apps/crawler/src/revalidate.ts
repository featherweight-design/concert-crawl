import { createLogger } from '@concert-crawl/logger'

const logger = createLogger('crawler')

// The landing page is the only ISR-cached surface today, and the only path the
// web endpoint accepts. Keep the two in sync if that ever grows.
const LANDING_PATH = '/'

const REQUEST_TIMEOUT_MS = 5000

/**
 * #847 — tell the web app to regenerate its ISR-cached landing page as soon as
 * a crawl run inserted new events, instead of waiting out the 5-minute
 * revalidation window. The window stays in place as the safety net: everything
 * here is a pure cache optimisation, so a failure only ever logs.
 *
 * Dormant until `REVALIDATE_SECRET` is set on both the crawler and the web
 * project — with no secret, this no-ops and the ISR window alone applies.
 *
 * Awaited (not detached) by callers for the same reason as the Spotify fan-out
 * (#649): the crawler hard-exits via `process.exit(0)`, which would sever a
 * floating promise. It never throws, so awaiting it cannot fail a crawl run.
 */
export async function requestLandingRevalidationSafely(
  eventsInserted: number,
): Promise<void> {
  try {
    if (eventsInserted <= 0) return

    const secret = process.env['REVALIDATE_SECRET']
    if (!secret) {
      logger.debug(
        'REVALIDATE_SECRET unset — skipping proactive revalidation (ISR window still applies)',
      )
      return
    }

    const baseUrl = process.env['ADMIN_URL']
    if (!baseUrl) {
      logger.warn(
        'ADMIN_URL unset — cannot reach the web revalidate endpoint (ISR window still applies)',
      )
      return
    }

    const response = await fetch(
      new URL('/api/revalidate', baseUrl).toString(),
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-revalidate-token': secret,
        },
        body: JSON.stringify({ path: LANDING_PATH }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    )

    if (!response.ok) {
      logger.warn(
        { status: response.status, eventsInserted },
        'Proactive revalidation rejected — falling back to the ISR window',
      )
      return
    }

    logger.info(
      { eventsInserted },
      'Requested proactive landing-page revalidation',
    )
  } catch (revalidateErr: unknown) {
    logger.error(
      { revalidateErr },
      'Proactive revalidation failed — falling back to the ISR window',
    )
  }
}
