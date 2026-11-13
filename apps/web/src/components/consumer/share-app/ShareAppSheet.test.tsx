// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import type { MeInviteResponse } from '@concert-crawl/types';
import type * as UseMeInviteModule from '@/lib/queries/use-me-invite';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: async () => null,
    isSignedIn: true,
    userId: 'u',
  }),
}));

vi.mock('@/lib/share/site-origin', () => ({
  siteOrigin: () => 'https://concertcrawl.app',
}));

const mockTrack = vi.fn();
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

let mockPhone = true;
vi.mock('@/lib/hooks/useIsMobileViewport', () => ({
  useIsMobileViewport: () => mockPhone,
}));

interface InviteQuery {
  data: MeInviteResponse | undefined;
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
}
let mockQuery: InviteQuery;
const useMeInvite = vi.fn((_enabled: boolean) => mockQuery);
vi.mock('@/lib/queries/use-me-invite', async (importOriginal) => ({
  ...(await importOriginal<typeof UseMeInviteModule>()),
  useMeInvite: (enabled: boolean) => useMeInvite(enabled),
}));

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { posterJoinUrl, qrPath } from '@/lib/poster/poster-rule';
import type { ShareCapabilities } from '@/lib/share/destinations';
import { SHARE_APP_COPY as COPY } from './definitions/copy';
import { COPIED_MS, ShareAppSheet } from './ShareAppSheet';

const ORIGIN = 'https://concertcrawl.app';
const CODE = 'BETA-7KQ2-M9XD';
const SHARE = CONSUMER_COPY.share;

const invite = (
  overrides: Partial<MeInviteResponse> = {},
): MeInviteResponse => ({
  code: CODE,
  revoked: false,
  joined: {
    count: 2,
    faces: [
      { handle: 'maya', avatarColor: 'accent', avatarSecondColor: 'warning' },
      { handle: 'jo', avatarColor: 'signal', avatarSecondColor: 'accent' },
    ],
  },
  ...overrides,
});

const ready = (data: MeInviteResponse): InviteQuery => ({
  data,
  isError: false,
  isFetching: false,
  refetch: vi.fn(),
});

const mount = (
  props: Partial<React.ComponentProps<typeof ShareAppSheet>> = {},
) =>
  render(
    <ShareAppSheet
      open
      onClose={props.onClose ?? (() => {})}
      mode={props.mode ?? 'invite'}
      capabilities={props.capabilities ?? {}}
    />,
  );

/** The presses, in DOM order, by their visible words. */
const presses = (): string[] =>
  screen
    .getAllByRole('button')
    .map((button) => button.textContent ?? '')
    .filter((text) => text !== '');

const clipboard = () => {
  const writeText = vi.fn(async (_text: string) => undefined);
  const caps: ShareCapabilities = { clipboard: { writeText } };
  return { writeText, caps };
};

