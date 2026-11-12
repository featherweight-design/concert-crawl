// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { EventStatus } from '@concert-crawl/types';

vi.mock('@/components/consumer/event-image', () => ({
  EventImage: ({
    src,
    artistPhotoUrl,
  }: {
    src: string | null;
    artistPhotoUrl?: string | null;
  }) => (
    <div
      data-testid="event-image"
      data-src={src ?? ''}
      data-artist-photo-url={artistPhotoUrl ?? ''}
    />
  ),
}));

import {
  EventStage,
  StageBackdrop,
  STAGE_CARD_TILT,
  THEME_WASH,
} from '../EventStage';

afterEach(cleanup);

const renderStage = (
  overrides: Partial<{
    leadGenre: string | null;
    countdown: string | null;
    status: EventStatus;
  }> = {},
) =>
  render(
    <EventStage
      name="Tokimonsta"
      status={overrides.status ?? 'upcoming'}
      leadGenre={
        'leadGenre' in overrides ? (overrides.leadGenre ?? null) : 'electronic'
      }
      countdown={
        'countdown' in overrides ? (overrides.countdown ?? null) : '4 days away'
      }
      surface="event"
      artworkUrl="https://example.test/art.jpg"
      photoUrl="https://example.test/photo.jpg"
      back={<button type="button">Back</button>}
      actions={<button type="button">Share</button>}
    >
      <h1>Tokimonsta</h1>
    </EventStage>,
  );

describe('<EventStage />', () => {
  it('keeps the hero-band test id the acceptance inventory waits on', () => {
    renderStage();
    expect(screen.getByTestId('hero-band')).toBeDefined();
  });

  it('tilts the card and rings it in the lead genre, not the theme', () => {
    renderStage();
    const card = screen.getByTestId('stage-card');
    expect(card.style.transform).toBe(`rotate(${STAGE_CARD_TILT}deg)`);
    expect(card.style.boxShadow).toContain('2px var(--genre-electronic)');
  });

  it('draws the ring with its translucent halo band, tilted -2.5 and radius 18', () => {
    renderStage();
    const card = screen.getByTestId('stage-card');
    expect(STAGE_CARD_TILT).toBe(-2.5);
    expect(card.style.borderRadius).toBe('18px');
    // The 7px halo at 16% and the wide soft shadow at 40%.
    expect(card.style.boxShadow).toContain('0 0 0 7px');
    expect(card.style.boxShadow).toContain('16%');
    expect(card.style.boxShadow).toContain('0 30px 70px');
  });

  it('desaturates the backdrop and the card of a cancelled show only', () => {
    const { unmount } = renderStage({ status: 'cancelled' });
    expect(screen.getByTestId('stage-backdrop').style.filter).toBe(
      'grayscale(.85)',
    );
    expect(screen.getByTestId('stage-card').style.filter).toBe(
      'grayscale(.85)',
    );
    unmount();

    renderStage({ status: 'postponed' });
    expect(screen.getByTestId('stage-backdrop').style.filter).toBe('');
    expect(screen.getByTestId('stage-card').style.filter).toBe('');
  });

  it('falls back to the neutral ring for an ungenred show', () => {
    renderStage({ leadGenre: null });
    expect(screen.getByTestId('stage-card').style.boxShadow).toContain(
      '2px var(--border-strong)',
    );
  });

  it('draws the countdown pill with the gradient edge and a glowing dot', () => {
    renderStage({ countdown: '4 days away' });
    const pill = screen.getByTestId('stage-countdown');
    expect(pill.style.border).toContain('transparent');
    expect(pill.style.background).toContain('border-box');
    expect(pill.style.background).toContain('var(--accent)');
  });

  it('washes the backdrop in the theme pair, hidden from assistive tech', () => {
    renderStage();
    const backdrop = screen.getByTestId('stage-backdrop');
    expect(backdrop.getAttribute('aria-hidden')).toBe('true');
    // Rule 6: the page wash is the theme's pair, never the genre's.
    expect(THEME_WASH).toContain('var(--signal)');
    expect(THEME_WASH).toContain('var(--accent)');
    expect(THEME_WASH).not.toContain('--genre-');
    // The blurred photo resolves the same source chain as the card.
    const images = screen.getAllByTestId('event-image');
    expect(images).toHaveLength(2);
    for (const image of images) {
      expect(image.getAttribute('data-src')).toBe(
        'https://example.test/art.jpg',
      );
    }
  });

  it('shows the countdown when there is one, and nothing when there is not', () => {
    renderStage();
    expect(screen.getByTestId('stage-countdown').textContent).toBe(
      '4 days away',
    );
    cleanup();
    renderStage({ countdown: null });
    expect(screen.queryByTestId('stage-countdown')).toBeNull();
  });

  it('renders the back and share controls and the title column', () => {
    renderStage();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Share' })).toBeDefined();
    expect(
      screen.getByTestId('stage-column').querySelector('h1')?.textContent,
    ).toBe('Tokimonsta');
  });
});

describe('<StageBackdrop /> without art', () => {
  it('draws the wash alone, with no image, for the loading skeleton', () => {
    render(<StageBackdrop />);
    expect(screen.queryByTestId('event-image')).toBeNull();
    expect(
      screen.getByTestId('stage-backdrop').getAttribute('aria-hidden'),
    ).toBe('true');
  });
});
