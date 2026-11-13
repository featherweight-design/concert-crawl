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
 * React text, the Text tab reads `textContent` from an inert DOMParser
 * document, and the Page tab hands a defused copy (`pageSrcDoc`) to a
 * `sandbox=""` srcdoc iframe under a CSP that allows no network loads but
 * `data:` images.
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

// The board's order.
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

/**
 * The Page frame's policy: no script, no fetch, no font, no frame and no
 * remote image or stylesheet; inline styles and `data:` images only. It
 * can't stop the frame navigating itself (a link click), so `pageSrcDoc`
 * takes the ways to navigate out of the markup.
 */
export const INSPECT_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'";

export const INSPECT_CSP_META = `<meta http-equiv="Content-Security-Policy" content="${INSPECT_CSP}">`;

/**
 * A leading doctype, after an optional BOM and HTML whitespace only (tab,
 * LF, FF, CR, space: JS `\s` is wider, and U+00A0 or U+2028 there would make
 * the parser open the body before the meta). The tokenizer ends a doctype at
 * the first `>`, even inside a quoted identifier, so `[^>]*` matches what
 * the browser reads.
 */
const LEADING_DOCTYPE = /^(﻿)?([\t\n\f\r ]*<!doctype[^>]*>)/i;

/**
 * The CSP meta placed so the parser makes it the head's first element. It
 * goes right after a leading doctype (dropping a BOM, which a string has no
 * use for and which would otherwise be text ahead of the head). If anything
 * else comes first it goes before everything, and the page renders in quirks
 * mode. Either way the parser opens the head for it, so a `<head>` hidden in
 * a comment or a script can't pull it out of the head.
 */
export const withCsp = (html: string): string => {
  const doctype = LEADING_DOCTYPE.exec(html);
  if (doctype === null) return `${INSPECT_CSP_META}${html}`;
  const rest = html.slice(doctype[0].length);
  return `${doctype[2] ?? ''}${INSPECT_CSP_META}${rest}`;
};

/** What can run, or embed another document, in the frame. */
const INERT_REMOVED =
  'script, noscript, template, iframe, frame, frameset, object, embed, base';

const XLINK = 'http://www.w3.org/1999/xlink';

/**
 * The Page tab's `srcdoc`. The body is parsed into an inert DOMParser
 * document (nothing runs or loads), and in that copy only:
 * - script, noscript, template, frames, object, embed and `<base>` go;
 * - every `on*` attribute goes;
 * - `<meta http-equiv="refresh">` goes;
 * - links and areas lose `href`, forms `action`, buttons `formaction`;
 * so the frame can't run anything or navigate itself to the live page.
 * The copy is serialised as a standards document and the CSP meta goes
 * first in its head (`withCsp`).
 */
export const pageSrcDoc = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll(INERT_REMOVED).forEach((node) => node.remove());
  doc.querySelectorAll('meta[http-equiv]').forEach((node) => {
    const equiv = node.getAttribute('http-equiv') ?? '';
    if (equiv.trim().toLowerCase() === 'refresh') node.remove();
  });
  doc.querySelectorAll('a, area').forEach((node) => {
    node.removeAttribute('href');
    node.removeAttributeNS(XLINK, 'href');
  });
  doc
    .querySelectorAll('form')
    .forEach((node) => node.removeAttribute('action'));
  doc
    .querySelectorAll('[formaction]')
    .forEach((node) => node.removeAttribute('formaction'));
  doc.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes)
      .filter((attr) => attr.name.toLowerCase().startsWith('on'))
      .forEach((attr) => node.removeAttribute(attr.name));
  });
  return withCsp(`<!doctype html>${doc.documentElement.outerHTML}`);
};

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
