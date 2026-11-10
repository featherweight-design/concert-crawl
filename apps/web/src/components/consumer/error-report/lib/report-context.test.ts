import { describe, expect, it } from 'vitest';
import { deviceSummary, reportPage } from './report-context';

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
  });
});
