// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ShowFan } from './ShowFan';
import type { InviteShow } from './definitions/types';

afterEach(cleanup);

const show = (id: string, imageUrl: string | null): InviteShow => ({
  id,
  artist: `Artist ${id}`,
  venue: 'Venue',
  tonight: false,
  dateShort: 'NOV 13',
  showTime: '8pm',
  genre: 'rock',
  imageUrl,
  artistPhotoUrl: null,
});

describe('ShowFan', () => {
  it('draws a remote venue image as a plain img, never through next/image', () => {
    // next.config allows no remote image hosts, so next/image throws on a
    // CDN URL and took the whole signed-out landing down with it.
    const src =
      'https://s1.ticketm.net/dam/a/270/df3fcb4f-5271-4408-90fc-868a6521b270_TABLET_LANDSCAPE_LARGE_16_9.jpg';
    const { container } = render(<ShowFan shows={[show('a', src)]} />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe(src);
    expect(img?.hasAttribute('srcset')).toBe(false);
  });
});
