import { z } from 'zod';
import { ApiError } from '@/lib/api';
import type { RunPage } from '@/components/admin/crawl-runs/run-data';
import {
  defaultInspectPage,
  isFailedPage,
} from '@/components/admin/crawl-runs/runs-rules';

/**
 * Inspect's pure rules (3b part 5). Fetched venue HTML is untrusted: it is
 * never inserted as HTML in the app's document. The HTML tab shows it as
 * React text and the Text tab reads `textContent` from an inert DOMParser
 * document.
 */

// ── Which page ───────────────────────────────────────────────

/**
 * The page Inspect shows: the one `?page=` names when it is this run's, else
 * the one fetched from `?url=` (Compare keeps the page across runs: its
 * `url`, then its `finalUrl`), else the default (row 30): the first that
 * failed, else the first. Null with no pages.
 */
export const pickInspectPage = <
  T extends Pick<RunPage, 'id' | 'url' | 'finalUrl' | 'httpStatus'>,
>(
  pages: readonly T[],
  rawPage: unknown,
  rawUrl?: unknown,
): T | null => {
  const named =
    typeof rawPage === 'string'
      ? pages.find((page) => page.id === rawPage)
      : undefined;
  if (named !== undefined) return named;
  if (typeof rawUrl === 'string' && rawUrl !== '') {
    const same =
      pages.find((page) => page.url === rawUrl) ??
      pages.find((page) => page.finalUrl === rawUrl);
    if (same !== undefined) return same;
  }
  return defaultInspectPage(pages);
};

/**
 * "Stopped here: page {n} never loaded" (row 27, without the in-HTML
 * highlight): the 1-based number of the first page after this one that
 * failed, by the run detail's one rule (`isFailedPage`: 4xx or 5xx; a page
 * with no status is not a failure). Null when none did.
 */
export const stoppedHerePage = (
  pages: readonly Pick<RunPage, 'id' | 'httpStatus'>[],
  pageId: string,
): number | null => {
  const at = pages.findIndex((page) => page.id === pageId);
  if (at === -1) return null;
  const later = pages.findIndex(
    (page, index) => index > at && isFailedPage(page),
  );
  return later === -1 ? null : later + 1;
};

// ── Tabs ─────────────────────────────────────────────────────

// The Page tab (the sandboxed srcdoc iframe) joins these in 3b part 5b.
export const INSPECT_TABS = ['text', 'html'] as const;
export type InspectTab = (typeof INSPECT_TABS)[number];

/** A feed read (`fetch_mode = 'api'`): there is no page to draw (row 31). */
export const isFeedPage = (page: Pick<RunPage, 'fetchMode'>): boolean =>
  page.fetchMode === 'api';

/** The tab Inspect opens on: Text for a feed, HTML otherwise (the board). */
export const defaultInspectTab = (feed: boolean): InspectTab =>
  feed ? 'text' : 'html';

// ── The Text tab ─────────────────────────────────────────────

/** Elements that end a line where a reader sees them, plus `<br>`. */
const LINE_ENDS =
  'address, article, aside, blockquote, br, dd, div, dl, dt, fieldset, ' +
  'figcaption, figure, footer, form, h1, h2, h3, h4, h5, h6, header, hr, ' +
  'li, main, nav, ol, p, pre, section, table, tr, td, th, ul';

/**
 * The page's text, tag-stripped. DOMParser builds an inert document: its
 * scripts never run and its images never load. Script, style and template
 * bodies are dropped first, so only what a reader sees is left, and a line
 * break follows each block element and `<br>` (in the inert document only),
 * so `<div>A</div><div>B</div>` reads as two lines. Each line's whitespace
 * collapses to single spaces and blank lines go.
 */
export const pageText = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc
    .querySelectorAll('script, style, noscript, template')
    .forEach((node) => node.remove());
  doc
    .querySelectorAll(LINE_ENDS)
    .forEach((node) => node.after(doc.createTextNode('\n')));
  return (doc.body.textContent ?? '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line !== '')
    .join('\n');
};

// ── The body ─────────────────────────────────────────────────

/** `GET /v1/admin/crawl/pages/:id/body`: only the HTML is read. */
const bodySchema = z.object({ html: z.string() });

/** The body's HTML, or null when the answer isn't one. */
export const parseBody = (raw: unknown): string | null => {
  const parsed = bodySchema.safeParse(raw);
  return parsed.success ? parsed.data.html : null;
};

export const GONE_REASONS = ['expired', 'too_large', 'not_stored'] as const;
export type GoneReason = (typeof GONE_REASONS)[number];

/**
 * Why the body isn't there, from the endpoint's 404 `reason`. Null for
 * anything else (a 500, the network, a 404 for a page that doesn't exist or
 * with a reason this build doesn't know): that is Couldn't load.
 */
export const goneReason = (err: unknown): GoneReason | null => {
  if (!(err instanceof ApiError) || err.status !== 404) return null;
  const parsed = z.enum(GONE_REASONS).safeParse(err.reason);
  return parsed.success ? parsed.data : null;
};
