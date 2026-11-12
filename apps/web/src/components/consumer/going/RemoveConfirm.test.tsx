// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { HistoryShow } from '@concert-crawl/types';
import { RemoveConfirm } from './RemoveConfirm';
import { GOING_COPY } from './definitions/copy';

afterEach(cleanup);

const SHOW: HistoryShow = {
  eventId: 'evt-1',
  artist: 'Wednesday',
  artistPhotoUrl: null,
  venueName: 'Larimer Lounge',
  venueSlug: 'larimer-lounge',
  neighborhood: 'RiNo',
  date: '2026-05-14',
  dateLabel: 'Thu, May 14',
  showTime: '8:00 PM',
  priceFinal: null,
  genre: null,
  attendingAt: '2026-05-14T02:00:00.000Z',
  venueCity: 'Denver',
  venueTimezone: 'America/Denver',
  rawShowTime: '20:00:00',
};

const setup = (props: Partial<Parameters<typeof RemoveConfirm>[0]> = {}) => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  render(
    <RemoveConfirm
      open
      onClose={onClose}
      show={SHOW}
      footnote="concerts"
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onClose, onConfirm };
};

describe('RemoveConfirm', () => {
  it('renders nothing while closed', () => {
    setup({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a dialog named by the title', () => {
    setup();
    expect(
      screen.getByRole('dialog', { name: GOING_COPY.remove.title }),
    ).toBeInTheDocument();
  });

  it('draws the eyebrow, body, the night and both buttons', () => {
    setup();
    expect(screen.getByText(GOING_COPY.eyebrow.past)).toBeInTheDocument();
    expect(screen.getByText(GOING_COPY.remove.body)).toBeInTheDocument();
    expect(screen.getByText('Wednesday')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: GOING_COPY.remove.confirm }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: GOING_COPY.remove.keep }),
    ).toBeInTheDocument();
  });

  it('draws the close as the word Cancel, with no X', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(
      screen.getByRole('button', { name: GOING_COPY.remove.cancel }),
    ).toBeInTheDocument();
    expect(dialog.querySelector('button svg')).toBeNull();
  });

  it('shows the night as a preview that goes nowhere when tapped', () => {
    setup();
    expect(screen.getByTestId('history-item-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('history-item')).not.toBeInTheDocument();

    const link = screen.getByRole('link', { hidden: true });
    // fireEvent returns false when a handler called preventDefault.
    expect(fireEvent.click(link)).toBe(false);
    expect(link).toHaveAttribute('tabindex', '-1');
  });

  it('draws the night without its own menu', () => {
    setup();
    expect(screen.queryByTestId('row-menu')).not.toBeInTheDocument();
  });

  it.each([
    ['concerts', GOING_COPY.remove.footnoteConcerts],
    ['show-page', GOING_COPY.remove.footnoteShowPage],
  ] as const)('shows the %s footnote', (footnote, text) => {
    setup({ footnote });
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('confirms through Remove from Concerts', () => {
    const { onConfirm, onClose } = setup();
    fireEvent.click(
      screen.getByRole('button', { name: GOING_COPY.remove.confirm }),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes through Keep it and through Escape without confirming', () => {
    const { onConfirm, onClose } = setup();
    fireEvent.click(
      screen.getByRole('button', { name: GOING_COPY.remove.keep }),
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('reads Removing… and goes inert while a remove is in flight', () => {
    const { onClose } = setup({ pending: true });
    expect(
      screen.getByRole('button', { name: GOING_COPY.remove.busy }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: GOING_COPY.remove.keep }),
    ).toBeDisabled();
    // Escape and Cancel cannot dismiss it either.
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(
      screen.getByRole('button', { name: GOING_COPY.remove.cancel }),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the failure in place with Try again, and Keep it still closes', () => {
    const { onConfirm, onClose } = setup({ failed: true });
    expect(screen.getByRole('alert')).toHaveTextContent(
      GOING_COPY.remove.failed,
    );

    fireEvent.click(
      screen.getByRole('button', { name: GOING_COPY.remove.retry }),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole('button', { name: GOING_COPY.remove.keep }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows no error before a failure', () => {
    setup();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
