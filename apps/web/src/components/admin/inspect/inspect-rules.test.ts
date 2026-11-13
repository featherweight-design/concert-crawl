// @vitest-environment jsdom

import { describe, expect, it, afterEach } from 'vitest';
import { ApiError } from '@/lib/api';
import {
  INSPECT_CSP,
  INSPECT_TABS,
  defaultInspectTab,
  goneReason,
  inspectTabs,
  isFeedPage,
  pageSrcDoc,
  pageText,
  parseBody,
  pickInspectPage,
  stoppedHerePage,
  withCsp,
} from './inspect-rules';
import {
  defaultInspectPage,
  firstFailedPage,
} from '@/components/admin/crawl-runs/runs-rules';

const at = (
  id: string,
  httpStatus: number | null,
  finalUrl: string | null = null,
) => ({ id, url: `https://example.com/${id}`, finalUrl, httpStatus });

const pages = [
  at('p1', 200),
  at('p2', 200),
  at('p3', 503),
  at('p4', null),
  at('p5', 404),
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

  it('Compare keeps the page: the same url, then the same finalUrl', () => {
    const run = [
      at('q1', 503),
      at('q2', 200, 'https://example.com/landed'),
      at('q3', 200),
    ];
    expect(pickInspectPage(run, undefined, 'https://example.com/q3')?.id).toBe(
      'q3',
    );
    expect(
      pickInspectPage(run, undefined, 'https://example.com/landed')?.id,
    ).toBe('q2');
    // A url matches before a finalUrl does.
    const both = [at('r1', 200, 'https://example.com/r2'), at('r2', 200)];
    expect(pickInspectPage(both, undefined, 'https://example.com/r2')?.id).toBe(
      'r2',
    );
  });

  it('a url no page has falls back to the default; ?page= wins over ?url=', () => {
    const run = [at('q1', 200), at('q2', 503)];
    expect(pickInspectPage(run, undefined, 'https://nowhere.test/')?.id).toBe(
      'q2',
    );
    expect(pickInspectPage(run, undefined, ['x', 'y'])?.id).toBe('q2');
    expect(pickInspectPage(run, 'q1', 'https://example.com/q2')?.id).toBe('q1');
  });
});

describe('stoppedHerePage', () => {
  it('names the first later page that failed (4xx, 5xx), 1-based', () => {
    expect(stoppedHerePage(pages, 'p1')).toBe(3);
    expect(stoppedHerePage(pages, 'p3')).toBe(5);
  });

  it('a page with no status is not a failure', () => {
    expect(stoppedHerePage([at('a', 200), at('b', null)], 'a')).toBeNull();
  });

  it('is null when nothing later failed, or for an unknown page', () => {
    expect(stoppedHerePage(pages, 'p5')).toBeNull();
    expect(stoppedHerePage(pages.slice(0, 2), 'p1')).toBeNull();
    expect(stoppedHerePage(pages, 'nope')).toBeNull();
  });

  it('agrees with the default page and First failure on [200, null, 404]', () => {
    const run = [at('a', 200), at('b', null), at('c', 404)];
    expect(firstFailedPage(run)).toBe(2);
    expect(defaultInspectPage(run)?.id).toBe('c');
    expect(pickInspectPage(run, undefined)?.id).toBe('c');
    expect(stoppedHerePage(run, 'a')).toBe(3);
    expect(stoppedHerePage(run, 'b')).toBe(3);
    expect(stoppedHerePage(run, 'c')).toBeNull();
  });
});

