// @vitest-environment jsdom

import React from 'react';
import type { ArtistShow } from '@concert-crawl/types';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CONSUMER_COPY } from '../definitions/copy';
import { EVENT_ROW_COPY } from '../event-row/definitions/copy';

import { ARTIST_COPY } from './definitions/copy';
import { UpcomingShows } from './UpcomingShows';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Every row carries the app-wide Watch control, which reaches for Clerk and
// React Query. What matters here is the list, not the control.
vi.mock('@/components/consumer/watch-show-button/WatchShowButton', () => ({
  WatchShowButton: () => <button data-testid="watch-stub" type="button" />,
}));

afterEach(cleanup);

const show = (
  iso: string,
  venue: string,
  price: number | null = null,
  status: ArtistShow['status'] = 'upcoming',
): ArtistShow => ({
  eventId: `${venue}-${iso}`,
  iso,
  showTime: null,
  venue,
  venueSlug: venue.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  city: 'Denver',
  price,
  tourName: null,
  genres: [],
  imageUrl: null,
  status,
});

/** A run card and a one-off row both carry the item marker. */
const items = (container: HTMLElement) =>
  container.querySelectorAll('[data-show-item]');

/** Three runs of three, plus four one-offs: 5 items, 13 shows. */
const thirteenShows = (): ArtistShow[] => [
  show('2026-08-01', 'Venue A'),
  show('2026-08-02', 'Venue A'),
  show('2026-08-03', 'Venue A'),
  show('2026-09-01', 'Venue B'),
  show('2026-09-02', 'Venue B'),
  show('2026-09-03', 'Venue B'),
  show('2026-10-01', 'Venue C'),
  show('2026-10-02', 'Venue C'),
  show('2026-10-03', 'Venue C'),
  show('2026-11-01', 'Solo One'),
  show('2026-11-02', 'Solo Two'),
  show('2026-11-03', 'Solo Three'),
  show('2026-11-04', 'Solo Four'),
];

