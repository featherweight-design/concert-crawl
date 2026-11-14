import type { FetchLog } from './fetch-log.js';
import type { Browser, CDPSession } from 'playwright';
import { errors as playwrightErrors } from 'playwright';
import { createLogger } from '@concert-crawl/logger';
import { CRAWLER_USER_AGENT } from '@concert-crawl/types';

import { jitter } from './fetchers/jitter.js';
import { CrawlSkipError, isAllowedOrSkip } from './robots.js';
import {
  RobotsDisallowedError,
  clearRedirect,
  fetchFollowingRobots,
} from './robots-fetch.js';

export { RobotsDisallowedError };

const logger = createLogger('fetcher');

// The origin of a frame's URL, for the log; never throws on an odd URL.
function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return 'unparseable';
  }
}

// A server redirect Playwright already followed: all we can still do is
// refuse to read a page whose chain passed through a disallowed URL.
async function assertVisitedAllowed(from: string, to: string): Promise<void> {
  if (!(await isAllowedOrSkip(to, CRAWLER_USER_AGENT))) {
    console.log(
      JSON.stringify({ event: 'fetch.redirect_disallowed', from, to }),
    );
    throw new RobotsDisallowedError(to, from);
  }
}

// goto()'s navigation budget, and how often the clock that enforces it with
// the gate's waits taken out checks the time.
const NAVIGATION_TIMEOUT_MS = 60_000;
const CLOCK_TICK_MS = 250;

// The fields of CDP's Fetch.requestPaused event the navigation gate reads.
interface PausedRequest {
  requestId: string;
  request: { url: string };
  frameId: string;
  networkId?: string;
  redirectedRequestId?: string;
}

function canonicalRequestUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';
  return parsed.href;
}

export class CrawlFetchError extends Error {
  constructor(
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = 'CrawlFetchError';
  }
}

// A selector timeout means the page loaded but never rendered what we expected.
// The HTML at that moment is the only evidence of why — a bot challenge, a geo
// redirect, a changed layout — and the throw would otherwise discard it.
export class CrawlSelectorTimeoutError extends Error {
  constructor(
    public readonly selector: string,
    public readonly html: string | null,
    public readonly finalUrl: string,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = 'CrawlSelectorTimeoutError';
  }
}

export interface FetchResult {
  html: string;
  httpStatus: number;
  finalUrl: string;
}

