// @vitest-environment jsdom

// The client path of siteOrigin(): the share sheet resolves it in the browser,
// where VERCEL_URL does not exist.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { siteOrigin } from '../site-origin';

const ORIGINAL = { ...process.env };

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL };
});

describe('siteOrigin in the browser', () => {
  it('falls back to the page origin, not localhost, when nothing is configured', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;

    vi.stubGlobal('window', {
      location: { origin: 'https://staging.concertcrawl.app' },
    });

    expect(siteOrigin()).toBe('https://staging.concertcrawl.app');
  });

  it('still prefers the configured site URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://concertcrawl.app';

    expect(siteOrigin()).toBe('https://concertcrawl.app');
  });
});
