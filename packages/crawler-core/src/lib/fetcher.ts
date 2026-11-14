import type { FetchLog } from './fetch-log.js';
import type { Browser } from 'playwright';
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
// How many navigations a page may start itself (script or meta refresh)
// that one fetch follows, and the wall time, gate waits included, that
// fetchPage spends waiting for them to land before it reads the page. A
// page that keeps reloading itself is read where it stands after either.
const MAX_PAGE_NAVIGATIONS = 3;
const SETTLE_CAP_MS = 20_000;

// A page-started navigation refused because the fetch already followed as
// many as it will. Never thrown out of fetchPage: the page is read instead.
class NavigationCapError extends Error {
  constructor(to: string) {
    super(`page-started navigation cap reached; not following ${to}`);
    this.name = 'NavigationCapError';
  }
}

// `url` without its fragment, which is never sent: how CDP reports a
// request's URL. page.url() keeps the fragment. Never throws.
function withoutFragment(url: string): string {
  try {
    return canonicalRequestUrl(url);
  } catch {
    return url;
  }
}

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
  // Set before the context closes: from then on the gate fails every paused
  // request it is still deciding, so teardown never lets one through.
  let closing = false;
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
    // A skip (robots.txt unreachable, Crawl-delay over the cap) is always
    // kept and rethrown, so the run records a skip rather than a failure. A
    // disallow is rethrown only when it stopped goto()'s own chain (its first
    // request and that request's server redirect hops): then there is no page
    // we may read. Any other main-frame navigation, one the page starts
    // itself with a script or meta refresh, during goto() or after, is
    // refused with Aborted and logged, and the page already loaded is read.
    // Only the first request for `url` is goto()'s own, already paced above;
    // a reload or refresh back to it later goes through the gate too. `url`
    // as the browser reports it: `https://venue.example` comes back as
    // `https://venue.example/`, and the fragment is never sent. Chromium
    // only: newCDPSession throws elsewhere.
    const startUrl = canonicalRequestUrl(url);
    let navigationError: Error | null = null;
    let initialRequestSeen = false;
    // goto()'s own chain: the Fetch request ids and network id of its first
    // request and every redirect hop after it.
    const gotoChain = new Set<string>();
    // Page-started navigations the gate has taken on, against
    // MAX_PAGE_NAVIGATIONS; and whether the settle step's wall-clock cap has
    // passed. Either one refuses every further page-started navigation, so
    // a page that keeps reloading itself is read where it stands.
    let pageNavigations = 0;
    let navigationCapped = false;
    // Every main-frame URL the gate decided. Each was either cleared by
    // robots.txt or refused before it was sent, so the after-the-fact check
    // below need not (and, for a refused one, must not) judge it again.
    const gated = new Set<string>();
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
    // The site's share of the 60 s navigation budget still unspent: wall
    // time since goto() began, less the gate's time. Infinite before goto().
    let navigationStartedAt: number | null = null;
    const siteMsLeft = (): number => {
      if (navigationStartedAt === null) return NAVIGATION_TIMEOUT_MS;
      const now = Date.now();
      const gating = gatesOpen > 0 ? now - gatingSince : 0;
      return (
        NAVIGATION_TIMEOUT_MS - (now - navigationStartedAt - gatedMs - gating)
      );
    };

    // Gates still deciding, and navigations a gate let through after goto()
    // settled that have not committed yet. Read before content(), so a
    // navigation the page starts is read where it lands, as Chromium would
    // have done unpaced, rather than mid-flight.
    const pendingGates = new Set<Promise<void>>();
    const pendingCommits = new Set<Promise<void>>();
    const track = (set: Set<Promise<void>>, task: Promise<void>): void => {
      set.add(task);
      void task.finally(() => set.delete(task));
    };

    // Never detached by hand: detaching a Fetch session lets any request it
    // still holds paused go out unchanged. Closing the context ends it and
    // cancels those requests instead.
    const session = await context.newCDPSession(page);
    const { frameTree } = await session.send('Page.getFrameTree');
    const mainFrameId = frameTree.frame.id;
    // A followed navigation's wait to land, keyed by its chain (network id).
    // Resolved at the main frame's next DOMContentLoaded, heard on this same
    // session so it is ordered after the paused request that registered it
    // and never mistaken for an earlier page's (Playwright's own events, on
    // another session, can arrive late enough to be). A navigation that
    // never commits must not hold the read for the whole settle budget, so
    // it is also resolved when the gate refuses a later hop of the same
    // chain, when one of its requests fails, and when the main frame stops
    // loading (a 204, a download).
    const commitWaiters = new Map<string, () => void>();
    const landed = (key?: string): void => {
      if (key === undefined) {
        for (const resolve of commitWaiters.values()) resolve();
        commitWaiters.clear();
        return;
      }
      commitWaiters.get(key)?.();
      commitWaiters.delete(key);
    };
    session.on('Page.domContentEventFired', () => landed());
    session.on('Page.frameStoppedLoading', (event) => {
      if (event.frameId === mainFrameId) landed();
    });
    session.on('Network.loadingFailed', (event) => {
      if (event.type === 'Document') landed(event.requestId);
    });
    await session.send('Page.enable');
    await session.send('Network.enable');
    // The URL each in-flight navigation last requested, so a redirect hop
    // knows where it came from.
    const lastHop = new Map<string, string>();

    // Whether a paused main-frame document belongs to goto()'s own chain,
    // recording it if so. Called synchronously as each request pauses, so
    // a hop is classified before the next one can arrive.
    const joinsGotoChain = (event: PausedRequest): boolean => {
      const { requestId, request } = event;
      const isFirst =
        !initialRequestSeen &&
        event.redirectedRequestId === undefined &&
        request.url === startUrl;
      const isHop =
        (event.networkId !== undefined && gotoChain.has(event.networkId)) ||
        (event.redirectedRequestId !== undefined &&
          gotoChain.has(event.redirectedRequestId));
      if (!isFirst && !isHop) return false;
      gotoChain.add(requestId);
      if (event.networkId !== undefined) gotoChain.add(event.networkId);
      return true;
    };

    // Whether a paused main-frame document may be sent. Throws on a disallow,
    // a skip, a page-started navigation past the cap, or anything
    // unexpected; the caller fails the request. Resolves true when it
    // cleared a navigation through the gate, false when it let one pass
    // without gating.
    const mayContinue = async (
      event: PausedRequest,
      inGotoChain: boolean,
    ): Promise<boolean> => {
      const { requestId, request } = event;
      const hopKey = event.networkId ?? requestId;
      const from = lastHop.get(hopKey) ?? page.url();
      lastHop.set(hopKey, request.url);
      if (
        inGotoChain &&
        !initialRequestSeen &&
        event.redirectedRequestId === undefined
      ) {
        initialRequestSeen = true;
        return false;
      }
      gated.add(withoutFragment(request.url));
      if (!inGotoChain) {
        if (navigationCapped || pageNavigations >= MAX_PAGE_NAVIGATIONS) {
          throw new NavigationCapError(request.url);
        }
        pageNavigations += 1;
      }
      gateStarted();
      try {
        await clearRedirect(from, request.url, crawlDelayMs);
        return true;
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
    // happens, so none is left to hang until the navigation times out. Once
    // teardown has started nothing is continued: a decision that lands then
    // is too late to pace or check against anything we will read.
    session.on('Fetch.requestPaused', (event) => {
      // An iframe document is left to page.route, which aborts it. Gating it
      // here too would spend a robots lookup and a pacing wait on a request
      // that is about to be refused anyway.
      const isMainFrame = event.frameId === mainFrameId;
      const inGotoChain = isMainFrame && joinsGotoChain(event);
      const answer = async (): Promise<void> => {
        let allowed = false;
        let cleared = false;
        // BlockedByClient makes Chromium commit its error page in place of
        // the document, which is fine when we throw anyway. A refused
        // navigation we carry on past is Aborted instead: Chromium then
        // keeps the page already loaded (checked in a local Chromium probe).
        let errorReason: 'BlockedByClient' | 'Aborted' = 'BlockedByClient';
        try {
          if (isMainFrame) cleared = await mayContinue(event, inGotoChain);
          allowed = true;
        } catch (err) {
          if (err instanceof CrawlSkipError || inGotoChain) {
            navigationError ??=
              err instanceof Error ? err : new Error(String(err));
          } else {
            errorReason = 'Aborted';
            const capped = err instanceof NavigationCapError;
            console.log(
              JSON.stringify({
                event: capped
                  ? 'fetch.navigation_cap'
                  : 'fetch.navigation_blocked',
                url,
                to: event.request.url,
                ...(capped
                  ? { followed: pageNavigations }
                  : {
                      error: err instanceof Error ? err.message : String(err),
                    }),
              }),
            );
          }
        }
        // The settle step's cap can pass while a page-started navigation
        // waits its pacing: it is refused like any later one.
        if (allowed && cleared && !inGotoChain && navigationCapped) {
          allowed = false;
          errorReason = 'Aborted';
          console.log(
            JSON.stringify({
              event: 'fetch.navigation_cap',
              url,
              to: event.request.url,
              followed: pageNavigations,
            }),
          );
        }
        if (closing) allowed = false;
        // A navigation the page started, let through (during goto() or
        // after: goto() may settle on the page it replaces): listen for it
        // to commit before Chromium can send it, so the read below waits for
        // the page it lands on.
        if (allowed && cleared && !inGotoChain) {
          const key = event.networkId ?? event.requestId;
          // A later hop of a chain already waited for keeps that one wait.
          if (!commitWaiters.has(key)) {
            track(
              pendingCommits,
              new Promise<void>((resolve) => {
                commitWaiters.set(key, resolve);
              }),
            );
          }
        }
        // Refused, this navigation will never land: stop waiting for it.
        if (!allowed) landed(event.networkId ?? event.requestId);
        try {
          await (allowed
            ? session.send('Fetch.continueRequest', {
                requestId: event.requestId,
              })
            : session.send('Fetch.failRequest', {
                requestId: event.requestId,
                errorReason,
              }));
        } catch {
          // The page or context closed under the paused request: the
          // request died with it, so there is nothing left to answer.
        }
      };
      const task = answer();
      if (isMainFrame) track(pendingGates, task);
    });

    // Resolves after `ms`, or when `task` does, whichever is first.
    const within = async (
      task: Promise<unknown>,
      ms: number,
    ): Promise<void> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        task,
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, Math.max(ms, 0));
        }),
      ]);
      clearTimeout(timer);
    };

    // Before reading the page: let every gate still deciding finish, and
    // every navigation one let through commit and reach domcontentloaded, so
    // content() reads where the page landed. A refused navigation was
    // Aborted and leaves the page loaded as it was. Bounded by what is left
    // of the site's 60 s, which the gate's own waits do not spend, and by
    // SETTLE_CAP_MS of wall time, which they do. Past that cap every further
    // page-started navigation is refused and the page is read as it stands;
    // MAX_PAGE_NAVIGATIONS bounds the number followed the same way.
    // One wall-clock budget for the whole fetch, however many times it settles.
    let settleDeadline: number | null = null;
    const settleNavigations = async (): Promise<void> => {
      settleDeadline ??= Date.now() + SETTLE_CAP_MS;
      const deadline = settleDeadline;
      const msLeft = (): number =>
        Math.min(siteMsLeft(), deadline - Date.now());
      while (msLeft() > 0) {
        if (pendingGates.size > 0) {
          await within(Promise.allSettled([...pendingGates]), msLeft());
        } else if (pendingCommits.size > 0) {
          await within(Promise.allSettled([...pendingCommits]), msLeft());
          await page
            .waitForLoadState('domcontentloaded', {
              timeout: Math.max(msLeft(), 1),
            })
            .catch(() => undefined);
        } else {
          return;
        }
      }
      // Out of time: nothing the page starts from here on is followed, and
      // one still waiting its pacing is refused when it finishes.
      navigationCapped = true;
    };

    // content() waits out a navigation the gate is holding, then throws once
    // it commits. That happens to a navigation that paused after
    // settleNavigations returned: a meta refresh 0 fires the moment the page
    // it waited for loads. So settle again, wait for the load, and retry.
    // Every retry follows a navigation that counted against the cap, and
    // past the cap they are refused, so this runs at most
    // MAX_PAGE_NAVIGATIONS + 1 more times.
    const readContent = async (): Promise<string> => {
      for (let attempt = 0; ; attempt++) {
        try {
          return await page.content();
        } catch (err) {
          if (
            !(err instanceof Error) ||
            !err.message.includes('is navigating') ||
            attempt > MAX_PAGE_NAVIGATIONS
          ) {
            throw err;
          }
          await settleNavigations();
          await page
            .waitForLoadState('domcontentloaded', {
              timeout: Math.max(siteMsLeft(), 1),
            })
            .catch(() => undefined);
        }
      }
    };
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
      // Compared without fragments: CDP reports none, page.url() keeps one.
      const hops = new Set(
        [...visited, ...extra, page.url()].map(withoutFragment),
      );
      for (const hop of hops) {
        if (hop !== startUrl && !gated.has(hop))
          await assertVisitedAllowed(url, hop);
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
      navigationStartedAt = Date.now();
      const tick = (): void => {
        if (siteMsLeft() <= 0) {
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
        await settleNavigations();
        await assertVisitsAllowed();
        const captured = await readContent().catch((contentErr: unknown) => {
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

    await settleNavigations();
    await assertVisitsAllowed();
    const html = await readContent();
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
    // Closing the context cancels any request the gate still holds paused,
    // and ends the CDP session with it. The flag covers a gate that decides
    // in between: it fails its request rather than continue it.
    closing = true;
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
