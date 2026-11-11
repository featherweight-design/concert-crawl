import { describe, expect, it } from 'vitest';
import { coarseDevice, deviceSummary, reportPage } from './report-context';

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

describe('coarseDevice', () => {
  it('reads platform first, the way the error page lists it', () => {
    expect(
      coarseDevice(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('iPhone · Safari');
    expect(
      coarseDevice(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36',
      ),
    ).toBe('Mac · Chrome');
  });

  it('never carries the raw agent, and drops an unknown platform', () => {
    const agent = 'SomeBot/1.0 (+https://example.com)';
    expect(coarseDevice(agent)).toBe('Browser');
    expect(coarseDevice(agent)).not.toContain('example');
  });
});