export async function fetchPage(
  url: string,
  browser: Browser,
  crawlDelayMs = 3000,
  waitUntil: 'networkidle' | 'load' | 'domcontentloaded' = 'networkidle',
  waitForSelector?: string,
  fetchLog?: FetchLog,
): Promise<FetchResult> {
  // jitter() floors every wait at 3 s, so there is always a wait to take.
  const delay = jitter(crawlDelayMs);
  await new Promise((resolve) => setTimeout(resolve, delay));

  const context = await browser.newContext({
    userAgent: CRAWLER_USER_AGENT,
  });
  // Set once the page has a log entry, so a failure that never got a response
  // (a navigation timeout, a reset connection) is recorded and one that did is not
  // recorded twice.
  let recorded = false;
  let cdp: CDPSession | undefined;
  try {
    const page = await context.newPage();

    console.log(JSON.stringify({ event: 'fetch.start', url }));

    // Two interceptors split the work. page.route (below) aborts every iframe
    // document and lets everything else through untouched. The main frame's
    // documents are gated in Chromium's own network stack instead, through a
    // CDP Fetch session paused at the Request stage, because that is the
    // only place a server redirect hop can be stopped BEFORE it is sent:
    // Chromium follows redirects inside goto() without re-entering
    // page.route, but it does pause each hop here (`redirectedRequestId`
    // set). A hop, or a navigation the page starts itself (a script or meta
    // refresh), clears robots.txt and waits its pacing, then Chromium sends
    // it with its own TLS and headers. A declined one is failed with
    // BlockedByClient and never requested.
    //
    // A disallow or a skip (robots.txt unreachable, Crawl-delay over the
    // cap) is kept and rethrown, so the run records it as such rather than
    // as a blocked-by-client failure. Only the first request for `url` is
    // goto()'s own, already paced above; a reload or refresh back to it later
    // goes through the gate too. `url` as the browser reports it:
    // `https://venue.example` comes back as `https://venue.example/`, and the
    // fragment is never sent. Chromium only: newCDPSession throws elsewhere.
    const startUrl = canonicalRequestUrl(url);
    let navigationError: Error | null = null;
    let initialRequestSeen = false;
    // Time spent clearing a hop (robots.txt and the pacing wait) is ours, not
    // the site's, so the navigation clock below stops while it runs. A count,
    // because a hop and a page-started navigation can be paused together.
    let gatesOpen = 0;
    let gatingSince = 0;
    let gatedMs = 0;
    const gateStarted = (): void => {
      if (gatesOpen++ === 0) gatingSince = Date.now();
    };
    const gateEnded = (): void => {
      if (--gatesOpen === 0) gatedMs += Date.now() - gatingSince;
    };

    cdp = await context.newCDPSession(page);
    const session = cdp;
    const { frameTree } = await session.send('Page.getFrameTree');
    const mainFrameId = frameTree.frame.id;
    // The URL each in-flight navigation last requested, so a redirect hop
    // knows where it came from.
    const lastHop = new Map<string, string>();

    // Whether a paused main-frame document may be sent. Throws on a disallow,
    // a skip, or anything unexpected; the caller fails the request.
    const mayContinue = async (event: PausedRequest): Promise<void> => {
      const { requestId, request } = event;
      // An iframe document is left to page.route, which aborts it. Gating it
      // here too would spend a robots lookup and a pacing wait on a request
      // that is about to be refused anyway.
      if (event.frameId !== mainFrameId) return;
      const hopKey = event.networkId ?? requestId;
      const from = lastHop.get(hopKey) ?? page.url();
      lastHop.set(hopKey, request.url);
      if (
        !initialRequestSeen &&
        event.redirectedRequestId === undefined &&
        request.url === startUrl
      ) {
        initialRequestSeen = true;
        return;
      }
      gateStarted();
      try {
        await clearRedirect(from, request.url, crawlDelayMs);
      } catch (err) {
        console.log(
          JSON.stringify({
            event: 'fetch.navigation_disallowed',
            url,
            from,
            to: request.url,
            redirect: event.redirectedRequestId !== undefined,
          }),
        );
        throw err;
      } finally {
        gateEnded();
      }
    };

    // Every paused request is answered, continued or failed, whatever
    // happens, so none is left to hang until the navigation times out.
    session.on('Fetch.requestPaused', (event) => {
      void (async () => {
        let allowed = false;
        try {
          await mayContinue(event);
          allowed = true;
        } catch (err) {
          navigationError ??=
            err instanceof Error ? err : new Error(String(err));
        }
        try {
          await (allowed
            ? session.send('Fetch.continueRequest', {
                requestId: event.requestId,
              })
            : session.send('Fetch.failRequest', {
                requestId: event.requestId,
                errorReason: 'BlockedByClient',
              }));
        } catch {
          // The page or context closed under the paused request: the
          // request died with it, so there is nothing left to answer.
        }
      })();
    });
    await session.send('Fetch.enable', {
      patterns: [
        { urlPattern: '*', resourceType: 'Document', requestStage: 'Request' },
      ],
    });

    await page.route('**/*', async (route) => {
      const request = route.request();
      if (!request.isNavigationRequest()) {
        await route.continue();
        return;
      }
      // An iframe's document (YouTube, a map, a ticket widget, an ad, a
      // reCAPTCHA) is never requested at all. Nothing in the crawl reads a
      // frame: extraction works on the main frame's page.content() alone.
      // So a frame would only be an unpaced request robots.txt never cleared,
      // and aborting it needs no robots lookup, no wait against goto()'s
      // 60 s timeout, and leaves no frame redirect for Chromium to follow.
      // A reader of frame content added later must gate frames instead.
      if (request.frame() !== page.mainFrame()) {
        logger.debug(
          { url, origin: originOf(request.url()) },
          'fetch.frame_aborted',
        );
        await route.abort('blockedbyclient');
        return;
      }
      // The main frame's documents are gated by the CDP session above.
      await route.continue();
    });
    const throwIfSkipped = (): void => {
      if (navigationError) throw navigationError;
    };

    // Every main-frame URL the page loaded, server redirect hops included
    // (Playwright emits a request for each). A navigation that cleared the
    // gate can still redirect somewhere disallowed, so the whole set is
    // checked before we read anything from the page.
    const visited = new Set<string>();
    page.on('request', (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame())
        visited.add(request.url());
    });
    const assertVisitsAllowed = async (extra: string[] = []): Promise<void> => {
      throwIfSkipped();
      for (const hop of new Set([...visited, ...extra, page.url()])) {
        if (hop !== startUrl) await assertVisitedAllowed(url, hop);
      }
    };

    let httpStatus = 200;
    page.on('response', (response) => {
      if (
        response.url() === page.url() ||
        response.request().isNavigationRequest()
      ) {
        httpStatus = response.status();
      }
    });

    // When a CSS selector is provided, use domcontentloaded for navigation
    // (fast connection) then let waitForSelector handle SPA render timing —
    // avoids networkidle/load timeouts on pages with persistent third-party requests.
    //
    // goto()'s own timeout would count the pacing waits between redirect
    // hops against the site, so it is off and this clock enforces the same
    // 60 s of navigation time with the gate's time taken out. It throws
    // Playwright's own TimeoutError, which crawl.ts classifies by name.
    let clockTimer: ReturnType<typeof setTimeout> | undefined;
    const navigationClock = new Promise<never>((_resolve, reject) => {
      const startedAt = Date.now();
      const tick = (): void => {
        const now = Date.now();
        const gating = gatesOpen > 0 ? now - gatingSince : 0;
        if (now - startedAt - gatedMs - gating >= NAVIGATION_TIMEOUT_MS) {
          reject(
            new playwrightErrors.TimeoutError(
              `page.goto: Timeout ${NAVIGATION_TIMEOUT_MS}ms exceeded (pacing waits excluded) navigating to "${url}"`,
            ),
          );
          return;
        }
        clockTimer = setTimeout(tick, CLOCK_TICK_MS);
      };
      clockTimer = setTimeout(tick, CLOCK_TICK_MS);
    });
    const response = await Promise.race([
      page.goto(url, {
        waitUntil: waitForSelector ? 'domcontentloaded' : waitUntil,
        timeout: 0,
      }),
      navigationClock,
    ])
      .catch((err: unknown) => {
        throwIfSkipped();
        throw err;
      })
      .finally(() => clearTimeout(clockTimer));

    const finalStatus = response?.status() ?? httpStatus;

    // Every hop of a server redirect, and where it landed, must be a URL
    // robots.txt lets us fetch. The gate above should already have refused a
    // disallowed hop before it was sent; this is the backstop, so a hop that
    // somehow got past it still means we discard the page unread.
    const hops: string[] = [];
    for (
      let request = response?.request().redirectedFrom() ?? null;
      request;
      request = request.redirectedFrom()
    ) {
      hops.push(request.url());
    }

    if (finalStatus === 403 || finalStatus === 429) {
      fetchLog?.record({ url, httpStatus: finalStatus, mode: 'browser' });
      recorded = true;
      console.log(
        JSON.stringify({ event: 'fetch.blocked', url, status: finalStatus }),
      );
      throw new CrawlFetchError(
        finalStatus,
        `HTTP ${finalStatus} — venue may have blocked crawler`,
      );
    }

    // After the block check: a 403/429 says the site blocked us, which must
    // mark the venue blocked whatever the redirect chain looked like.
    await assertVisitsAllowed([...hops, response?.url() ?? page.url()]);

    if (finalStatus >= 400) {
      fetchLog?.record({ url, httpStatus: finalStatus, mode: 'browser' });
      recorded = true;
      console.log(
        JSON.stringify({ event: 'fetch.error', url, status: finalStatus }),
      );
      throw new Error(`HTTP ${finalStatus}`);
    }

    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 30_000 });
      } catch (err) {
        throwIfSkipped();
        // Only a genuine timeout means "loaded but never rendered". Other
        // failures here (invalid selector syntax, a closed page) are real
        // errors and must not be reclassified — blockedAt keys off this class.
        if (!(err instanceof Error) || err.name !== 'TimeoutError') {
          console.log(
            JSON.stringify({
              event: 'fetch.selector_error',
              url,
              selector: waitForSelector,
              error: err instanceof Error ? err.message : String(err),
            }),
          );
          throw err;
        }

        // Reading content() can itself fail if the page died; a null html still
        // beats losing the whole error.
        await assertVisitsAllowed();
        const captured = await page.content().catch((contentErr: unknown) => {
          console.log(
            JSON.stringify({
              event: 'fetch.selector_timeout_capture_failed',
              url,
              error:
                contentErr instanceof Error
                  ? contentErr.message
                  : String(contentErr),
            }),
          );
          return null;
        });
        console.log(
          JSON.stringify({
            event: 'fetch.selector_timeout',
            url,
            selector: waitForSelector,
            finalUrl: page.url(),
            httpStatus: finalStatus,
            htmlChars: captured?.length ?? 0,
          }),
        );
        // crawl_runs.errorMessage persists String(err), so the selector and
        // final URL have to live in the message or triage means log-combing.
        throw new CrawlSelectorTimeoutError(
          waitForSelector,
          captured,
          page.url(),
          finalStatus,
          `${err.message} (selector "${waitForSelector}" at ${page.url()}, HTTP ${finalStatus})`,
        );
      }
    }

    await assertVisitsAllowed();
    const html = await page.content();
    const finalUrl = page.url();
    fetchLog?.record({
      url,
      finalUrl,
      httpStatus: finalStatus,
      mode: 'browser',
      body: html,
    });
    recorded = true;

    console.log(
      JSON.stringify({
        event: 'fetch.success',
        url,
        finalUrl,
        status: finalStatus,
      }),
    );
    return { html, httpStatus: finalStatus, finalUrl };
  } catch (err) {
    if (!recorded) {
      fetchLog?.record(
        err instanceof CrawlSelectorTimeoutError
          ? {
              url,
              finalUrl: err.finalUrl,
              httpStatus: err.httpStatus,
              mode: 'browser',
            }
          : { url, mode: 'browser' },
      );
    }
    throw err;
  } finally {
    // Detaching ends Fetch interception, so any request still paused is
    // released before the context goes; a session already gone is fine.
    await cdp?.detach().catch(() => undefined);
    await context.close();
  }
}