describe('tabs', () => {
  it('Page, Text and HTML, in the board’s order', () => {
    expect(INSPECT_TABS).toEqual(['page', 'text', 'html']);
  });

  it('a feed has no Page and opens on Text', () => {
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

/** How a browser reads a srcdoc: parsed as an HTML document. */
const parsed = (srcDoc: string) =>
  new DOMParser().parseFromString(srcDoc, 'text/html');

/** The CSP meta is the head's first element, carrying the whole policy. */
const expectCspFirst = (srcDoc: string) => {
  const first = parsed(srcDoc).head.firstElementChild;
  expect(first?.tagName).toBe('META');
  expect(first?.getAttribute('http-equiv')).toBe('Content-Security-Policy');
  expect(first?.getAttribute('content')).toBe(INSPECT_CSP);
};

describe('the Page tab’s policy', () => {
  it('loads nothing but data: images and inline styles, and pins base and forms', () => {
    expect(INSPECT_CSP).toBe(
      "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'",
    );
  });
});

describe('withCsp', () => {
  const BODY = '<html><head><title>x</title></head><body><p>Show</p></body>';

  it('goes right after a leading doctype, and first in the head', () => {
    const html = `<!DOCTYPE html>${BODY}`;
    const out = withCsp(html);
    expect(out.startsWith('<!DOCTYPE html><meta ')).toBe(true);
    expectCspFirst(out);
    // Standards mode is kept.
    expect(parsed(out).compatMode).toBe('CSS1Compat');
  });

  it('allows HTML whitespace and a BOM before the doctype', () => {
    for (const lead of ['\t\n\f\r ', '﻿', '﻿\n  ']) {
      const out = withCsp(`${lead}<!doctype html>${BODY}`);
      expect(out.startsWith('﻿')).toBe(false);
      expect(out.indexOf('<meta ')).toBeLessThan(out.indexOf('<html>'));
      expectCspFirst(out);
    }
  });

  it('anything else before the doctype: the meta goes before everything', () => {
    // U+00A0, U+000B and U+2028 match JS \s but are not HTML whitespace.
    for (const lead of [' ', '\u000B', ' ', '<!-- <head> -->', 'text']) {
      const out = withCsp(`${lead}<!doctype html>${BODY}`);
      expect(out.startsWith('<meta ')).toBe(true);
      expectCspFirst(out);
    }
  });

  it('no doctype: the meta goes before everything', () => {
    const out = withCsp(BODY);
    expect(out.startsWith('<meta ')).toBe(true);
    expectCspFirst(out);
  });

  it('a <head> in a comment or a script can’t pull it out of the head', () => {
    expectCspFirst(withCsp('<!-- <head></head> --><body>x</body>'));
    expectCspFirst(
      withCsp('<!doctype html><script>"<head>"</script><body>x</body>'),
    );
  });
});

describe('pageSrcDoc', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, '__inspectRan');
  });

  it('keeps the page’s text and inline styles, with the CSP meta first', () => {
    const out = pageSrcDoc(
      '<html><head><style>p{color:red}</style></head><body><p style="margin:0">Tate McRae</p></body></html>',
    );
    expect(out.startsWith('<!doctype html><meta ')).toBe(true);
    const doc = parsed(out);
    expectCspFirst(out);
    expect(doc.body.textContent).toBe('Tate McRae');
    expect(doc.querySelector('style')?.textContent).toBe('p{color:red}');
    expect(doc.querySelector('p')?.getAttribute('style')).toBe('margin:0');
  });

  it('takes away every way to navigate the frame', () => {
    const out = pageSrcDoc(
      '<html><head><base href="https://venue.test/"><meta http-equiv="Refresh" content="0; url=https://venue.test/"><meta charset="utf-8"></head>' +
        '<body><a href="https://venue.test/events">Events</a>' +
        '<map name="m"><area href="https://venue.test/a" alt="a"></map>' +
        '<form action="https://venue.test/go"><button formaction="https://venue.test/b">Go</button></form>' +
        '<svg><a href="https://venue.test/s"><text>s</text></a></svg></body></html>',
    );
    const doc = parsed(out);
    expectCspFirst(out);
    expect(doc.querySelectorAll('a')).toHaveLength(2);
    doc.querySelectorAll('a, area').forEach((node) => {
      expect(node.hasAttribute('href')).toBe(false);
    });
    expect(doc.querySelector('base')).toBeNull();
    expect(doc.querySelector('meta[http-equiv="Refresh"]')).toBeNull();
    expect(doc.querySelector('meta[charset]')).not.toBeNull();
    expect(doc.querySelector('form')?.hasAttribute('action')).toBe(false);
    expect(doc.querySelector('button')?.hasAttribute('formaction')).toBe(false);
    expect(out).not.toContain('venue.test');
  });

  it('leaves no script, handler or embedded document to run', () => {
    const out = pageSrcDoc(
      '<html><head><script src="https://venue.test/a.js"></script></head>' +
        '<body onload="alert(3)"><p>Show</p><script>alert(1)</script>' +
        '<img src=x onerror="alert(2)"><noscript><p>No JS</p></noscript>' +
        '<iframe src="https://venue.test/"></iframe><object data="x"></object>' +
        '<embed src="x"><template><script>alert(4)</script></template>' +
        '<div OnClick="alert(5)">x</div></body></html>',
    );
    expect(out.toLowerCase()).not.toContain('<script');
    expect(out).not.toMatch(/\son[a-z]+\s*=/i);
    expect(out).not.toContain('alert(');
    const doc = parsed(out);
    expectCspFirst(out);
    expect(
      doc.querySelector('noscript, iframe, object, embed, template'),
    ).toBeNull();
    // The image stays: the CSP keeps it from loading.
    expect(doc.querySelector('img')?.getAttribute('src')).toBe('x');
    expect(Reflect.get(window, '__inspectRan')).toBeUndefined();
    expect(document.body.innerHTML).toBe('');
  });

  it('puts the meta first whatever came before the page’s own doctype', () => {
    for (const lead of [' ', '\u000B', ' ', '<!-- c -->', 'text']) {
      expectCspFirst(pageSrcDoc(`${lead}<!doctype html><p>x</p>`));
    }
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

  it('breaks lines after block elements and <br>, not inside inline ones', () => {
    expect(pageText('<div>A</div><div>B</div>')).toBe('A\nB');
    expect(pageText('<p>One<br>Two</p><ul><li>x</li><li>y</li></ul>')).toBe(
      'One\nTwo\nx\ny',
    );
    expect(pageText('<p>Tate <b>McRae</b></p>')).toBe('Tate McRae');
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
