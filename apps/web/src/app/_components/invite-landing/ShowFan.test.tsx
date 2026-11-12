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
  showTime: '8:00 PM',
  showTimeShort: '8 PM',
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

  it('tilts the cards -9, -2 and 8 degrees', () => {
    const { container } = render(
      <ShowFan shows={[show('a', null), show('b', null), show('c', null)]} />,
    );
    const cards = [
      ...container.querySelectorAll<HTMLElement>('[style*="rotate("]'),
    ];
    const rotations = cards.map(
      (card) => /rotate\((-?\d+)deg\)/.exec(card.style.transform)?.[1],
    );
    expect(rotations.sort()).toEqual(['-2', '-9', '8']);
  });

  it('rings the centre card 2px and the sides 1px, with a genre glow', () => {
    const { container } = render(
      <ShowFan shows={[show('a', null), show('b', null), show('c', null)]} />,
    );
    const shadows = [
      ...container.querySelectorAll<HTMLElement>('[style*="box-shadow"]'),
    ].map((card) => card.style.boxShadow);
    expect(shadows.filter((value) => value.includes('0 0 0 2px'))).toHaveLength(
      1,
    );
    expect(shadows.filter((value) => value.includes('0 0 0 1px'))).toHaveLength(
      2,
    );
    for (const value of shadows) expect(value).toContain('0 16px 36px');
  });

  it('keeps the scrim fixed dark, with no theme token', () => {
    const { container } = render(<ShowFan shows={[show('a', null)]} />);
    const scrim = container.querySelector<HTMLElement>('[data-fan-scrim]');
    expect(scrim?.getAttribute('style')).toContain('rgba(5, 6, 15, 0.94)');
    expect(scrim?.getAttribute('style')).not.toContain('var(--');
  });
});
