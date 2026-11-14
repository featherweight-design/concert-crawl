// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { EvidenceSlot } from './EvidenceSlot';
import type { QueueRow } from './needs-you-api';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

const ROW: QueueRow = {
  key: 'show-dropped:e1',
  kind: 'show-dropped',
  title: 'Olive Jones w/ Zoe Stroupe',
  venueId: 'v1',
  venueName: 'Globe Hall',
  fanDate: '2099-01-01',
  watchers: 12,
  answers: [
    {
      slug: 'still_on',
      label: 'Still on',
      notifiesFans: false,
      undoable: true,
      suggested: true,
    },
    {
      slug: 'postponed',
      label: 'Postponed',
      notifiesFans: true,
      undoable: false,
      suggested: false,
    },
  ],
  evidence: [],
} as unknown as QueueRow;

const phone = (on: boolean) => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: on,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

const open = (row: QueueRow = ROW, busy = false) => {
  const handlers = {
    onClose: vi.fn(),
    onAnswer: vi.fn(),
    onSnooze: vi.fn(),
    onNotUseful: vi.fn(),
  };
  render(
    <EvidenceSlot
      row={row}
      today="2026-11-12"
      ranksFirst
      busy={busy}
      {...handlers}
    />,
  );
  return handlers;
};

beforeEach(() => {
  pushMock.mockClear();
  phone(true);
});
afterEach(cleanup);

describe('the phone item page', () => {
  it('opens as a full page with a back row, not a docked panel', () => {
    const { onClose } = open();
    expect(screen.getByTestId('phone-item-page')).toBeInTheDocument();
    expect(screen.queryByTestId('side-panel')).toBeNull();
    fireEvent.click(screen.getByTestId('phone-item-back'));
    expect(onClose).toHaveBeenCalled();
  });

  it('settles focus on the page, not on the back link, so no ring shows on load', () => {
    open();
    expect(screen.getByTestId('phone-item-page')).toHaveFocus();
  });

  it('pins the answers to the footer and still answers through the card', () => {
    const { onAnswer } = open();
    const footer = screen.getByTestId('phone-item-footer');
    const lead = within(footer).getByRole('button', { name: 'Still on' });
    expect(
      within(footer).getByRole('button', { name: 'Postponed' }),
    ).toBeTruthy();
    fireEvent.click(lead);
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'still_on' }),
    );
    // Not drawn twice: the body keeps no answer buttons.
    expect(screen.getAllByRole('button', { name: 'Still on' })).toHaveLength(1);
  });

  it('keeps the answers inside the docked panel on desktop', () => {
    phone(false);
    open();
    expect(screen.queryByTestId('phone-item-page')).toBeNull();
    expect(screen.getByTestId('side-panel')).toBeInTheDocument();
  });

  it('opens the ⋯ sheet, snoozes from it, and offers the venue page', () => {
    const { onSnooze } = open();
    fireEvent.click(screen.getByTestId('phone-item-more'));
    const sheet = screen.getByTestId('admin-sheet');
    expect(within(sheet).getByText('Olive Jones')).toBeInTheDocument();
    expect(
      within(sheet).getByText('The venue page, on its Runs tab.'),
    ).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'Close' })).toBeTruthy();
    fireEvent.click(
      within(sheet).getByRole('menuitem', { name: /Open Globe Hall/ }),
    );
    expect(pushMock).toHaveBeenCalledWith('/admin/venues/v1?tab=runs');

    fireEvent.click(screen.getByTestId('phone-item-more'));
    fireEvent.click(
      within(screen.getByTestId('admin-sheet')).getByRole('menuitem', {
        name: /Snooze 1 day/,
      }),
    );
    expect(onSnooze).toHaveBeenCalledWith(
      expect.stringMatching(/T08:00:00-0[67]:00$/),
    );
  });

  it('holds the back row and ⋯ still while an answer is in flight', () => {
    open(ROW, true);
    expect(screen.getByTestId('phone-item-back')).toBeDisabled();
    expect(screen.getByTestId('phone-item-more')).toBeDisabled();
  });

  it('leaves out the venue row and Not useful for an item with no venue', () => {
    open({ ...ROW, venueId: null, venueName: null } as QueueRow);
    fireEvent.click(screen.getByTestId('phone-item-more'));
    const sheet = screen.getByTestId('admin-sheet');
    expect(within(sheet).queryByText(/Open /)).toBeNull();
    expect(within(sheet).queryByText('Not useful')).toBeNull();
  });
});
