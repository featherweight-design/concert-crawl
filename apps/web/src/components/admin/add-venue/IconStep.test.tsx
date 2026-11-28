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

const mockDraft = vi.fn();
vi.mock('@/lib/actions/venues', () => ({
  draftVenueGlyphs: (...args: unknown[]) => mockDraft(...args),
}));

import { IconStep } from './IconStep';
import { useIconDrafts } from './useIconDrafts';

const COPY = ADMIN_COPY.addVenue.icon;
const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4 L20 20"/></svg>';

const Harness = ({ phone = false, capacity = 'Club' }) => {
  const icon = useIconDrafts(capacity);
  return (
    <IconStep
      phone={phone}
      venueId="v-1"
      venueName="Dazzle"
      icon={icon}
      onSkip={() => undefined}
    />
  );
};

beforeEach(() => {
  mockDraft.mockReset();
});
afterEach(cleanup);

describe('IconStep', () => {
  it('drafts, lists the drafts and previews the hero on the guessed setting', async () => {
    mockDraft.mockResolvedValue({
      ok: true,
      data: {
        drafts: [{ label: 'Glass', source: { kind: 'name' }, svg: SVG }],
        hidden: { fill: 0, offGrid: 0, invalid: 0, total: 1 },
        asked: 1,
      },
    });
    render(<Harness />);
    fireEvent.click(screen.getByTestId('add-venue-icon-draft-button'));
    await waitFor(() =>
      expect(screen.getAllByTestId('add-venue-icon-draft')).toHaveLength(1),
    );
    expect(
      screen
        .getByTestId('add-venue-icon-setting-club')
        .getAttribute('aria-checked'),
    ).toBe('true');
    expect(screen.getByTestId('add-venue-icon-hero')).toBeTruthy();
    fireEvent.click(screen.getByTestId('add-venue-icon-setting-arena'));
    expect(
      screen
        .getByTestId('add-venue-icon-setting-arena')
        .getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('says why when every draft failed the style check', async () => {
    mockDraft.mockResolvedValue({
      ok: true,
      data: {
        drafts: [],
        hidden: { fill: 2, offGrid: 1, invalid: 0, total: 3 },
        asked: 3,
      },
    });
    render(<Harness />);
    fireEvent.click(screen.getByTestId('add-venue-icon-draft-button'));
    await waitFor(() =>
      expect(screen.getByTestId('add-venue-icon-failed')).toBeTruthy(),
    );
    expect(screen.getByText(COPY.drafts.failedTitle)).toBeTruthy();
    expect(screen.getByText(COPY.drafts.hiddenBadge(3, 3))).toBeTruthy();
  });

  it('shows the request error when drafting fails', async () => {
    mockDraft.mockResolvedValue({ ok: false });
    render(<Harness phone />);
    fireEvent.click(screen.getByTestId('add-venue-icon-draft-button'));
    await waitFor(() =>
      expect(screen.getByTestId('add-venue-icon-error').textContent).toBe(
        COPY.drafts.requestFailed,
      ),
    );
  });
});