export async function fetchPageHttp(
  url: string,
  crawlDelayMs = 3000,
  fetchLog?: FetchLog,
): Promise<FetchResult> {
  // jitter() floors every wait at 3 s, so there is always a wait to take.
  const delay = jitter(crawlDelayMs);
  await new Promise((resolve) => setTimeout(resolve, delay));

  console.log(JSON.stringify({ event: 'fetch.start', url, mode: 'http' }));

  // Redirects are followed by hand so robots.txt and its pacing clear each
  // hop before we request it, rather than learning where we went afterwards.
  const { response, finalUrl } = await fetchFollowingRobots(url, {
    headers: { Accept: 'text/html,application/xhtml+xml' },
    crawlDelayMs,
  }).catch((err: unknown) => {
    // A redirect that robots.txt declined was never requested, so it is not a
    // failed page.
    if (
      !(err instanceof CrawlSkipError) &&
      !(err instanceof RobotsDisallowedError)
    ) {
      fetchLog?.record({ url, mode: 'http' });
    }
    throw err;
  });

  if (response.status === 403 || response.status === 429) {
    fetchLog?.record({
      url,
      finalUrl,
      httpStatus: response.status,
      mode: 'http',
    });
    console.log(
      JSON.stringify({ event: 'fetch.blocked', url, status: response.status }),
    );
    throw new CrawlFetchError(
      response.status,
      `HTTP ${response.status} — venue may have blocked crawler`,
    );
  }

  if (response.status >= 400) {
    fetchLog?.record({
      url,
      finalUrl,
      httpStatus: response.status,
      mode: 'http',
    });
    console.log(
      JSON.stringify({ event: 'fetch.error', url, status: response.status }),
    );
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  fetchLog?.record({
    url,
    finalUrl,
    httpStatus: response.status,
    mode: 'http',
    body: html,
  });

  console.log(
    JSON.stringify({
      event: 'fetch.success',
      url,
      finalUrl,
      status: response.status,
      mode: 'http',
    }),
  );
  return { html, httpStatus: response.status, finalUrl };
}
