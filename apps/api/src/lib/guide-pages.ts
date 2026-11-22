import { cleanHtml } from '@concert-crawl/crawler-core';
import {
  createDeadline,
  PlatformFetchDeadlineError,
} from '@concert-crawl/crawler-core/deadline';
import { jitter } from '@concert-crawl/crawler-core/jitter';
import {
  checkRobots,
  getCrawlDelayMs,
  resolveCrawlDelayMs,
} from '@concert-crawl/crawler-core/robots';
import {
  fetchFollowingRobots,
  raceSignal,
} from '@concert-crawl/crawler-core/robots-fetch';
import { CRAWLER_USER_AGENT } from '@concert-crawl/types';
import { apiLogger } from './logger.js';

// Admin 3e guide drafting (plan decision 11): the pages a first-timer guide is
// drafted from. Only the venue's own site, only what robots.txt allows, paced
// like the crawl: robots.txt first, then every request at least the resolved
// delay apart (never under 3 s, plus jitter), redirects cleared hop by hop.

/** The paths tried, in order: the FAQ, accessibility, info and policy pages. */
export const GUIDE_PAGE_PATHS = [
  '/faq',
  '/accessibility',
  '/info',
  '/policies',
] as const;

const PAGE_TIMEOUT_MS = 8_000;
const PAGE_MAX_REDIRECTS = 2;
/** The whole read, waits included; a breach skips the pages left. */
export const GUIDE_PAGES_BUDGET_MS = 150_000;
const PAGE_MAX_BYTES = 512 * 1024;
/** Text kept per page for the model. */
export const GUIDE_PAGE_MAX_CHARS = 12_000;
/** Less text than this is a page with nothing on it. */
const PAGE_MIN_CHARS = 120;

const LINK_MARKER = /\s*\[link: \S+\]\s*/g;

export type GuidePageStatus =
  'read' | 'notFound' | 'disallowed' | 'offSite' | 'unreachable' | 'skipped';

export interface GuidePageAttempt {
  url: string;
  status: GuidePageStatus;
}

export interface GuidePage {
  /** The URL the text came from, after any redirect on the venue's site. */
  url: string;
  text: string;
  /** The page's Last-Modified header, when it sent one. */
  lastModified: string | null;
}

export interface GuidePagesResult {
  attempts: GuidePageAttempt[];
  pages: GuidePage[];
}

/** www.example.com and example.com are the same site. */
const siteHost = (url: URL): string => url.hostname.replace(/^www\./i, '');

class OffSiteRedirectError extends Error {}

type PageFetch =
  | { ok: false; status: number }
  | { ok: true; finalUrl: string; html: string; lastModified: string | null };

/** An HTML page, or one that doesn't say: a PDF or an image is not a guide page. */
const isHtml = (contentType: string | null): boolean =>
  contentType === null ||
  /^\s*(text\/html|application\/xhtml\+xml)\b/i.test(contentType);

/**
 * The body's first `PAGE_MAX_BYTES`, read from the stream and then cancelled,
 * so a huge page is never downloaded whole.
 */
const readCapped = async (response: Response): Promise<string> => {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < PAGE_MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch((err: unknown) => {
    apiLogger.debug({ err }, 'guide-pages: body cancel failed');
  });
  const bytes = new Uint8Array(Math.min(size, PAGE_MAX_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, bytes.length - offset);
    bytes.set(part, offset);
    offset += part.byteLength;
    if (offset >= bytes.length) break;
  }
  return new TextDecoder().decode(bytes);
};

/** A status that says the site wants no more requests from us right now. */
const isBackOff = (status: number): boolean => status === 403 || status === 429;

/**
 * Reads the guide pages on `websiteUrl`'s site, one at a time. Every path is
 * reported, read or not, so the admin sees what was tried ("/info:
 * Disallowed by robots.txt"). Never throws: a failure is that page's status.
 */
