import { describe, expect, it } from 'vitest';
import { posterJoinUrl, qrPath } from '@/lib/poster/poster-rule';
import { shareAppLink } from './share-app-link';

const ORIGIN = 'https://concertcrawl.app';
const CODE = 'BETA-7KQ2-M9XD';

describe('shareAppLink', () => {
  it('points a live code at the short link, in caps for the QR', () => {
    const link = shareAppLink(ORIGIN, 'invite', { code: CODE, revoked: false });
    expect(link.personal).toBe(true);
    expect(link.qrText).toBe('HTTPS://CONCERTCRAWL.APP/I/BETA-7KQ2-M9XD');
    expect(link.qrText).toBe(posterJoinUrl(ORIGIN, CODE));
  });

  it('copies and shares lowercase except the code', () => {
    const link = shareAppLink(ORIGIN, 'invite', { code: CODE, revoked: false });
    expect(link.shareUrl).toBe('https://concertcrawl.app/i/BETA-7KQ2-M9XD');
    expect(link.shownUrl).toBe('concertcrawl.app/i/BETA-7KQ2-M9XD');
  });

  it('carries no query, no UTM and no user id', () => {
    const link = shareAppLink(ORIGIN, 'invite', { code: CODE, revoked: false });
    for (const text of [link.qrText, link.shareUrl, link.shownUrl]) {
      expect(text).not.toMatch(/[?&=#]/);
    }
  });

  it('falls back to the plain origin once the code is turned off', () => {
    const link = shareAppLink(ORIGIN, 'invite', { code: CODE, revoked: true });
    expect(link.personal).toBe(false);
    expect(link.shareUrl).toBe(ORIGIN);
    expect(link.shownUrl).toBe('concertcrawl.app');
    expect(link.qrText).toBe('HTTPS://CONCERTCRAWL.APP');
    expect(link.qrText).not.toContain(CODE);
  });

  it('is the plain origin after launch, whatever it is handed', () => {
    const link = shareAppLink(ORIGIN, 'open', { code: CODE, revoked: false });
    expect(link.personal).toBe(false);
    expect(link.shareUrl).toBe(ORIGIN);
    expect(link.qrText).not.toContain(CODE);
  });

  it('is the plain origin while there is no code yet', () => {
    expect(shareAppLink(ORIGIN, 'invite', null).personal).toBe(false);
  });

  it('draws through the poster encoder: a different code is a different QR', () => {
    const live = shareAppLink(ORIGIN, 'invite', { code: CODE, revoked: false });
    const plain = shareAppLink(ORIGIN, 'open', null);
    const livePath = qrPath(live.qrText);
    expect(livePath.size).toBeGreaterThan(0);
    expect(livePath.path).toMatch(/^M\d+ \d+h1v1h-1z/);
    expect(livePath.path).not.toBe(qrPath(plain.qrText).path);
  });
});
