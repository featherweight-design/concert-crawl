// @vitest-environment jsdom

import { describe, expect, it, afterEach } from 'vitest';
import { ApiError } from '@/lib/api';
import {
  INSPECT_CSP,
  INSPECT_CSP_META,
  defaultInspectTab,
  goneReason,
  inspectTabs,
  isFeedPage,
  pageText,
  parseBody,
  pickInspectPage,
  stoppedHerePage,
  withCsp,
} from './inspect-rules';

const pages = [
  { id: 'p1', httpStatus: 200 },
  { id: 'p2', httpStatus: 200 },
  { id: 'p3', httpStatus: 503 },
  { id: 'p4', httpStatus: null },
];

describe('pickInspectPage', () => {
  it('opens the page ?page= names when it is one of the run’s', () => {
    expect(pickInspectPage(pages, 'p2')?.id).toBe('p2');
  });

  it('defaults to the first failed page, else the first', () => {
    expect(pickInspectPage(pages, undefined)?.id).toBe('p3');
    expect(pickInspectPage(pages, 'not-a-page')?.id).toBe('p3');
    expect(pickInspectPage(pages, ['p2', 'p2'])?.id).toBe('p3');
    expect(pickInspectPage(pages.slice(0, 2), undefined)?.id).toBe('p1');
  });

  it('is null for a run with no pages', () => {
    expect(pickInspectPage([], 'p1')).toBeNull();
  });
});

describe('stoppedHerePage', () => {
  it('names the first later page that failed or has no status, 1-based', () => {
    expect(stoppedHerePage(pages, 'p1')).toBe(3);
    expect(stoppedHerePage(pages, 'p3')).toBe(4);
  });

  it('is null when nothing later failed, or for an unknown page', () => {
    expect(stoppedHerePage(pages, 'p4')).toBeNull();
    expect(stoppedHerePage(pages.slice(0, 2), 'p1')).toBeNull();
    expect(stoppedHerePage(pages, 'nope')).toBeNull();
  });
});

describe('tabs', () => {
  it('a feed has Text and HTML, and opens on Text', () => {
    expect(isFeedPage({ fetchMode: 'api' })).toBe(true);
    expect(inspectTabs(true)).toEqual(['text', 'html']);
    expect(defaultInspectTab(true)).toBe('text');
  });

  it('a fetched page has Page, Text and HTML, and opens on HTML', () => {
    expect(isFeedPage({ fetchMode: 'browser' })).toBe(false);
    expect(isFeedPage({})).toBe(false);
    expect(inspectTabs(false)).toEqual(['page', 'text', 'html']);
    expect(defaultInspectTab(false)).toBe('html');
  });
});

describe('withCsp', () => {
  it('is the no-network CSP', () => {
    expect(INSPECT_CSP).toBe(
      "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
    );
  });

  it('puts the CSP meta first, before everything', () => {
    const html = '<html><head><title>x</title></head><body>hi</body></html>';
    expect(withCsp(html).startsWith(INSPECT_CSP_META)).toBe(true);
    expect(withCsp('<p>no head</p>')).toBe(`${INSPECT_CSP_META}<p>no head</p>`);
  });

  it('keeps a leading doctype first, then the meta', () => {
    const html = '<!DOCTYPE html>\n<html><head></head></html>';
    expect(withCsp(html)).toBe(
      `<!DOCTYPE html>${INSPECT_CSP_META}\n<html><head></head></html>`,
    );
  });

  it('the parser makes it the head’s first element, even past a decoy head', () => {
    const html =
      '<!doctype html><!-- <head> --><html><head><script>x()</script><meta name="a"></head><body></body></html>';
    const doc = new DOMParser().parseFromString(withCsp(html), 'text/html');
    const first = doc.head.firstElementChild;
    expect(first?.getAttribute('http-equiv')).toBe('Content-Security-Policy');
    expect(first?.getAttribute('content')).toBe(INSPECT_CSP);
  });
});

describe('pageText', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, '__inspectRan');
  });

  it('strips the tags, collapses whitespace and drops blank lines', () => {
    const html =
      '<html><body><h1>  Tate   McRae </h1>\n\n<p>Nov 9\t· 8 PM</p></body></html>';
    expect(pageText(html)).toBe('Tate McRae\nNov 9 · 8 PM');
  });

  it('never runs the page’s scripts, and leaves their source out of the text', () => {
    const html =
      '<body><p>Show</p><script>window.__inspectRan = true;</script><img src="x" onerror="window.__inspectRan = true"><style>p{}</style></body>';
    const text = pageText(html);
    expect(text).toBe('Show');
    expect(text).not.toContain('__inspectRan');
    expect(Reflect.get(window, '__inspectRan')).toBeUndefined();
    // Nothing reached the app's own document.
    expect(document.body.innerHTML).toBe('');
  });
});

describe('the body', () => {
  it('reads the HTML out of the JSON answer', () => {
    expect(parseBody({ id: 'p1', html: '<p>x</p>' })).toBe('<p>x</p>');
    expect(parseBody('<p>x</p>')).toBeNull();
    expect(parseBody({ html: 3 })).toBeNull();
  });

  it('reads each 404 reason', () => {
    for (const reason of ['expired', 'too_large', 'not_stored'] as const) {
      expect(
        goneReason(new ApiError(404, 'gone', undefined, undefined, reason)),
      ).toBe(reason);
    }
  });

  it('anything else is Couldn’t load', () => {
    expect(goneReason(new ApiError(404, 'Page not found'))).toBeNull();
    expect(
      goneReason(new ApiError(404, 'x', undefined, undefined, 'mystery')),
    ).toBeNull();
    expect(
      goneReason(new ApiError(500, 'x', undefined, undefined, 'expired')),
    ).toBeNull();
    expect(goneReason(new Error('network'))).toBeNull();
  });
});
