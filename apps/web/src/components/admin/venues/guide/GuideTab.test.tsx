// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import type { VenueGuide } from '@concert-crawl/types';

const mockSave = vi.fn();
const mockPublish = vi.fn();
const mockUnpublish = vi.fn();
vi.mock('@/lib/actions/venues', () => ({
  saveVenueGuide: (...args: unknown[]) => mockSave(...args),
  publishVenueGuide: (...args: unknown[]) => mockPublish(...args),
  unpublishVenueGuide: (...args: unknown[]) => mockUnpublish(...args),
}));

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { GuideTab } from './GuideTab';

const COPY = ADMIN_COPY.venueGuide;

let phone = false;
const matchMediaStub = (query: string): MediaQueryList => ({
  matches: phone,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
});

const venue = {
  id: 'venue-1',
  name: 'Ball Arena',
  slug: 'ball-arena',
  active: true,
  verified: true,
  robotsTxtAllowed: true,
  crawlPausedAt: null,
  neighborhood: null,
};

const draftGuide: VenueGuide = {
  chips: [
    {
      chipType: 'accessibility',
      body: 'Ramp at Gate 1.',
      isPlaceholder: false,
    },
    {
      chipType: 'parking',
      body: 'Lots open 2 hours early.',
      isPlaceholder: false,
    },
  ],
  insiderTip: 'Use the Wewatta St entrance.',
  publishedAt: null,
};

const onGuideChange = vi.fn();
const renderTab = (guide: VenueGuide = draftGuide, loadFailed = false) =>
  render(
    <GuideTab
      venue={venue}
      guide={guide}
      loadFailed={loadFailed}
      onGuideChange={onGuideChange}
    />,
  );

const stateOf = (section: string) =>
  within(screen.getByTestId(`guide-row-${section}`))
    .getByTestId('guide-state')
    .getAttribute('data-state');

