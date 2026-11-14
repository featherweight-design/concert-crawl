import { describe, expect, it } from 'vitest';
import {
  deviceSummary,
  hasClientSession,
  isReportableId,
  mintClientErrorId,
  reportPage,
} from './report-context';

describe('mintClientErrorId', () => {
  it('passes the id shape the route and API accept, and differs each time', () => {
    const id = mintClientErrorId();
    expect(id).toMatch(/^c-[0-9a-z]{10}$/);
    expect(isReportableId(id)).toBe(true);
    expect(mintClientErrorId()).not.toBe(id);
  });
});

describe('hasClientSession (__client_uat)', () => {
  it.each([
    ['', false],
    ['__client_uat=0', false],
    ['__client_uat=', false],
    ['__client_uat=abc', false],
    ['__client_uat=-5', false],
    ['__client_uat=1700000000', true],
    ['theme=x; __client_uat=1700000000; other=1', true],
    // Clerk's per-instance suffixed copy counts.
    ['__client_uat_Xy12ab=1700000000', true],
    // A stale host-only "0" beside a live suffixed one: signed in.
    ['__client_uat=0; __client_uat_Xy12ab=1700000000', true],
    // Every copy says signed out.
    ['__client_uat=0; __client_uat_Xy12ab=0', false],
    // Only Clerk's own names.
    ['__client_uatx=1700000000', false],
  ])('%j → %s', (cookie, expected) => {
    expect(hasClientSession(cookie)).toBe(expected);
  });
});

describe('reportPage', () => {
  it('keeps the path and drops the query and hash', () => {
    expect(reportPage('/crews?tab=mine#top')).toBe('/crews');
  });

  it('redacts an invite token in the path', () => {
    expect(reportPage('/crew/join/secret-token')).not.toContain('secret-token');
  });
});

describe('deviceSummary', () => {
  it('names a browser and platform, never the raw agent', () => {
    expect(
      deviceSummary(
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36',
      ),
    ).toBe('Chrome on Android');
    expect(
      deviceSummary(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('Safari on iPhone');
    expect(
      deviceSummary(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/131.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('Chrome on iPhone');
    expect(
      deviceSummary(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36 Edg/131.0',
      ),
    ).toBe('Edge on Windows');
    expect(
      deviceSummary(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 FxiOS/132.0 Mobile/15E148 Safari/605.1.15',
      ),
    ).toBe('Firefox on iPhone');
  });
});
