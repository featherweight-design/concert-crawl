import { describe, it, expect, vi } from 'vitest';

// layout.tsx loads Inter via next/font/google, which isn't available in the
// vitest environment; stub it so we can import the module's metadata export.
const stubFont = () => ({ variable: '--font-stub', className: 'font-stub' });
vi.mock('next/font/google', () => ({
  Inter: stubFont,
  JetBrains_Mono: stubFont,
  Caveat: stubFont,
}));

const { metadata } = await import('./layout');

describe('root metadata.icons', () => {
  const icons = metadata.icons;

  it('declares an explicit icon list', () => {
    expect(icons).toBeTruthy();
    expect(icons && typeof icons === 'object' && 'icon' in icons).toBeTruthy();
  });

  // Regression guard: declaring metadata.icons overrides Next's app/icon.svg
  // file-convention detection, so the scalable SVG favicon must be listed
  // explicitly or the browser tab icon breaks.
  it('lists the SVG favicon first so the tab icon renders', () => {
    const list =
      icons && typeof icons === 'object' && 'icon' in icons ? icons.icon : null;
    expect(Array.isArray(list)).toBeTruthy();
    const first = Array.isArray(list) ? list[0] : null;
    expect(first).toMatchObject({ url: '/icon.svg', type: 'image/svg+xml' });
  });

  it('retains the PWA PNG icons for non-SVG platforms', () => {
    const list =
      icons && typeof icons === 'object' && 'icon' in icons ? icons.icon : [];
    const urls = Array.isArray(list)
      ? list.map((entry) =>
          entry && typeof entry === 'object' && 'url' in entry
            ? String(entry.url)
            : '',
        )
      : [];
    expect(urls).toContain('/api/pwa/icon-192');
    expect(urls).toContain('/api/pwa/icon-512');
  });

  // Regression guard: without this entry Next renders no <link
  // rel="apple-touch-icon">, and iOS Safari's Add-to-Home-Screen falls back to
  // a page screenshot — which for us displayed the "Concert Crawl" wordmark's
  // "C" as a giant letter icon on the home screen (bug found 2026-07-19).
  it('declares an apple-touch-icon so iOS Add-to-Home-Screen uses our art', () => {
    const list =
      icons && typeof icons === 'object' && 'apple' in icons
        ? icons.apple
        : null;
    expect(Array.isArray(list)).toBeTruthy();
    const urls = Array.isArray(list)
      ? list.map((entry) =>
          entry && typeof entry === 'object' && 'url' in entry
            ? String(entry.url)
            : '',
        )
      : [];
    expect(urls).toContain('/api/pwa/icon-apple-180');
  });
});

describe('root metadata.appleWebApp.startupImage', () => {
  // The metadata is a module-level constant, so each case re-imports it under
  // its own env.
  const startupImageUnder = async (value: string | undefined) => {
    vi.resetModules();
    if (value === undefined) vi.unstubAllEnvs();
    else vi.stubEnv('NEXT_PUBLIC_LAUNCH_STARTUP_IMAGES', value);
    const { metadata: fresh } = await import('./layout');
    vi.unstubAllEnvs();
    return fresh.appleWebApp;
  };

  it('is absent unless the switch is "1", so iOS keeps its own splash', async () => {
    const unset = await startupImageUnder(undefined);
    expect(unset && typeof unset === 'object' && 'startupImage' in unset).toBe(
      false,
    );
    const off = await startupImageUnder('0');
    expect(off && typeof off === 'object' && 'startupImage' in off).toBe(false);
  });

  it('lists the launch stills when the switch is "1"', async () => {
    const on = await startupImageUnder('1');
    const list =
      on && typeof on === 'object' && 'startupImage' in on
        ? on.startupImage
        : null;
    expect(Array.isArray(list)).toBe(true);
    expect(list).toContainEqual(
      expect.objectContaining({ url: '/api/pwa/startup/1170x2532' }),
    );
  });
});

describe('root metadata.verification', () => {
  // Google re-checks the tag periodically rather than only at first
  // verification, so losing it silently un-verifies the property and with it
  // our ability to submit the sitemap. Nothing else in the suite would notice.
  it('carries the Google Search Console ownership token', () => {
    expect(metadata.verification?.google).toBe(
      'kJBcxiEDRqZNKvZ3cplUZ6fyXcrQy2yRC1PPGexR2UI',
    );
  });
});
