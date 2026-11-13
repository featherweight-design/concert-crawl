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
 * `sandbox=""` srcdoc iframe: no scripts and an opaque origin, subresources
 * blocked by a CSP, the ways to navigate taken out of the markup, and no
 * frame at all when the copy can't be shown to be safe.
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
 * The Page frame's policy for subresources: no script, fetch, font, frame or
 * remote image or stylesheet; inline styles and `data:` images only. It
 * governs neither navigation (a link click) nor resource hints such as
 * `dns-prefetch`, so `pageSrcDoc` takes those out of the markup.
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

/**
 * Elements removed outright, by lowercased local name (SVG's are camelCase,
 * and a CSS type selector matches them case-sensitively):
 * - what can run or embed another document: script, noscript, template,
 *   frames, object, embed;
 * - what can point the frame elsewhere: `<base>`, and SVG animation (SMIL),
 *   which can set an `href` back after it has been removed;
 * - `<link>`: a stylesheet is blocked by the CSP anyway, but `dns-prefetch`
 *   and `preconnect` hints are not governed by it.
 */
const REMOVED_ELEMENTS = new Set([
  'script',
  'noscript',
  'template',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'base',
  'link',
  'animate',
  'set',
  'animatemotion',
  'animatetransform',
  'discard',
]);

/** Attributes that navigate or submit, by local name (so `xlink:href` too). */
const NAVIGATING_ATTRIBUTES = new Set(['href', 'action', 'formaction']);

const isRefreshMeta = (node: Element): boolean =>
  node.localName.toLowerCase() === 'meta' &&
  (node.getAttribute('http-equiv') ?? '').trim().toLowerCase() === 'refresh';

const isRemovedElement = (node: Element): boolean =>
  REMOVED_ELEMENTS.has(node.localName.toLowerCase()) || isRefreshMeta(node);

const isRemovedAttribute = (attr: Attr): boolean => {
  const local = attr.localName.toLowerCase();
  return (
    NAVIGATING_ATTRIBUTES.has(local) ||
    local.startsWith('on') ||
    attr.name.toLowerCase().startsWith('on')
  );
};

const parseHtml = (html: string): Document =>
  new DOMParser().parseFromString(html, 'text/html');

/**
 * One pass: parse into an inert DOMParser document (nothing runs or loads),
 * drop the removed elements and attributes, and serialise as a standards
 * document. A srcdoc document is never in quirks mode (the HTML parser
 * exempts it), so the doctype changes nothing in the frame; it makes this
 * parse, and the check's, build the same tree the frame will.
 */
const defusePass = (html: string): string => {
  const doc = parseHtml(html);
  Array.from(doc.querySelectorAll('*')).forEach((node) => {
    if (isRemovedElement(node)) {
      node.remove();
      return;
    }
    Array.from(node.attributes)
      .filter(isRemovedAttribute)
      .forEach((attr) => node.removeAttributeNode(attr));
  });
  return `<!doctype html>${doc.documentElement.outerHTML}`;
};

/**
 * The check on the exact string the frame gets: the CSP meta is the head's
 * first element, and nothing removed is left anywhere.
 */
const isSafeSrcDoc = (srcDoc: string): boolean => {
  const doc = parseHtml(srcDoc);
  const first = doc.head.firstElementChild;
  if (
    first === null ||
    first.localName !== 'meta' ||
    first.getAttribute('http-equiv') !== 'Content-Security-Policy' ||
    first.getAttribute('content') !== INSPECT_CSP
  ) {
    return false;
  }
  return Array.from(doc.querySelectorAll('*')).every(
    (node) =>
      !isRemovedElement(node) &&
      !Array.from(node.attributes).some(isRemovedAttribute),
  );
};

const MAX_PASSES = 5;

/**
 * The Page tab's `srcdoc`, or null when it can't be shown safely. Markup can
 * parse differently once serialised (mutation XSS), so the defused copy is
 * re-parsed and defused again until the string stops changing, at most
 * `MAX_PASSES` times. The CSP meta then goes first in the head (`withCsp`),
 * and that exact string is parsed once more and checked. A copy that never
 * settles, or fails the check, is null: the tab shows no frame.
 */
export const pageSrcDoc = (html: string): string | null => {
  let previous = html;
  let current = defusePass(html);
  let passes = 1;
  while (current !== previous) {
    if (passes === MAX_PASSES) return null;
    previous = current;
    current = defusePass(current);
    passes += 1;
  }
  const srcDoc = withCsp(current);
  return isSafeSrcDoc(srcDoc) ? srcDoc : null;
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
