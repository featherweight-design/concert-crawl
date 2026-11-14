// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
vi.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'jade' }),
}));

import { ShareSheet } from '../ShareSheet';
import type { ShareCapabilities } from '@/lib/share/destinations';
import type { PosterEvent } from '@/lib/share/poster-event';

afterEach(cleanup);

const EVENT_ID = '11111111-2222-4333-8444-555555555555';

const poster: PosterEvent = {
  id: EVENT_ID,
  artist: 'Snakebite Revival',
  venue: 'Bluebird Theater',
  city: 'Denver',
  dateShort: 'FRI, MAR 14',
  showTime: '8:00 PM',
  state: 'going',
  dropLabel: null,
};

const mount = (props: Partial<React.ComponentProps<typeof ShareSheet>> = {}) =>
  render(
    <ShareSheet
      open
      onClose={props.onClose ?? (() => {})}
      event={poster}
      handle={props.handle ?? null}
      capabilities={props.capabilities ?? {}}
    />,
  );

describe('<ShareSheet />', () => {
  it('is a labelled modal dialog', () => {
    mount();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    mount({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('previews the poster with descriptive alt text', () => {
    mount();
    const preview = screen.getByRole('img');
    expect(preview.getAttribute('src')).toBe(
      `/share/${EVENT_ID}/story?theme=jade`,
    );
    expect(preview.getAttribute('alt')).toContain('Snakebite Revival');
    expect(preview.getAttribute('alt')).toContain('Bluebird Theater');
  });

  // The poster is drawn on demand and measured at 2.7–6.8s on staging, so an
  // unannounced preview is a blank box for long enough to read as broken.
  it('says the poster is drawing until it lands, then shows it', () => {
    mount();
    expect(screen.getByRole('status').textContent).toBe('Drawing your poster…');
    fireEvent.load(screen.getByRole('img'));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('keeps the sheet usable when the poster route fails', () => {
    mount();
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('status').textContent).toContain(
      "Couldn't draw the poster",
    );
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeTruthy();
  });

  // A settled poster must not be shown under the next shape's label while that
  // shape is still drawing.
  it('re-enters the drawing state when the shape changes', () => {
    mount();
    fireEvent.load(screen.getByRole('img'));
    fireEvent.click(screen.getByRole('button', { name: 'Square' }));
    expect(screen.getByRole('status').textContent).toBe('Drawing your poster…');
  });

  // ShareButton renders ShareSheet unconditionally and only toggles `open`, so
  // nothing in here unmounts on close — every piece of state outlives it unless
  // it is reset.
  it('restarts on reopen rather than resuming the last session', () => {
    const sheet = (open: boolean) => (
      <ShareSheet
        open={open}
        onClose={() => {}}
        event={poster}
        handle={null}
        capabilities={{}}
      />
    );
    const { rerender } = render(sheet(true));
    fireEvent.click(screen.getByRole('button', { name: 'Square' }));
    fireEvent.error(screen.getByRole('img'));

    rerender(sheet(false));
    rerender(sheet(true));

    expect(screen.getByRole('img').getAttribute('src')).toBe(
      `/share/${EVENT_ID}/story?theme=jade`,
    );
    expect(screen.getByRole('status').textContent).toBe('Drawing your poster…');
  });

  // Leaving a shape before it settles must not bring the previous shape's
  // outcome back when the user returns to it: the img remounts and refetches,
  // so the earlier result describes an attempt that is no longer on screen.
  it('redraws rather than replaying the last outcome when a shape is revisited', () => {
    mount();
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('status').textContent).toContain(
      "Couldn't draw the poster",
    );

    // Square never settles — the user switches away while it is still drawing.
    fireEvent.click(screen.getByRole('button', { name: 'Square' }));
    fireEvent.click(screen.getByRole('button', { name: 'Story' }));

    expect(screen.getByRole('status').textContent).toBe('Drawing your poster…');
  });

  it('repoints the preview and the download when the shape changes', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Square' }));
    expect(screen.getByRole('img').getAttribute('src')).toBe(
      `/share/${EVENT_ID}/square?theme=jade`,
    );
    expect(
      screen.getByRole('link', { name: 'Save image' }).getAttribute('href'),
    ).toBe(`/share/${EVENT_ID}/square?theme=jade`);
  });

  // The route defaults the theme when the query omits it, so a sheet that
  // forgets to send it renders every user's card in the same tint while every
  // other assertion here still passes.
  it('renders the poster in the theme the app is currently wearing', () => {
    mount();
    expect(screen.getByRole('img').getAttribute('src')).toContain('theme=jade');
  });

  it('signs the poster when the sharer has a handle', () => {
    mount({ handle: '@hugh' });
    expect(screen.getByRole('img').getAttribute('src')).toContain('by=%40hugh');
  });

  it('offers a downloadable file name', () => {
    mount();
    expect(
      screen.getByRole('link', { name: 'Save image' }).getAttribute('download'),
    ).toBe('snakebite-revival-bluebird-theater.png');
  });

  it('hides the system share tile where the platform has no share API', () => {
    mount();
    expect(screen.queryByRole('button', { name: 'Share…' })).toBeNull();
  });

  it('offers the system share tile where the platform supports it', async () => {
    const share = vi.fn(async (): Promise<void> => undefined);
    const capabilities: ShareCapabilities = { share };
    mount({ capabilities });
    fireEvent.click(screen.getByRole('button', { name: 'Share…' }));
    await waitFor(() => expect(share).toHaveBeenCalled());
  });

  // #1446's lesson: an await before `navigator.share` spends the click's
  // transient activation, so the first share works and the next is refused.
  it('calls share inside the click itself, before any await', () => {
    const share = vi.fn(async (_data: ShareData): Promise<void> => undefined);
    mount({ capabilities: { share } });
    fireEvent.click(screen.getByRole('button', { name: 'Share…' }));
    expect(share).toHaveBeenCalledTimes(1);
  });

  describe('the pre-fetched poster file', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    // Resolves only for the shapes listed; any other shape stays in flight.
    const stubFetch = (ready: string[]) => {
      const fetchMock = vi.fn((url: string) =>
        ready.some((shape) => url.includes(`/${shape}`))
          ? Promise.resolve({
              ok: true,
              blob: async () => new Blob([new Uint8Array([0x89])]),
            })
          : new Promise(() => {}),
      );
      vi.stubGlobal('fetch', fetchMock);
      return fetchMock;
    };
    const flush = () =>
      act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

    it('hands the PNG fetched ahead of the click to the OS sheet', async () => {
      const fetchMock = stubFetch(['story']);
      const share = vi.fn(async (_data: ShareData): Promise<void> => undefined);
      mount({ capabilities: { share, canShare: () => true } });
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      await flush();
      fireEvent.click(screen.getByRole('button', { name: 'Share…' }));
      expect(share).toHaveBeenCalledTimes(1);
      expect(share.mock.calls[0]?.[0]?.files).toHaveLength(1);
    });

    it("never hands over another shape's file", async () => {
      stubFetch(['story']);
      const share = vi.fn(async (_data: ShareData): Promise<void> => undefined);
      mount({ capabilities: { share, canShare: () => true } });
      await flush();
      fireEvent.click(screen.getByRole('button', { name: 'Square' }));
      fireEvent.click(screen.getByRole('button', { name: 'Share…' }));
      expect(share).toHaveBeenCalledTimes(1);
      expect(share.mock.calls[0]?.[0]?.files).toBeUndefined();
    });

    it('skips the fetch where the platform cannot take a file', () => {
      const fetchMock = stubFetch(['story']);
      mount({ capabilities: { share: async () => undefined } });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  // jsdom does no layout, so the 44px targets are pinned on their classes:
  // Save image and Copy link draw 38px with a 1px border, and an ::after 4px
  // past their 36px padding box on each side makes the hit area 44px.
  it('gives every press a 44px hit area', () => {
    mount({ capabilities: { share: async () => undefined } });
    for (const press of [
      screen.getByRole('link', { name: 'Save image' }),
      screen.getByRole('button', { name: 'Copy link' }),
    ]) {
      const classes = press.className.split(/\s+/);
      expect(classes).toEqual(
        expect.arrayContaining([
          'relative',
          'h-[38px]',
          'border',
          'after:absolute',
          'after:-inset-y-[4px]',
          'after:inset-x-0',
          "after:content-['']",
        ]),
      );
    }
    expect(
      screen.getByRole('button', { name: 'Share…' }).className.split(/\s+/),
    ).toContain('h-11');
    expect(
      screen.getByRole('button', { name: 'Close' }).className.split(/\s+/),
    ).toEqual(expect.arrayContaining(['h-11', 'w-11']));
  });

  describe('as the B+ boards draw it', () => {
    it('heads the sheet with the SHARE THIS SHOW eyebrow and a labelled ×', () => {
      mount();
      const dialog = screen.getByRole('dialog');
      expect(
        within(dialog).getAllByText('Share this show').length,
      ).toBeGreaterThanOrEqual(1);
      const close = screen.getByRole('button', { name: 'Close' });
      expect(document.activeElement).toBe(close);
    });

    it('frames the preview in the signal ring', () => {
      mount();
      const ring = screen.getByTestId('share-preview-ring');
      expect(ring.contains(screen.getByRole('img'))).toBe(true);
    });

    it('labels the shapes SHAPE and draws each tile with its outline glyph', () => {
      mount();
      const group = screen.getByRole('group', { name: 'Shape' });
      for (const [shape, label] of [
        ['story', 'Story'],
        ['square', 'Square'],
        ['link', 'Wide'],
      ] as const) {
        const tile = within(group).getByRole('button', { name: label });
        expect(tile.querySelector(`svg[data-glyph="${shape}"]`)).not.toBeNull();
      }
      expect(
        within(group)
          .getByRole('button', { name: 'Story' })
          .getAttribute('aria-pressed'),
      ).toBe('true');
    });

    it('marks the picked shape and only that one', () => {
      mount();
      fireEvent.click(screen.getByRole('button', { name: 'Wide' }));
      expect(
        screen
          .getByRole('button', { name: 'Wide' })
          .getAttribute('aria-pressed'),
      ).toBe('true');
      expect(
        screen
          .getByRole('button', { name: 'Story' })
          .getAttribute('aria-pressed'),
      ).toBe('false');
      expect(screen.getByRole('img').getAttribute('src')).toBe(
        `/share/${EVENT_ID}/link?theme=jade`,
      );
    });

    it('leads with Share… and its icon, then Save image and Copy link side by side', () => {
      mount({ capabilities: { share: async () => undefined } });
      const share = screen.getByRole('button', { name: 'Share…' });
      expect(share.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      const save = screen.getByRole('link', { name: 'Save image' });
      const copy = screen.getByRole('button', { name: 'Copy link' });
      expect(save.parentElement).toBe(copy.parentElement);
      expect(save.parentElement?.className).toContain('flex');
      expect(save.parentElement?.className).not.toContain('flex-col');
    });
  });

  it('confirms a copied link politely', async () => {
    const writeText = vi.fn(async (): Promise<void> => undefined);
    mount({ capabilities: { clipboard: { writeText } } });
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const live = await screen.findByText('Link copied');
    expect(live.getAttribute('aria-live')).toBe('polite');
  });

  it('says so when there is no clipboard rather than failing silently', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(await screen.findByText(/Couldn't share/)).toBeTruthy();
  });

  it('copies the public mirror, not the protected page', async () => {
    const writeText = vi.fn(async (): Promise<void> => undefined);
    mount({ capabilities: { clipboard: { writeText } } });
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/e/${EVENT_ID}`,
      ),
    );
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <ShareSheet
        open={false}
        onClose={() => {}}
        event={poster}
        handle={null}
        capabilities={{}}
      />,
    );
    expect(container.innerHTML).toBe('');
  });
});
