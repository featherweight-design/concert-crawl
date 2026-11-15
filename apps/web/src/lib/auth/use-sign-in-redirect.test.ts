import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}));

import { signInReturnPath, type PendingAction } from './use-sign-in-redirect';

const follow = (artistSlug: string): PendingAction => ({
  intent: { action: 'follow', artistSlug },
  label: 'Wax Harbour',
});

describe('signInReturnPath', () => {
  it('returns where the visitor was for no action or a watch', () => {
    expect(signInReturnPath('/browse?q=1', '/browse', undefined)).toBe(
      '/browse?q=1',
    );
    expect(
      signInReturnPath('/browse?q=1', '/browse', {
        intent: {
          action: 'watch',
          eventId: '3f1a9c62-8d4b-4e17-9f2a-1b6c7d8e9f01',
        },
      }),
    ).toBe('/browse?q=1');
  });

  it("sends a follow started elsewhere to that artist's page", () => {
    expect(
      signInReturnPath('/search?q=wax', '/search', follow('wax-harbour')),
    ).toBe('/artists/wax-harbour');
  });

  it("already on that artist's page keeps its query and fragment", () => {
    expect(
      signInReturnPath(
        '/artists/wax-harbour?a=1#b',
        '/artists/wax-harbour',
        follow('wax-harbour'),
      ),
    ).toBe('/artists/wax-harbour?a=1#b');
  });

  it("on a different artist's page goes to the intent's artist", () => {
    expect(
      signInReturnPath(
        '/artists/other-act?a=1#b',
        '/artists/other-act',
        follow('wax-harbour'),
      ),
    ).toBe('/artists/wax-harbour');
  });

  it('keeps the visitor where they were when the slug is not a slug', () => {
    expect(
      signInReturnPath(
        '/search?q=wax',
        '/search',
        follow('../..//evil.example'),
      ),
    ).toBe('/search?q=wax');
  });
});
