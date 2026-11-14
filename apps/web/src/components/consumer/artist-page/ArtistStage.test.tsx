// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  ARTIST_CARD_TILT,
  ArtistBackdrop,
  ArtistStage,
  ArtistStageShell,
  STARBURST_OPACITY,
  artistCardFrame,
  artistRing,
} from './ArtistStage';
import { NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';

afterEach(cleanup);

describe('ArtistStage', () => {
  it('tilts the card and rings it in the genre color', () => {
    render(
      <ArtistStage
        name="TOKiMONSTA"
        photoUrl={null}
        ring="var(--genre-electronic)"
      >
        <h1>TOKiMONSTA</h1>
      </ArtistStage>,
    );
    const card = screen.getByTestId('stage-card');
    expect(card.style.transform).toBe(`rotate(${ARTIST_CARD_TILT}deg)`);
    expect(card.style.boxShadow).toContain('1.25px var(--genre-electronic)');
    expect(card.style.boxShadow).toContain('0 0 24px');
  });

  // Addendum-2 item 23: an ungenred artist gets a neutral ring and no glow.
  // The loading skeleton frames itself the same way (`artistCardFrame`).
  it('drops the glow and the shadow for an ungenred artist, keeping the ring', () => {
    render(
      <ArtistStage name="Nobody" photoUrl={null} ring={NEUTRAL_GENRE_COLOR}>
        <h1>Nobody</h1>
      </ArtistStage>,
    );
    const shadow = screen.getByTestId('stage-card').style.boxShadow;
    expect(shadow).toContain(`1.25px ${NEUTRAL_GENRE_COLOR}`);
    expect(shadow).not.toContain('24px');
    expect(shadow).not.toContain('36px');
    expect(artistRing(NEUTRAL_GENRE_COLOR)).toBe(
      `0 0 0 1.25px ${NEUTRAL_GENRE_COLOR}`,
    );
    expect(artistCardFrame(NEUTRAL_GENRE_COLOR).boxShadow).toBe(
      `0 0 0 1.25px ${NEUTRAL_GENRE_COLOR}`,
    );
  });

  it('draws the starburst at 8%, behind the card, desktop only', () => {
    render(
      <ArtistStage name="Puma Blue" photoUrl={null} ring="var(--genre-soul)">
        <h1>Puma Blue</h1>
      </ArtistStage>,
    );
    const burst = screen.getByTestId('stage-starburst');
    expect(STARBURST_OPACITY).toBe(0.08);
    expect(burst.style.opacity).toBe('0.08');
    expect(burst.className).toContain('hidden');
    expect(burst.className).toContain('lg:block');
    expect(burst.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps the aside off mobile, so the follow can never render twice', () => {
    render(
      <ArtistStage
        name="Puma Blue"
        photoUrl={null}
        ring="var(--genre-soul)"
        aside={<span data-testid="aside" />}
      >
        <h1>Puma Blue</h1>
      </ArtistStage>,
    );
    const wrapper = screen.getByTestId('aside').parentElement;
    expect(wrapper?.className).toContain('hidden');
    expect(wrapper?.className).toContain('lg:block');
  });

  it('blurs the portrait into the backdrop, decoratively', () => {
    render(
      <ArtistStage
        name="Puma Blue"
        photoUrl="https://i.example.com/puma.jpg"
        ring="var(--genre-soul)"
      >
        <h1>Puma Blue</h1>
      </ArtistStage>,
    );
    const backdrop = screen.getByTestId('stage-backdrop');
    expect(backdrop.getAttribute('aria-hidden')).toBe('true');
    expect(backdrop.querySelector('img')).not.toBeNull();
  });
});

describe('ArtistStageShell', () => {
  it('draws the wash alone for the skeleton, with no starburst', () => {
    render(
      <ArtistStageShell backdrop={<ArtistBackdrop />} card={<div />}>
        <span />
      </ArtistStageShell>,
    );
    expect(
      screen.getByTestId('stage-backdrop').querySelector('img'),
    ).toBeNull();
    expect(screen.queryByTestId('stage-starburst')).toBeNull();
  });
});
