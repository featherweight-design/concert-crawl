// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { GoingNudge } from './GoingNudge';
import { GOING_COPY } from './definitions/copy';
import { stampAccentFor, stampInkFor } from '@/components/consumer/venue-stamp';

afterEach(cleanup);

// Far enough out that the label is the "In N days" branch and never shifts as
// the suite's real clock advances.
const SHOW = {
  artist: 'Wednesday',
  date: '2099-01-05',
  venueSlug: 'mission-ballroom',
  venueName: 'Mission Ballroom',
};

const renderNudge = () => {
  const onYes = vi.fn();
  const onDismiss = vi.fn();
  render(<GoingNudge show={SHOW} onYes={onYes} onDismiss={onDismiss} />);
  return { onYes, onDismiss };
};

describe('GoingNudge', () => {
  it('asks the question with the support line', () => {
    renderNudge();
    expect(screen.getByText(GOING_COPY.nudge.heading)).toBeInTheDocument();
    expect(screen.getByText(GOING_COPY.nudge.support)).toBeInTheDocument();
  });

  it('announces itself politely, since it appears without user action', () => {
    renderNudge();
    const banner = screen.getByRole('status');
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });

  // Two actions, not three: the dismiss X is the only way to say no, so there
  // is no "Not me" twin beside the commitment.
  it('offers only the commitment and the dismiss', () => {
    renderNudge();
    expect(screen.getAllByRole('button').map((btn) => btn.textContent)).toEqual(
      [GOING_COPY.nudge.yes, ''],
    );
  });

  it('reports a commitment', () => {
    const { onYes, onDismiss } = renderNudge();
    fireEvent.click(screen.getByText(GOING_COPY.nudge.yes));
    expect(onYes).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('reports a dismiss from the labelled close control', () => {
    const { onDismiss, onYes } = renderNudge();
    fireEvent.click(
      screen.getByRole('button', { name: GOING_COPY.nudge.dismiss }),
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onYes).not.toHaveBeenCalled();
  });

  it('labels the close control without a native title tooltip', () => {
    renderNudge();
    const dismiss = screen.getByRole('button', {
      name: GOING_COPY.nudge.dismiss,
    });
    expect(dismiss.hasAttribute('title')).toBe(false);
  });

  it('carries the focus-ring class on every action, since all:unset strips it', () => {
    renderNudge();
    for (const btn of screen.getAllByRole('button')) {
      expect(btn.classList.contains('going-nudge-action')).toBe(true);
    }
  });

  it('counts the days until the show', () => {
    renderNudge();
    expect(screen.getByRole('status').textContent).toMatch(/In \d+ days\./);
  });

  // Addendum 2 item 5: the heading is "Going to this show?", followed by the
  // "In N days." line. "Going? In N days." was README shorthand, not copy.
  it('reads "Going to this show?" then the day count', () => {
    renderNudge();
    const line = screen.getByTestId('going-nudge-line');
    expect(GOING_COPY.nudge.heading).toBe('Going to this show?');
    expect(line.textContent).toMatch(/^Going to this show\? In \d+ days\.$/);
    expect(screen.getByTestId('going-nudge-days').textContent).toMatch(
      /^In \d+ days\.$/,
    );
  });

  // Nothing truncates the heading or the day count.
  it('never truncates the heading or the day count', () => {
    renderNudge();
    const line = screen.getByTestId('going-nudge-line');
    expect(line.querySelector('.truncate')).toBeNull();
    expect(line.style.whiteSpace).not.toBe('nowrap');
  });

  // B+ rule 4: the upcoming night shows the dashed stamp it will become.
  it('leads with the dashed venue stamp, not a ticket stub', () => {
    renderNudge();
    const stamp = screen
      .getByTestId('going-nudge-stamp')
      .querySelector('[data-venue-stamp]');
    expect(stamp?.getAttribute('data-venue-stamp')).toBe('dashed');
    expect(
      screen
        .getByTestId('going-nudge-stamp')
        .querySelector('[data-venue-glyph]'),
    ).toHaveAttribute('data-venue-glyph', 'mission');
  });

  // Rule 4: "Yes, going" is filled with the stamp's ink, not the raw accent.
  it('fills "Yes, going" with the dashed stamp\'s own ink', () => {
    renderNudge();
    const ink = stampInkFor(stampAccentFor(SHOW.artist));
    const yes = screen.getByRole('button', { name: GOING_COPY.nudge.yes });
    expect(yes.getAttribute('style')).toContain('color-mix(in oklch');
    expect(yes.getAttribute('style')).toContain('50%');
    expect(ink).toContain(stampAccentFor(SHOW.artist));
  });
});
