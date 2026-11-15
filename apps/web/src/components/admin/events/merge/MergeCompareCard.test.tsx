// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CRAWLED, MANUAL } from './merge-fixtures';
import { MergeCompareCard } from './MergeCompareCard';

afterEach(cleanup);

describe('MergeCompareCard', () => {
  it('shows the rows the board draws', () => {
    render(
      <MergeCompareCard
        listing={CRAWLED}
        which="first"
        kept
        onKeep={vi.fn()}
        showVenueDay={false}
      />,
    );
    const card = screen.getByRole('radio');
    expect(card).toBeChecked();
    expect(card).toHaveTextContent('First listing');
    expect(card).toHaveTextContent('Keep');
    expect(card).toHaveTextContent('Clipse & J.I.D');
    expect(card).toHaveTextContent('the crawl');
    expect(card).toHaveTextContent('$65–$495');
    expect(card).toHaveTextContent('Reports');
    expect(card).toHaveTextContent('none');
    expect(card).not.toHaveTextContent('Venue');
  });

  it('adds Venue and Day rows when the listings differ (A3)', () => {
    render(
      <MergeCompareCard
        listing={MANUAL}
        which="second"
        kept={false}
        onKeep={vi.fn()}
        showVenueDay
      />,
    );
    const card = screen.getByRole('radio');
    expect(card).not.toBeChecked();
    expect(card).toHaveTextContent('Venue');
    expect(card).toHaveTextContent('Red Rocks');
    expect(card).toHaveTextContent('Thu Nov 12');
    expect(card).toHaveTextContent('1 sold-out report');
    expect(card).toHaveTextContent('added by hand');
    expect(card).toHaveTextContent('no price');
  });

  it('moves KEEP when tapped, and not while disabled', () => {
    const onKeep = vi.fn();
    const { rerender } = render(
      <MergeCompareCard
        listing={MANUAL}
        which="second"
        kept={false}
        onKeep={onKeep}
        showVenueDay={false}
      />,
    );
    fireEvent.click(screen.getByRole('radio'));
    expect(onKeep).toHaveBeenCalledTimes(1);
    rerender(
      <MergeCompareCard
        listing={MANUAL}
        which="second"
        kept={false}
        onKeep={onKeep}
        showVenueDay={false}
        disabled
      />,
    );
    fireEvent.click(screen.getByRole('radio'));
    expect(onKeep).toHaveBeenCalledTimes(1);
  });

  it('names the kept card to a screen reader', () => {
    render(
      <MergeCompareCard
        listing={CRAWLED}
        which="first"
        kept
        onKeep={vi.fn()}
        showVenueDay={false}
      />,
    );
    expect(
      screen.getByRole('radio', {
        name: 'First listing: Clipse & J.I.D, kept',
      }),
    ).toBeInTheDocument();
  });
});
