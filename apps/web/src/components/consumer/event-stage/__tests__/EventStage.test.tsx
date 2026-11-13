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
  stageRing,
} from '../EventStage';
import { NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';

afterEach(cleanup);

const renderStage = (
  overrides: Partial<{
    leadGenre: string | null;
    countdown: string | null;
    status: EventStatus;
    name: string;
  }> = {},
) =>
  render(
    <EventStage
      name={overrides.name ?? 'Tokimonsta'}
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
  it('puts the below-hero content under a compact phone hero (event-nll-m)', () => {
    render(
      <EventStage
        name="The Grouch"
        status="cancelled"
        delistedAt="2026-11-04T10:00:00.000Z"
        leadGenre="hip-hop"
        countdown={null}
        surface="event"
        artworkUrl={null}
        photoUrl={null}
        belowHero={<p>Thu Dec 17</p>}
      >
        <h1>The Grouch</h1>
      </EventStage>,
    );
    const below = screen.getByTestId('stage-below');
    expect(below.className).toContain('sm:hidden');
    expect(below.textContent).toBe('Thu Dec 17');
    expect(screen.getByTestId('hero-band').className).toContain('pb-1.5');
    expect(screen.getByTestId('hero-band').contains(below)).toBe(false);
  });

  it('renders no below-hero block or compact foot without the prop', () => {
    renderStage();
    expect(screen.queryByTestId('stage-below')).toBeNull();
    expect(screen.getByTestId('hero-band').className).toContain('pb-7');
  });

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

  // event-nll-m / event-nll-d: No longer listed is stored as cancelled, but its
  // hero keeps the colour photo, the genre ring and the theme wash.
  it('keeps the colour of a No longer listed hero', () => {
    render(
      <EventStage
        name="The Grouch"
        status="cancelled"
        delistedAt="2026-11-04T09:00:00Z"
        leadGenre="electronic"
        countdown={null}
        surface="event"
        artworkUrl="https://example.test/art.jpg"
        photoUrl="https://example.test/photo.jpg"
      >
        <h1>The Grouch</h1>
      </EventStage>,
    );
    expect(screen.getByTestId('stage-backdrop').style.filter).toBe('');
    const card = screen.getByTestId('stage-card');
    expect(card.style.filter).toBe('');
    expect(card.style.boxShadow).toContain('2px var(--genre-electronic)');
    expect(card.innerHTML).not.toContain('max-sm:grayscale');
  });

  // event_unmarked_m / event_stamped_m: a past night's phone hero wears the
  // venue's ring and rays; no board greys the photo, and event-past-d keeps the
  // colour, so the photo stays in colour at every width.
  it("draws a past night's phone hero in its venue's ring, in colour, with its rays", () => {
    render(
      <EventStage
        name="Culture Wars"
        leadGenre="rock"
        countdown="4 days ago"
        pastVenueSlug="gothic-theatre"
        surface="event"
        artworkUrl={null}
        photoUrl={null}
      >
        <h1>Culture Wars</h1>
      </EventStage>,
    );
    const card = screen.getByTestId('stage-card');
    expect(card.className).toContain(
      'max-sm:[--stage-shadow:var(--past-shadow)]',
    );
    expect(card.style.getPropertyValue('--past-shadow')).toContain('0 0 0 2px');
    expect(card.innerHTML).not.toContain('grayscale');
    // The genre ring is still the default from `sm` up.
    // (Not an inline `--stage-shadow`, which would beat the phone override.)
    expect(card.style.getPropertyValue('--genre-shadow')).toContain(
      '2px var(--genre-rock)',
    );
    expect(card.style.getPropertyValue('--stage-shadow')).toBe('');
  });

  it('keeps an ordinary night on its inline genre ring', () => {
    renderStage();
    const card = screen.getByTestId('stage-card');
    expect(card.className).toBe('');
    expect(card.innerHTML).not.toContain('max-sm:grayscale');
  });

  it('falls back to the neutral ring for an ungenred show', () => {
    renderStage({ leadGenre: null });
    expect(screen.getByTestId('stage-card').style.boxShadow).toContain(
      '2px var(--border-strong)',
    );
  });

  it('drops the halo and the glow for an ungenred show, keeping the ring', () => {
    renderStage({ leadGenre: null });
    const shadow = screen.getByTestId('stage-card').style.boxShadow;
    expect(shadow).toContain('2px var(--border-strong)');
    expect(shadow).not.toContain('7px');
    expect(shadow).not.toContain('70px');
    expect(stageRing(NEUTRAL_GENRE_COLOR)).toBe(
      `0 0 0 2px ${NEUTRAL_GENRE_COLOR}`,
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

describe('<EventStage /> title step-down (addendum 3 rule 2)', () => {
  const head = () => screen.getByTestId('stage-column').className;

  it('holds 38 at 320 for a wrapping name (hero-320-wrap)', () => {
    renderStage({ name: 'Thievery Corporation' });
    expect(head()).toContain('[--stage-head:clamp(38px,11.875vw,44px)]');
  });

  it('steps a long single word down to 30 (hero-320-long-word)', () => {
    renderStage({ name: 'Superorganism' });
    expect(head()).toContain('[--stage-head:clamp(30px,9.375vw,44px)]');
    expect(head()).toContain('sm:[--stage-head:64px]');
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