beforeEach(() => {
  phone = false;
  vi.stubGlobal('matchMedia', matchMediaStub);
  mockSave.mockReset();
  mockPublish.mockReset();
  mockUnpublish.mockReset();
  onGuideChange.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('GuideTab rows', () => {
  it('draws the head, the count and every row in order', () => {
    renderTab({ ...draftGuide, publishedAt: '2026-11-01' });
    expect(screen.getByText(COPY.title)).toBeTruthy();
    expect(screen.getByTestId('guide-count').textContent).toBe(
      COPY.count(2, 8),
    );
    const rows = screen
      .getAllByTestId(/^guide-row-/)
      .map((row) => row.getAttribute('data-testid'));
    expect(rows[0]).toBe('guide-row-insider_tip');
    expect(rows[1]).toBe('guide-row-accessibility');
    expect(rows).toHaveLength(9);
  });

  it('opens Preview as a fan on the fan page’s guide, in a new tab', () => {
    renderTab();
    const link = screen.getByRole('link', { name: COPY.preview });
    expect(link.getAttribute('href')).toBe('/venues/ball-arena#ft-guide');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('derives each row’s state from the guide', () => {
    renderTab();
    expect(stateOf('parking')).toBe('draft');
    expect(stateOf('transit')).toBe('missing');
    cleanup();
    renderTab({
      ...draftGuide,
      chips: [{ chipType: 'accessibility', body: '', isPlaceholder: true }],
      publishedAt: '2026-11-01',
    });
    expect(stateOf('insider_tip')).toBe('published');
    expect(stateOf('accessibility')).toBe('cantDocument');
    expect(screen.getByTestId('guide-count').textContent).toBe(
      COPY.count(0, 8),
    );
  });

  it('offers Write on a Missing row and Edit on a written one', () => {
    renderTab();
    expect(
      screen.getByRole('button', {
        name: COPY.writeLabel(COPY.section.transit),
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: COPY.editLabel(COPY.section.parking),
      }),
    ).toBeTruthy();
  });

  it('shows Couldn’t load in place of the rows when the fetch failed', () => {
    renderTab(draftGuide, true);
    expect(screen.getByTestId('couldnt-load')).toBeTruthy();
    expect(screen.queryAllByTestId(/^guide-row-/)).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(mockRefresh).toHaveBeenCalled();
  });
});

describe('GuideTab edit panel', () => {
  const open = (section: keyof typeof COPY.section, write = false) =>
    fireEvent.click(
      screen.getByRole('button', {
        name: (write ? COPY.writeLabel : COPY.editLabel)(COPY.section[section]),
      }),
    );

  it('saves a draft with the whole guide and this section replaced', async () => {
    mockSave.mockResolvedValue({ success: true, data: draftGuide });
    renderTab();
    open('parking');
    const box = screen.getByRole('textbox', { name: COPY.section.parking });
    fireEvent.change(box, { target: { value: 'Street only.' } });
    expect(screen.getByTestId('guide-counter').textContent).toBe(
      COPY.counter(12, 400),
    );
    fireEvent.click(screen.getByRole('button', { name: COPY.saveDraft }));
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    expect(mockSave).toHaveBeenCalledWith('venue-1', {
      insiderTip: draftGuide.insiderTip,
      chips: [
        draftGuide.chips[0],
        { chipType: 'parking', body: 'Street only.', isPlaceholder: false },
      ],
    });
    expect(mockPublish).not.toHaveBeenCalled();
    await waitFor(() => expect(onGuideChange).toHaveBeenCalledWith(draftGuide));
    expect(screen.queryByTestId('side-panel')).toBeNull();
  });

  it('Publish saves, then publishes', async () => {
    const published = { ...draftGuide, publishedAt: '2026-11-13' };
    mockSave.mockResolvedValue({ success: true, data: draftGuide });
    mockPublish.mockResolvedValue({ success: true, data: published });
    renderTab();
    open('transit', true);
    expect(screen.getByRole('heading', { name: COPY.write })).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'A-line.' },
    });
    fireEvent.click(screen.getByRole('button', { name: COPY.publish }));
    await waitFor(() => expect(mockPublish).toHaveBeenCalledWith('venue-1'));
    expect(mockSave).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onGuideChange).toHaveBeenCalledWith(published));
  });

  it('holds Publish while Accessibility is blank, until it is written or marked', () => {
    renderTab({ ...draftGuide, chips: [] });
    open('accessibility', true);
    const publish = () => {
      const button = screen.getByRole('button', { name: COPY.publish });
      if (!(button instanceof HTMLButtonElement)) throw new Error('no button');
      return button;
    };
    expect(publish().disabled).toBe(true);
    expect(screen.getByText(COPY.publishBlocked)).toBeTruthy();
    fireEvent.click(screen.getByRole('switch', { name: COPY.cantDocument }));
    expect(publish().disabled).toBe(false);
    fireEvent.click(screen.getByRole('switch', { name: COPY.cantDocument }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Ramp.' },
    });
    expect(publish().disabled).toBe(false);
  });

  it('a failed save keeps the panel open and says so', async () => {
    mockSave.mockResolvedValue({ success: false });
    renderTab();
    open('parking');
    fireEvent.click(screen.getByRole('button', { name: COPY.saveDraft }));
    await waitFor(() => expect(screen.getByTestId('save-failed')).toBeTruthy());
    expect(screen.getByTestId('side-panel')).toBeTruthy();
    expect(onGuideChange).not.toHaveBeenCalled();
  });

  it('offers Unpublish in the ⋯ only on a published guide', async () => {
    const published = { ...draftGuide, publishedAt: '2026-11-01' };
    mockUnpublish.mockResolvedValue({
      success: true,
      data: { ...published, publishedAt: null },
    });
    renderTab();
    open('parking');
    expect(screen.queryByTestId('guide-menu')).toBeNull();
    cleanup();
    renderTab(published);
    open('parking');
    fireEvent.click(screen.getByTestId('guide-menu'));
    expect(screen.getByText(COPY.unpublishHint)).toBeTruthy();
    fireEvent.click(
      screen.getByRole('menuitem', { name: new RegExp(COPY.unpublish) }),
    );
    await waitFor(() => expect(mockUnpublish).toHaveBeenCalledWith('venue-1'));
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('titles Write mode "Write" but names the dialog after its section', () => {
    renderTab({ ...draftGuide, insiderTip: null });
    open('insider_tip', true);
    expect(screen.getByRole('heading', { name: COPY.write })).toBeTruthy();
    expect(
      screen.getByRole('dialog', {
        name: COPY.writeLabel(COPY.section.insider_tip),
      }),
    ).toBeTruthy();
  });

  it('names the phone’s full-screen Write after its section too', async () => {
    phone = true;
    renderTab({ ...draftGuide, insiderTip: null });
    fireEvent.click(
      await screen.findByRole('button', {
        name: COPY.writeLabel(COPY.section.insider_tip),
      }),
    );
    expect(
      screen.getByRole('dialog', {
        name: COPY.writeLabel(COPY.section.insider_tip),
      }),
    ).toBeTruthy();
  });
});

describe('GuideTab on the phone', () => {
  it('stacks each row as one button and opens the editor full screen', async () => {
    phone = true;
    renderTab();
    const row = await screen.findByRole('button', {
      name: COPY.editLabel(COPY.section.parking),
    });
    expect(row.getAttribute('data-testid')).toBe('guide-row-parking');
    // No separate Edit link on the phone: the row is the control.
    expect(screen.queryByText(COPY.edit)).toBeNull();
    fireEvent.click(row);
    expect(screen.getByTestId('admin-sheet')).toBeTruthy();
    expect(screen.queryByTestId('side-panel')).toBeNull();
  });
});