beforeEach(() => {
  mockPhone = true;
  mockQuery = ready(invite());
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('<ShareAppSheet /> — invite mode', () => {
  it('is a labelled modal dialog with the invite title and body', () => {
    mount();
    const dialog = screen.getByRole('dialog', { name: COPY.titleInvite });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText(COPY.bodyInvite)).toBeTruthy();
    expect(screen.getByText(COPY.eyebrow)).toBeTruthy();
  });

  it('draws the QR from the poster encoder for the short link in caps', () => {
    mount();
    const qr = screen.getByRole('img', { name: COPY.qrAria });
    const expected = qrPath(posterJoinUrl(ORIGIN, CODE));
    expect(qr.getAttribute('viewBox')).toBe(
      `0 0 ${expected.size} ${expected.size}`,
    );
    expect(qr.querySelector('path')?.getAttribute('d')).toBe(expected.path);
    expect(screen.getByText(`concertcrawl.app/i/${CODE}`)).toBeTruthy();
  });

  it('asks for the code only while open, and only in invite mode', () => {
    mount();
    expect(useMeInvite).toHaveBeenCalledWith(true);
  });

  it('counts two friends with their faces', () => {
    mount();
    expect(screen.getByText(COPY.joinedLabel)).toBeTruthy();
    expect(screen.getByText(COPY.joinedCount(2))).toBeTruthy();
    expect(screen.queryByText(COPY.joinedMore(1))).toBeNull();
  });

  it('says "1 friend" for one', () => {
    mockQuery = ready(
      invite({
        joined: {
          count: 1,
          faces: [
            { handle: 'maya', avatarColor: null, avatarSecondColor: null },
          ],
        },
      }),
    );
    mount();
    expect(screen.getByText(COPY.joinedOne)).toBeTruthy();
  });

  it('shows four faces and +2 for six', () => {
    const face = { handle: 'a', avatarColor: null, avatarSecondColor: null };
    mockQuery = ready(
      invite({ joined: { count: 6, faces: [face, face, face, face] } }),
    );
    mount();
    expect(screen.getByText(COPY.joinedCount(6))).toBeTruthy();
    expect(screen.getByText(COPY.joinedMore(2))).toBeTruthy();
  });

  it('says no one yet, and that the code does not run out', () => {
    mockQuery = ready(invite({ joined: { count: 0, faces: [] } }));
    mount();
    expect(screen.getByText(COPY.joinedNone)).toBeTruthy();
    expect(screen.getByText(COPY.joinedNoneSub)).toBeTruthy();
  });

  it('holds the ticket while the code is made, with the presses waiting', () => {
    mockQuery = {
      data: undefined,
      isError: false,
      isFetching: true,
      refetch: vi.fn(),
    };
    mount();
    expect(
      screen.getByText(COPY.loading).closest('[role="status"]'),
    ).toBeTruthy();
    expect(screen.queryByRole('img', { name: COPY.qrAria })).toBeNull();
    for (const name of [SHARE.destinations.copyLink]) {
      expect(
        (screen.getByRole('button', { name }) as HTMLButtonElement).disabled,
      ).toBe(true);
    }
  });

  it('offers a retry in the QR place when the code could not be made', () => {
    const refetch = vi.fn();
    mockQuery = { data: undefined, isError: true, isFetching: false, refetch };
    mount();
    expect(screen.getByText(COPY.error)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: COPY.retry }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(
      (
        screen.getByRole('button', {
          name: SHARE.destinations.copyLink,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('shows loading again, not the error, while a retry is in flight', () => {
    mockQuery = {
      data: undefined,
      isError: true,
      isFetching: true,
      refetch: vi.fn(),
    };
    mount();
    expect(screen.queryByText(COPY.error)).toBeNull();
    expect(screen.getByText(COPY.loading)).toBeTruthy();
  });

  it('falls back to the plain site, with the note, when the code is turned off', () => {
    mockQuery = ready(invite({ revoked: true }));
    mount();
    const qr = screen.getByRole('img', { name: COPY.qrAriaOpen });
    expect(qr.querySelector('path')?.getAttribute('d')).toBe(
      qrPath(ORIGIN.toUpperCase()).path,
    );
    expect(screen.getByText('concertcrawl.app')).toBeTruthy();
    expect(screen.getByText(COPY.offCode)).toBeTruthy();
    expect(screen.queryByText(COPY.joinedLabel)).toBeNull();
    expect(screen.queryByText(CODE, { exact: false })).toBeNull();
  });
});

describe('<ShareAppSheet /> — after launch', () => {
  it('is a plain link: no code, no joined half, and the API is never asked', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    mount({ mode: 'open' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(useMeInvite).toHaveBeenCalledWith(false);
    expect(screen.getByRole('dialog', { name: COPY.titleOpen })).toBeTruthy();
    expect(screen.getByText(COPY.bodyOpen)).toBeTruthy();
    expect(screen.getByText(COPY.eyebrowOpen)).toBeTruthy();
    const qr = screen.getByRole('img', { name: COPY.qrAriaOpen });
    expect(qr.querySelector('path')?.getAttribute('d')).toBe(
      qrPath(ORIGIN.toUpperCase()).path,
    );
    expect(screen.queryByText(COPY.joinedLabel)).toBeNull();
    expect(screen.queryByText(COPY.bodyInvite)).toBeNull();
  });
});

describe('<ShareAppSheet /> — presses', () => {
  it('leads with Share… on a phone, Copy link and Full screen beneath it', () => {
    mount({ capabilities: { share: vi.fn(async () => undefined) } });
    expect(
      presses().filter((text) => /share…|copy link|full screen/i.test(text)),
    ).toEqual([
      SHARE.destinations.systemShare,
      SHARE.destinations.copyLink,
      COPY.fullscreen,
    ]);
  });

  it('opens Full screen from its press or a tap on the code, tracks it, and closes on Done', () => {
    mount();
    expect(screen.queryByTestId('share-fullscreen')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: COPY.fullscreen }));
    expect(mockTrack).toHaveBeenCalledWith('app_share_destination_selected', {
      destination: 'fullscreen',
    });
    const page = screen.getByTestId('share-fullscreen');
    expect(page.textContent).toContain(COPY.fullscreenTitle);
    expect(page.textContent).toContain(COPY.fullscreenNote);
    expect(page.textContent).toContain(`concertcrawl.app/i/${CODE}`);
    fireEvent.click(screen.getByRole('button', { name: COPY.fullscreenDone }));
    expect(screen.queryByTestId('share-fullscreen')).toBeNull();
    fireEvent.click(screen.getByTestId('share-qr'));
    expect(screen.getByTestId('share-fullscreen')).toBeTruthy();
  });

  it('has no Full screen on desktop', () => {
    mockPhone = false;
    mount();
    expect(screen.queryByRole('button', { name: COPY.fullscreen })).toBeNull();
  });

  it('leads with Copy link on desktop, and shows Share… only where the browser has it', () => {
    mockPhone = false;
    mount({ capabilities: { share: vi.fn(async () => undefined) } });
    expect(presses().filter((text) => /share…|copy link/i.test(text))).toEqual([
      SHARE.destinations.copyLink,
      SHARE.destinations.systemShare,
    ]);
    cleanup();
    mount();
    expect(
      screen.queryByRole('button', { name: SHARE.destinations.systemShare }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: SHARE.destinations.copyLink }),
    ).toBeTruthy();
  });

  it('copies the lowercase link with the code, tracks it, and says so for two seconds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { writeText, caps } = clipboard();
    mount({ capabilities: caps });
    fireEvent.click(
      screen.getByRole('button', { name: SHARE.destinations.copyLink }),
    );
    await act(async () => {});
    expect(writeText).toHaveBeenCalledWith(
      `https://concertcrawl.app/i/${CODE}`,
    );
    expect(mockTrack).toHaveBeenCalledWith('app_share_destination_selected', {
      destination: 'copy-link',
    });
    expect(screen.getAllByText(SHARE.copyLinkDone).length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(COPIED_MS);
    });
    expect(screen.queryByText(SHARE.copyLinkDone)).toBeNull();
    expect(
      screen.getByRole('button', { name: SHARE.destinations.copyLink }),
    ).toBeTruthy();
  });

  it('copies the plain site when the code is turned off or the app is open', async () => {
    const { writeText, caps } = clipboard();
    mount({ mode: 'open', capabilities: caps });
    fireEvent.click(
      screen.getByRole('button', { name: SHARE.destinations.copyLink }),
    );
    await act(async () => {});
    expect(writeText).toHaveBeenCalledWith(ORIGIN);
  });

  it('shares the link with the invite line, tracks it, and says nothing on success', async () => {
    const share = vi.fn(async (_data: ShareData) => undefined);
    mount({ capabilities: { share } });
    fireEvent.click(
      screen.getByRole('button', { name: SHARE.destinations.systemShare }),
    );
    await act(async () => {});
    expect(share).toHaveBeenCalledWith({
      title: COPY.eyebrowOpen,
      text: COPY.shareText,
      url: `https://concertcrawl.app/i/${CODE}`,
    });
    expect(mockTrack).toHaveBeenCalledWith('app_share_destination_selected', {
      destination: 'system',
    });
    expect(screen.queryByText(COPY.shareFailed)).toBeNull();
  });

  it('uses the plain line, not "my invite", for a plain link', async () => {
    const share = vi.fn(async (_data: ShareData) => undefined);
    mount({ mode: 'open', capabilities: { share } });
    fireEvent.click(
      screen.getByRole('button', { name: SHARE.destinations.systemShare }),
    );
    await act(async () => {});
    expect(share).toHaveBeenCalledWith({
      title: COPY.eyebrowOpen,
      text: COPY.shareTextOpen,
      url: ORIGIN,
    });
  });

  it('points at Copy link, politely, when the phone refuses', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mount({
      capabilities: {
        share: vi.fn(async () => {
          throw new Error('refused');
        }),
      },
    });
    fireEvent.click(
      screen.getByRole('button', { name: SHARE.destinations.systemShare }),
    );
    await act(async () => {});
    const line = screen.getByText(COPY.shareFailed);
    expect(line.closest('[aria-live="polite"]')).toBeTruthy();
  });

  it('says the copy failed, not "copy the link instead", when the clipboard refuses', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mount({
      capabilities: {
        clipboard: {
          writeText: vi.fn(async () => {
            throw new Error('denied');
          }),
        },
      },
    });
    fireEvent.click(
      screen.getByRole('button', { name: SHARE.destinations.copyLink }),
    );
    await act(async () => {});
    const line = screen.getByText(COPY.copyFailed);
    expect(line.closest('[aria-live="polite"]')).toBeTruthy();
    expect(screen.queryByText(COPY.shareFailed)).toBeNull();
  });

  it('says nothing when the share sheet is dismissed', async () => {
    const cancel = new Error('dismissed');
    cancel.name = 'AbortError';
    mount({
      capabilities: {
        share: vi.fn(async () => {
          throw cancel;
        }),
      },
    });
    fireEvent.click(
      screen.getByRole('button', { name: SHARE.destinations.systemShare }),
    );
    await act(async () => {});
    expect(screen.queryByText(COPY.shareFailed)).toBeNull();
  });
});

describe('<ShareAppSheet /> — dialog behaviour', () => {
  it('closes on Escape, through BottomSheet', () => {
    const onClose = vi.fn();
    mount({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while closed', () => {
    render(<ShareAppSheet open={false} onClose={() => {}} mode="invite" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useMeInvite).toHaveBeenCalledWith(false);
  });
});
