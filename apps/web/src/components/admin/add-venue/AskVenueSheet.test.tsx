// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const mockAsk = vi.fn<(id: string) => Promise<{ ok: boolean }>>();
vi.mock('@/lib/actions/venues', () => ({
  askVenuePermission: (id: string) => mockAsk(id),
}));

import { AskVenueSheet } from './AskVenueSheet';

const ASK = ADMIN_COPY.addVenue.ask;

const mount = (onClose = vi.fn()) =>
  render(
    <AskVenueSheet
      phone={false}
      venueId="v-1"
      venueName="Dazzle"
      onClose={onClose}
    />,
  );

beforeEach(() => {
  mockAsk.mockReset();
  mockAsk.mockResolvedValue({ ok: true });
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(cleanup);

describe('AskVenueSheet', () => {
  it('starts with a blank To and the existing note', () => {
    mount();
    expect(screen.getByLabelText<HTMLInputElement>(ASK.to).value).toBe('');
    expect(screen.getByTestId('add-venue-ask-note').textContent).toBe(
      ADMIN_COPY.permissionNote.body('Dazzle'),
    );
  });

  it('records the ask when the note is copied', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    mount();
    fireEvent.click(screen.getByText(ASK.copy));
    await waitFor(() => expect(mockAsk).toHaveBeenCalledWith('v-1'));
    expect(writeText).toHaveBeenCalledWith(
      ADMIN_COPY.permissionNote.body('Dazzle'),
    );
    expect(await screen.findByText(ASK.copied)).toBeTruthy();
  });

  it('records nothing when the copy is refused', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) },
    });
    mount();
    fireEvent.click(screen.getByText(ASK.copy));
    await waitFor(() => expect(screen.getByText(ASK.copy)).toBeTruthy());
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('says so when the ask could not be recorded', async () => {
    mockAsk.mockResolvedValue({ ok: false });
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    mount();
    fireEvent.click(screen.getByText(ASK.copy));
    expect(await screen.findByText(ASK.failed)).toBeTruthy();
  });
});