export async function readGuidePages(
  websiteUrl: string,
  venueCrawlDelayMs: number,
): Promise<GuidePagesResult> {
  const origin = new URL(websiteUrl);
  const host = siteHost(origin);
  const urls = GUIDE_PAGE_PATHS.map((path) => new URL(path, origin).href);
  const attempts: GuidePageAttempt[] = urls.map((url) => ({
    url,
    status: 'skipped',
  }));
  const pages: GuidePage[] = [];

  const deadline = createDeadline({
    perRequestTimeoutMs: PAGE_TIMEOUT_MS,
    overallTimeoutMs: GUIDE_PAGES_BUDGET_MS,
  });

  let delayMs: number | null;
  try {
    const robotsDelayMs = await deadline.run(
      'robots.txt crawl-delay',
      (_timeoutMs, budget) =>
        raceSignal(
          getCrawlDelayMs(websiteUrl, CRAWLER_USER_AGENT),
          budget?.signal,
        ),
    );
    delayMs = resolveCrawlDelayMs(venueCrawlDelayMs, robotsDelayMs, {
      url: websiteUrl,
    });
  } catch (err) {
    apiLogger.warn({ err, websiteUrl }, 'guide-pages: robots.txt failed');
    for (const attempt of attempts) attempt.status = 'unreachable';
    return { attempts, pages };
  }
  // A Crawl-delay over the cap: the crawl skips this site, so do we.
  if (delayMs === null) return { attempts, pages };

  for (const attempt of attempts) {
    try {
      const robots = await deadline.run('robots.txt', (_timeoutMs, budget) =>
        raceSignal(
          checkRobots(attempt.url, CRAWLER_USER_AGENT),
          budget?.signal,
        ),
      );
      if (robots.status === 'disallowed') {
        attempt.status = 'disallowed';
        continue;
      }
      if (robots.status === 'unreachable') {
        attempt.status = 'unreachable';
        continue;
      }

      await deadline.wait(jitter(delayMs));
      const pageDelayMs = delayMs;
      const fetched = await deadline.run(
        attempt.url,
        async (timeoutMs, budget): Promise<PageFetch> => {
          const { response, finalUrl } = await fetchFollowingRobots(
            attempt.url,
            {
              crawlDelayMs: pageDelayMs,
              maxRedirects: PAGE_MAX_REDIRECTS,
              onRedirect: (_from, to) => {
                if (siteHost(new URL(to)) !== host) {
                  throw new OffSiteRedirectError(to);
                }
              },
              ...(timeoutMs !== undefined ? { timeoutMs } : {}),
              ...(budget !== undefined ? { budget } : {}),
            },
          );
          if (!response.ok || !isHtml(response.headers.get('content-type'))) {
            await response.body?.cancel().catch((err: unknown) => {
              apiLogger.debug({ err }, 'guide-pages: body cancel failed');
            });
            return { ok: false, status: response.status };
          }
          return {
            ok: true,
            finalUrl,
            html: await readCapped(response),
            lastModified: response.headers.get('last-modified'),
          };
        },
      );

      if (!fetched.ok) {
        if (isBackOff(fetched.status)) {
          // The site asked us to stop: the pages left stay skipped.
          attempt.status = 'unreachable';
          break;
        }
        attempt.status = 'notFound';
        continue;
      }
      // Two paths that land on one page are one source.
      if (pages.some((page) => page.url === fetched.finalUrl)) {
        attempt.status = 'read';
        continue;
      }
      const text = cleanHtml(fetched.html, fetched.finalUrl)
        .text.replace(LINK_MARKER, ' ')
        .trim()
        .slice(0, GUIDE_PAGE_MAX_CHARS);
      if (text.length < PAGE_MIN_CHARS) {
        attempt.status = 'notFound';
        continue;
      }
      attempt.status = 'read';
      pages.push({
        url: fetched.finalUrl,
        text,
        lastModified: fetched.lastModified,
      });
    } catch (err) {
      if (err instanceof OffSiteRedirectError) {
        attempt.status = 'offSite';
        continue;
      }
      if (err instanceof PlatformFetchDeadlineError) {
        // Out of budget: this page and the rest stay skipped.
        break;
      }
      apiLogger.warn({ err, url: attempt.url }, 'guide-pages: fetch failed');
      attempt.status = 'unreachable';
    }
  }

  return { attempts, pages };
}
