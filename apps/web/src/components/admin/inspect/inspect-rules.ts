import { z } from 'zod';
import { ApiError } from '@/lib/api';
import type { RunPage } from '@/components/admin/crawl-runs/run-data';
import { defaultInspectPage } from '@/components/admin/crawl-runs/runs-rules';

/**
 * Inspect's pure rules (3b part 5). Fetched venue HTML is untrusted: it is
 * never inserted as HTML in the app's document. The HTML tab shows it as
 * React text, the Text tab reads `textContent` from an inert DOMParser
 * document, and the Page tab hands it to a sandboxed `srcdoc` iframe under a
 * no-network CSP (ruling i).
 */

// ── Which page ───────────────────────────────────────────────

/**
 * The page `?page=` names when it is one of this run's, else the default
 * (row 30): the first that failed, else the first. Null with no pages.
 */
export const pickInspectPage = <T extends Pick<RunPage, 'id' | 'httpStatus'>>(
  pages: readonly T[],
  raw: unknown,
): T | null => {
  const named =
    typeof raw === 'string' ? pages.find((page) => page.id === raw) : undefined;
  return named ?? defaultInspectPage(pages);
};

/**
 * "Stopped here: page {n} never loaded" (row 27, without the in-HTML
 * highlight): the 1-based number of the first page after this one that
 * failed (4xx, 5xx) or has no status. Null when none did.
 */
export const stoppedHerePage = (
  pages: readonly Pick<RunPage, 'id' | 'httpStatus'>[],
  pageId: string,
): number | null => {
  const at = pages.findIndex((page) => page.id === pageId);
  if (at === -1) return null;
  const later = pages.findIndex(
    (page, index) =>
      index > at && (page.httpStatus === null || page.httpStatus >= 400),
  );
  return later === -1 ? null : later + 1;
};

// ── Tabs ─────────────────────────────────────────────────────

export const INSPECT_TABS = ['page', 'text', 'html'] as const;
export type InspectTab = (typeof INSPECT_TABS)[number];

/** A feed read (`fetch_mode = 'api'`): there is no page to draw (row 31). */
export const isFeedPage = (page: Pick<RunPage, 'fetchMode'>): boolean =>
  page.fetchMode === 'api';

/** The tabs a page offers: a feed has no Page tab. */
export const inspectTabs = (feed: boolean): readonly InspectTab[] =>
  feed ? ['text', 'html'] : INSPECT_TABS;

/** The tab Inspect opens on: Text for a feed, HTML otherwise (the board). */
export const defaultInspectTab = (feed: boolean): InspectTab =>
  feed ? 'text' : 'html';

// ── The Page tab ─────────────────────────────────────────────

/** Nothing runs and nothing loads from the venue; inline styles and data: images only. */
export const INSPECT_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:";

export const INSPECT_CSP_META = `<meta http-equiv="Content-Security-Policy" content="${INSPECT_CSP}">`;

/**
 * A leading doctype. The tokenizer ends a doctype at the first `>`, even
 * inside a quoted identifier, so `[^>]*` matches what the browser reads.
 */
const LEADING_DOCTYPE = /^﻿?\s*<!doctype[^>]*>/i;

/**
 * The `srcdoc` for the Page tab: the body with the CSP meta first. It goes
 * right after a leading doctype, else before everything. The HTML parser
 * then opens the head for it, so it is the head's first element whatever
 * follows, and a `<head>` hidden in a comment or a script can't pull it out
 * of the head (which would leave the page with no CSP).
 */
export const withCsp = (html: string): string => {
  const doctype = LEADING_DOCTYPE.exec(html);
  if (doctype === null) return `${INSPECT_CSP_META}${html}`;
  const end = doctype[0].length;
  return `${html.slice(0, end)}${INSPECT_CSP_META}${html.slice(end)}`;
};

// ── The Text tab ─────────────────────────────────────────────

/**
 * The page's text, tag-stripped. DOMParser builds an inert document: its
 * scripts never run and its images never load. Script, style and template
 * bodies are dropped first, so only what a reader sees is left. Each line's
 * whitespace collapses to single spaces and blank lines go.
 */
export const pageText = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc
    .querySelectorAll('script, style, noscript, template')
    .forEach((node) => node.remove());
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
