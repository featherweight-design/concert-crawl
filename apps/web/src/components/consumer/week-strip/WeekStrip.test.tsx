// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MAX_DAY_DOTS, WeekStrip, type WeekStripDay } from './WeekStrip';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

// jsdom + Vitest do not ship the @testing-library/jest-dom matchers in this
// repo, so these tests read raw DOM properties instead of jest-dom helpers.

const days: WeekStripDay[] = [
  { date: '2026-04-27', label: 'Mon', dayOfMonth: '27', hasEvents: true },
  { date: '2026-04-28', label: 'Tue', dayOfMonth: '28', hasEvents: false },
];

describe('WeekStrip accessible day names', () => {
  it('appends the shows cue to the aria-label when a day has events', () => {
    const onDateSelect = vi.fn();
    render(
      <WeekStrip
        days={days}
        selectedDate="2026-04-28"
        today="2026-04-27"
        onDateSelect={onDateSelect}
      />,
    );
    expect(
      screen.getByRole('button', {
        name: `Monday, Apr 27, ${CONSUMER_COPY.weekStripDayShows}`,
      }),
    ).toBeTruthy();
  });

  it('omits the shows cue when a day has no events', () => {
    const onDateSelect = vi.fn();
    render(
      <WeekStrip
        days={days}
        selectedDate="2026-04-28"
        today="2026-04-27"
        onDateSelect={onDateSelect}
      />,
    );
    const noShows = screen.getByRole('button', { name: 'Tuesday, Apr 28' });
    expect(noShows.getAttribute('aria-label')).toBe('Tuesday, Apr 28');
    fireEvent.click(noShows);
    expect(onDateSelect).toHaveBeenCalledWith('2026-04-28');
  });

  it('labels the link variant when onDateSelect is omitted', () => {
    render(
      <WeekStrip
        days={days}
        selectedDate="2026-04-28"
        today="2026-04-27"
        buildHref={(date) => `/events?selectedDate=${date}`}
      />,
    );
    expect(
      screen.getByRole('link', {
        name: `Monday, Apr 27, ${CONSUMER_COPY.weekStripDayShows}`,
      }),
    ).toBeTruthy();
  });
});

describe('WeekStrip genre dots', () => {
  const week: WeekStripDay[] = [
    { date: '2026-11-09', label: 'Mon', dayOfMonth: '9', hasEvents: true },
    { date: '2026-11-10', label: 'Tue', dayOfMonth: '10', hasEvents: true },
    { date: '2026-11-11', label: 'Wed', dayOfMonth: '11', hasEvents: false },
  ];

  const dotsOf = (name: RegExp) =>
    screen
      .getByRole('button', { name })
      .querySelectorAll('[data-testid="day-dots"] > span');

  it('draws one dot per genre color, capped at four', () => {
    const genres = new Map<string, string[]>([
      [
        '2026-11-09',
        [
          'var(--genre-rock)',
          'var(--genre-pop)',
          'var(--genre-folk)',
          'var(--genre-jazz)',
          'var(--genre-metal)',
        ],
      ],
    ]);
    render(
      <WeekStrip
        days={week}
        selectedDate="2026-11-11"
        today="2026-11-09"
        dayGenres={genres}
        onDateSelect={vi.fn()}
      />,
    );
    const dots = dotsOf(/Monday, Nov 9/);
    expect(dots).toHaveLength(MAX_DAY_DOTS);
    expect(dots[0]?.getAttribute('style')).toContain('var(--genre-rock)');
  });

  it('falls back to one signal dot when a day has shows but no genres', () => {
    render(
      <WeekStrip
        days={week}
        selectedDate="2026-11-11"
        today="2026-11-09"
        dayGenres={new Map()}
        onDateSelect={vi.fn()}
      />,
    );
    const dots = dotsOf(/Tuesday, Nov 10/);
    expect(dots).toHaveLength(1);
    expect(dots[0]?.getAttribute('style')).toContain('var(--signal)');
    expect(dotsOf(/Wednesday, Nov 11/)).toHaveLength(0);
  });

  it('outlines today and fills the selected day with the gradient', () => {
    render(
      <WeekStrip
        days={week}
        selectedDate="2026-11-10"
        today="2026-11-09"
        onDateSelect={vi.fn()}
      />,
    );
    const today = screen.getByRole('button', { name: /Monday, Nov 9/ });
    expect(today.getAttribute('data-today')).toBe('true');
    expect(today.getAttribute('style')).toContain('var(--signal)');
    const selected = screen.getByRole('button', { name: /Tuesday, Nov 10/ });
    expect(selected.getAttribute('aria-current')).toBe('date');
    expect(selected.getAttribute('style')).toContain('linear-gradient');
  });
});