describe('UpcomingShows', () => {
  it('counts SHOWS in the show-all control while capping ITEMS in the list', () => {
    const { container, getByText, queryByText } = render(
      <UpcomingShows
        photoUrl={null}
        name="The Cold Fronts"
        shows={thirteenShows()}
      />,
    );
    // B+ `09-artist` draws the count beside the title, in shows.
    expect(queryByText(ARTIST_COPY.showCount(13))).not.toBeNull();
    // A run is one item; the label is always in shows.
    expect(items(container)).toHaveLength(5);
    expect(getByText(ARTIST_COPY.showAll(13))).toBeTruthy();
  });

  it('expands and collapses from a keyboard-reachable control', () => {
    const { container, getByRole } = render(
      <UpcomingShows
        photoUrl={null}
        name="The Cold Fronts"
        shows={thirteenShows()}
      />,
    );
    const toggle = getByRole('button', { name: ARTIST_COPY.showAll(13) });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.style.minHeight).toBe('44px');

    toggle.focus();
    fireEvent.click(toggle);
    expect(items(container)).toHaveLength(7);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toBe(ARTIST_COPY.showFewer);
    // Focus never leaves the control that moved the list.
    expect(document.activeElement).toBe(toggle);

    fireEvent.click(toggle);
    expect(items(container)).toHaveLength(5);
  });

  it('omits the toggle when everything already fits', () => {
    // Scoped by name: every row now carries a Watch control, so "no buttons at
    // all" is no longer the same claim as "no show-all toggle".
    const { queryByRole } = render(
      <UpcomingShows
        photoUrl={null}
        name="Wax Harbour"
        shows={[show('2026-08-08', 'Hi-Dive', 15)]}
      />,
    );
    expect(queryByRole('button', { name: ARTIST_COPY.showAll(1) })).toBeNull();
    expect(queryByRole('button', { name: ARTIST_COPY.showFewer })).toBeNull();
  });

  it('links each row to its event and labels the list', () => {
    const { container } = render(
      <UpcomingShows
        photoUrl={null}
        name="Wax Harbour"
        shows={[show('2026-08-08', 'Hi-Dive', 15)]}
      />,
    );
    const section = container.querySelector('section');
    expect(section?.getAttribute('aria-label')).toBe(
      ARTIST_COPY.showsListAria('Wax Harbour'),
    );
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/events/Hi-Dive-2026-08-08');
  });

  it('shows a price when we have one and says tba when we do not', () => {
    const { getByText } = render(
      <UpcomingShows
        photoUrl={null}
        name="Wax Harbour"
        shows={[
          show('2026-08-08', 'Hi-Dive', 15),
          show('2026-09-08', 'Lost Lake', null),
        ]}
      />,
    );
    expect(getByText('$15')).toBeTruthy();
    // The row and the run card beside it now say the same word for an absence.
    expect(getByText(EVENT_ROW_COPY.price.tba)).toBeTruthy();
  });

  it('marks a cancelled show without hiding it', () => {
    const { getByText } = render(
      <UpcomingShows
        photoUrl={null}
        name="Wax Harbour"
        shows={[show('2026-08-08', 'Hi-Dive', 15, 'cancelled')]}
      />,
    );
    expect(getByText(CONSUMER_COPY.cancelledLabel)).toBeTruthy();
    expect(getByText('Hi-Dive')).toBeTruthy();
  });

  it('marks a postponed show', () => {
    const { getByText } = render(
      <UpcomingShows
        photoUrl={null}
        name="Wax Harbour"
        shows={[show('2026-08-08', 'Hi-Dive', 15, 'postponed')]}
      />,
    );
    expect(getByText(CONSUMER_COPY.postponedLabel)).toBeTruthy();
  });

  it('labels a residency as a run and links every night', () => {
    const { getByText, container } = render(
      <UpcomingShows
        photoUrl={null}
        name="The Cold Fronts"
        shows={[
          show('2026-08-05', "Ophelia's", 25),
          show('2026-08-06', "Ophelia's", 25),
          show('2026-08-07', "Ophelia's", 30),
        ]}
      />,
    );
    expect(getByText(ARTIST_COPY.residencyRun(3))).toBeTruthy();
    expect(container.querySelectorAll('a')).toHaveLength(3);
  });

  // B+ `09-artist`: every Upcoming item carries its venue icon, a run's
  // header included, at the single row's size.
  it("gives a run's header the venue icon a single row carries", () => {
    const { container } = render(
      <UpcomingShows
        photoUrl={null}
        name="mike."
        shows={[
          show('2026-08-01', 'Hi-Dive'),
          show('2026-09-05', 'Red Rocks Amphitheatre'),
          show('2026-09-06', 'Red Rocks Amphitheatre'),
          show('2026-09-07', 'Red Rocks Amphitheatre'),
          show('2026-09-08', 'Red Rocks Amphitheatre'),
        ]}
      />,
    );
    const runTile = container.querySelector(
      '[data-testid="artist-run-head"] svg',
    );
    const rowTile = container.querySelector(
      '[data-testid="artist-show-row"] a svg',
    );
    expect(runTile).not.toBeNull();
    expect(rowTile).not.toBeNull();
    expect(runTile?.getAttribute('width')).toBe(rowTile?.getAttribute('width'));
    expect(runTile?.getAttribute('height')).toBe(
      rowTile?.getAttribute('height'),
    );
    // Before the name, as on the single row.
    const head = container.querySelector('[data-testid="artist-run-head"]');
    expect(head?.firstElementChild?.querySelector('svg')).toBe(runTile);
  });

  it('draws every item as a card, with no rules between them', () => {
    const { container } = render(
      <UpcomingShows
        photoUrl={null}
        name="The Cold Fronts"
        shows={[
          show('2026-08-01', 'Solo One'),
          show('2026-08-02', 'Solo Two'),
          show('2026-09-05', "Ophelia's"),
          show('2026-09-06', "Ophelia's"),
          show('2026-09-07', "Ophelia's"),
        ]}
      />,
    );
    expect(container.querySelectorAll('[data-show-divider]')).toHaveLength(0);
    expect(
      container.querySelectorAll('[data-testid="artist-show-row"]'),
    ).toHaveLength(2);
    expect(items(container)).toHaveLength(3);
  });

  it('draws the dashed note under the rows when the page passes one', () => {
    const { container, rerender } = render(
      <UpcomingShows
        photoUrl={null}
        name="Wax Harbour"
        shows={[show('2026-08-08', 'Hi-Dive', 15)]}
        note={ARTIST_COPY.upcomingNote}
      />,
    );
    const note = container.querySelector<HTMLElement>('[data-upcoming-note]');
    expect(note?.textContent).toBe(ARTIST_COPY.upcomingNote);
    expect(note?.style.border).toContain('dashed');

    rerender(
      <UpcomingShows
        photoUrl={null}
        name="Wax Harbour"
        shows={[show('2026-08-08', 'Hi-Dive', 15)]}
      />,
    );
    expect(container.querySelector('[data-upcoming-note]')).toBeNull();
  });
});
