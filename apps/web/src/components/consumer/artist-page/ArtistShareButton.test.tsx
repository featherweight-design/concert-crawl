// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

import { ArtistShareButton, SHARE_STATUS_MS } from './ArtistShareButton';
import { ARTIST_COPY } from './definitions/copy';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/lib/analytics', () => ({ track }));

const URL_FOR = (slug: string) => `${window.location.origin}/artists/${slug}`;

beforeEach(() => track.mockClear());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const tap = () => fireEvent.click(screen.getByTestId('artist-share'));

describe('ArtistShareButton', () => {
  it('is named for screen readers', () => {
    render(
      <ArtistShareButton slug="puma-blue" name="Puma Blue" capabilities={{}} />,
    );
    expect(
      screen.getByRole('button', { name: ARTIST_COPY.shareAria }),
    ).toBeTruthy();
  });

  it('hands the artist page link to the OS sheet, inside the click', () => {
    const share = vi.fn(() => Promise.resolve());
    render(
      <ArtistShareButton
        slug="puma-blue"
        name="Puma Blue"
        capabilities={{ share }}
      />,
    );
    tap();
    // Called synchronously in the handler: an await before it would spend
    // the user activation and the browser would refuse the share.
    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({
      title: 'Puma Blue',
      url: URL_FOR('puma-blue'),
    });
    expect(track).toHaveBeenCalledWith('artist_shared', {
      artistSlug: 'puma-blue',
      destination: 'system',
    });
  });

  it('says nothing when the OS sheet is dismissed', async () => {
    const abort = Object.assign(new Error('dismissed'), { name: 'AbortError' });
    const share = vi.fn(() => Promise.reject(abort));
    render(
      <ArtistShareButton
        slug="puma-blue"
        name="Puma Blue"
        capabilities={{ share }}
      />,
    );
    await act(async () => {
      tap();
    });
    expect(screen.getByTestId('artist-share-status').textContent).toBe('');
  });

  it('says so when the OS share fails', async () => {
    const share = vi.fn(() => Promise.reject(new Error('NotAllowedError')));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ArtistShareButton
        slug="puma-blue"
        name="Puma Blue"
        capabilities={{ share }}
      />,
    );
    await act(async () => {
      tap();
    });
    expect(screen.getByTestId('artist-share-status').textContent).toBe(
      ARTIST_COPY.shareFailed,
    );
    error.mockRestore();
  });

  it('survives a share that throws synchronously', () => {
    const share = vi.fn(() => {
      throw new Error('boom');
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ArtistShareButton
        slug="puma-blue"
        name="Puma Blue"
        capabilities={{ share }}
      />,
    );
    tap();
    expect(screen.getByTestId('artist-share-status').textContent).toBe(
      ARTIST_COPY.shareFailed,
    );
    error.mockRestore();
  });

  it('copies the link where there is no OS sheet, and says so', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    render(
      <ArtistShareButton
        slug="tokimonsta"
        name="TOKiMONSTA"
        capabilities={{ clipboard: { writeText } }}
      />,
    );
    await act(async () => {
      tap();
    });
    expect(writeText).toHaveBeenCalledWith(URL_FOR('tokimonsta'));
    expect(track).toHaveBeenCalledWith('artist_shared', {
      artistSlug: 'tokimonsta',
      destination: 'copy-link',
    });
    expect(screen.getByTestId('artist-share-status').textContent).toBe(
      CONSUMER_COPY.share.copyLinkDone,
    );

    act(() => {
      vi.advanceTimersByTime(SHARE_STATUS_MS);
    });
    expect(screen.getByTestId('artist-share-status').textContent).toBe('');
  });

  it('says it failed when there is neither a sheet nor a clipboard', async () => {
    render(
      <ArtistShareButton slug="puma-blue" name="Puma Blue" capabilities={{}} />,
    );
    await act(async () => {
      tap();
    });
    expect(screen.getByTestId('artist-share-status').textContent).toBe(
      ARTIST_COPY.shareFailed,
    );
  });

  it('encodes the slug into the path', () => {
    const share = vi.fn(() => Promise.resolve());
    render(
      <ArtistShareButton
        slug="sigur rós"
        name="Sigur Rós"
        capabilities={{ share }}
      />,
    );
    tap();
    expect(share).toHaveBeenCalledWith({
      title: 'Sigur Rós',
      url: `${window.location.origin}/artists/sigur%20r%C3%B3s`,
    });
  });
});
