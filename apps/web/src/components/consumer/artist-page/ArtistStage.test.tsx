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
} from './ArtistStage';

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
    expect(burst.className).toContain('md:block');
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
    expect(wrapper?.className).toContain('md:block');
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
