// @vitest-environment jsdom

import { describe, expect, it, afterEach } from 'vitest';
import { ApiError } from '@/lib/api';
import {
  INSPECT_TABS,
  defaultInspectTab,
  goneReason,
  isFeedPage,
  pageText,
  parseBody,
  pickInspectPage,
  stoppedHerePage,
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
  it('Text and HTML only: the Page tab is 5b', () => {
    expect(INSPECT_TABS).toEqual(['text', 'html']);
  });

  it('a feed opens on Text', () => {
    expect(isFeedPage({ fetchMode: 'api' })).toBe(true);
    expect(defaultInspectTab(true)).toBe('text');
  });

  it('a fetched page opens on HTML', () => {
    expect(isFeedPage({ fetchMode: 'browser' })).toBe(false);
    expect(isFeedPage({})).toBe(false);
    expect(defaultInspectTab(false)).toBe('html');
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
