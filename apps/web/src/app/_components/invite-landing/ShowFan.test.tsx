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
    // Select the cards by their tilt: the genre dots inside them carry their
    // own box-shadow glow, so a bare box-shadow selector would catch those too.
    const shadows = [
      ...container.querySelectorAll<HTMLElement>('[style*="rotate("]'),
    ].map((card) => card.style.boxShadow);
    expect(shadows).toHaveLength(3);
    expect(shadows.filter((value) => value.includes('0 0 0 2px'))).toHaveLength(
      1,
    );
    expect(shadows.filter((value) => value.includes('0 0 0 1px'))).toHaveLength(
      2,
    );
    for (const value of shadows) expect(value).toContain('0 16px 36px');
  });

  it('draws 165x216 cards with the board offsets and drops', () => {
    const { container } = render(
      <ShowFan shows={[show('a', null), show('b', null), show('c', null)]} />,
    );
    const root = container.querySelector<HTMLElement>('div')!;
    // 165px at every phone width, as invite-320 draws it; the fan clips the
    // side cards instead of shrinking them.
    expect(root.className).toContain('[--fan-card-w:165px]');
    expect(root.className).not.toContain('38vw');
    expect(root.style.overflowX).toBe('clip');
    expect(root.className).toContain('[--fan-dx:0.65]');
    const cards = [
      ...container.querySelectorAll<HTMLElement>('[style*="rotate("]'),
    ];
    expect(cards.every((card) => card.style.aspectRatio === '165 / 216')).toBe(
      true,
    );
    const drops = cards
      .map(
        (card) =>
          /translateY\(calc\(var\(--fan-card-w\) \* ([\d.]+)\)\)/.exec(
            card.style.transform,
          )?.[1],
      )
      .map(Number)
      .sort((lo, hi) => lo - hi);
    expect(drops[0]).toBe(0);
    expect(drops[1]).toBeCloseTo(18 / 165, 3);
    expect(drops[2]).toBeCloseTo(21 / 165, 3);
  });

  it('draws the TONIGHT pill fixed #FF7BD4 on #070A1A, no theme token', () => {
    const { container } = render(
      <ShowFan shows={[{ ...show('a', null), tonight: true }]} />,
    );
    const pill = [...container.querySelectorAll<HTMLElement>('span')].find(
      (node) => node.style.borderRadius === '999px',
    );
    expect(pill?.style.background).toContain('rgb(255, 123, 212)');
    expect(pill?.style.color).toBe('rgb(7, 10, 26)');
    expect(pill?.getAttribute('style')).not.toContain('var(--');
  });

  it('keeps the scrim fixed dark, with no theme token', () => {
    const { container } = render(<ShowFan shows={[show('a', null)]} />);
    const scrim = container.querySelector<HTMLElement>('[data-fan-scrim]');
    expect(scrim?.getAttribute('style')).toContain('rgba(5, 6, 15, 0.94)');
    expect(scrim?.getAttribute('style')).not.toContain('var(--');
  });
});
