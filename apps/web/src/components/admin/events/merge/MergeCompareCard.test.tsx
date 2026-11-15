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
        name="keep"
      />,
    );
    expect(screen.getByRole('radio')).toBeChecked();
    const card = screen.getByTestId('merge-card-first');
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
        name="keep"
      />,
    );
    expect(screen.getByRole('radio')).not.toBeChecked();
    const card = screen.getByTestId('merge-card-second');
    expect(card).toHaveTextContent('Venue');
    expect(card).toHaveTextContent('Red Rocks');
    expect(card).toHaveTextContent('Thu Nov 12');
    expect(card).toHaveTextContent('1 sold-out report');
    expect(card).toHaveTextContent('added by hand');
    expect(card).toHaveTextContent('no price');
  });

  it('moves KEEP when the card is tapped, and not while disabled', () => {
    const onKeep = vi.fn();
    const { rerender } = render(
      <MergeCompareCard
        listing={MANUAL}
        which="second"
        kept={false}
        onKeep={onKeep}
        showVenueDay={false}
        name="keep"
      />,
    );
    // The label is the whole card: tapping its text reaches the radio.
    fireEvent.click(screen.getByTestId('merge-card-second'));
    expect(onKeep).toHaveBeenCalledTimes(1);
    rerender(
      <MergeCompareCard
        listing={MANUAL}
        which="second"
        kept={false}
        onKeep={onKeep}
        showVenueDay={false}
        name="keep"
        disabled
      />,
    );
    fireEvent.click(screen.getByTestId('merge-card-second'));
    expect(onKeep).toHaveBeenCalledTimes(1);
  });

  it('names the card by its rows, so the data behind the choice is read out', () => {
    render(
      <MergeCompareCard
        listing={CRAWLED}
        which="first"
        kept
        onKeep={vi.fn()}
        showVenueDay={false}
        name="keep"
      />,
    );
    expect(
      screen.getByRole('radio', { name: /First listing.*\$65–\$495/s }),
    ).toBeInTheDocument();
  });
});
