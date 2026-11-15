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

// The panel's Publish guide (the tab's bar hides while a panel is open).
const panelPublish = () => {
  const button = within(screen.getByTestId('side-panel')).getByRole('button', {
    name: COPY.publish,
  });
  if (!(button instanceof HTMLButtonElement)) throw new Error('no button');
  return button;
};

const bar = () => screen.queryByTestId('guide-unpublished-bar');

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
    const rows = screen
      .getAllByTestId(/^guide-row-/)
      .map((row) => row.getAttribute('data-testid'));
    expect(rows[0]).toBe('guide-row-insider_tip');
    expect(rows[1]).toBe('guide-row-accessibility');
    expect(rows).toHaveLength(9);
    // The denominator is the rows drawn, the insider tip included (board
    // "6 of 9"); a live guide drops "drafts stay here".
    expect(screen.getByTestId('guide-count').textContent).toBe(
      COPY.countLive(3, rows.length),
    );
  });

  it('keeps "drafts stay here" on an unpublished guide', () => {
    renderTab();
    expect(screen.getByTestId('guide-count').textContent).toBe(
      COPY.count(0, screen.getAllByTestId(/^guide-row-/).length),
    );
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
      COPY.countLive(1, 9),
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
    fireEvent.click(panelPublish());
    await waitFor(() => expect(mockPublish).toHaveBeenCalledWith('venue-1'));
    expect(mockSave).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onGuideChange).toHaveBeenCalledWith(published));
  });

  it('holds Publish while Accessibility is blank, until it is written or marked', () => {
    renderTab({ ...draftGuide, chips: [] });
    open('accessibility', true);
    const publish = panelPublish;
    expect(publish().disabled).toBe(true);
    expect(
      within(screen.getByTestId('side-panel')).getByText(COPY.publishBlocked),
    ).toBeTruthy();
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
    // It asks first (ConfirmDialog); Escape there closes only the confirm.
    expect(mockUnpublish).not.toHaveBeenCalled();
    expect(screen.getByText(COPY.unpublishConfirm.title)).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText(COPY.unpublishConfirm.title)).toBeNull();
    expect(screen.getByTestId('side-panel')).toBeTruthy();

    fireEvent.click(screen.getByTestId('guide-menu'));
    fireEvent.click(
      screen.getByRole('menuitem', { name: new RegExp(COPY.unpublish) }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: COPY.unpublishConfirm.confirm }),
    );
    await waitFor(() => expect(mockUnpublish).toHaveBeenCalledWith('venue-1'));
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('holds Save draft on a live guide: only Publish saves', () => {
    renderTab({ ...draftGuide, publishedAt: '2026-11-01' });
    open('parking');
    const save = screen.getByRole('button', { name: COPY.saveDraft });
    expect(save.hasAttribute('disabled')).toBe(true);
    fireEvent.click(save);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('a draft guide’s Save draft works', () => {
    mockSave.mockResolvedValue({ success: true, data: draftGuide });
    renderTab();
    open('parking');
    const save = screen.getByRole('button', { name: COPY.saveDraft });
    expect(save.hasAttribute('disabled')).toBe(false);
  });

  it('keeps the save when Publish then fails, with the gate’s line', async () => {
    const saved = { ...draftGuide, insiderTip: 'New tip.' };
    mockSave.mockResolvedValue({ success: true, data: saved });
    mockPublish.mockResolvedValue({ success: false, field: 'accessibility' });
    renderTab();
    open('parking');
    fireEvent.click(panelPublish());
    await waitFor(() => expect(onGuideChange).toHaveBeenCalledWith(saved));
    expect(screen.getByRole('alert').textContent).toBe(COPY.publishGate);
    expect(screen.getByTestId('side-panel')).toBeTruthy();
  });

  it('a non-gate publish failure shows the save-failed toast', async () => {
    mockSave.mockResolvedValue({ success: true, data: draftGuide });
    mockPublish.mockResolvedValue({ success: false });
    renderTab();
    open('parking');
    fireEvent.click(panelPublish());
    await waitFor(() => expect(screen.getByTestId('save-failed')).toBeTruthy());
    expect(onGuideChange).toHaveBeenCalledWith(draftGuide);
  });

  it('opens on the field, closes on Escape and hands focus back', () => {
    renderTab();
    const opener = screen.getByRole('button', {
      name: COPY.editLabel(COPY.section.parking),
    });
    opener.focus();
    fireEvent.click(opener);
    const field = screen.getByRole('textbox', { name: COPY.section.parking });
    expect(document.activeElement).toBe(field);
    // Desktop keeps the drawn 13.5px.
    expect(field.style.fontSize).toBe('13.5px');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('side-panel')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('Escape in the open ⋯ closes the menu, not the panel', () => {
    renderTab({ ...draftGuide, publishedAt: '2026-11-01' });
    open('parking');
    fireEvent.click(screen.getByTestId('guide-menu'));
    const item = screen.getByRole('menuitem', {
      name: new RegExp(COPY.unpublish),
    });
    fireEvent.keyDown(item, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByTestId('side-panel')).toBeTruthy();
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
        name: COPY.rowLabel(
          COPY.writeLabel(COPY.section.insider_tip),
          COPY.state.missing,
          COPY.notWritten,
        ),
      }),
    );
    expect(
      screen.getByRole('dialog', {
        name: COPY.writeLabel(COPY.section.insider_tip),
      }),
    ).toBeTruthy();
  });
});

describe('GuideTab unpublished bar (item 16)', () => {
  it('counts the written sections and publishes the whole guide', async () => {
    const published = { ...draftGuide, publishedAt: '2026-11-15' };
    mockPublish.mockResolvedValue({ success: true, data: published });
    renderTab();
    const shown = bar();
    if (shown === null) throw new Error('no bar');
    // The insider tip, Accessibility and Parking are written.
    expect(shown.textContent).toBe(
      '3 sections written. Fans don’t see the guide until you publish it.',
    );
    // It sits above the rows (`16/guide-tab-d`).
    expect(
      shown.compareDocumentPosition(
        screen.getByTestId('guide-row-insider_tip'),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    fireEvent.click(
      within(shown).getByRole('button', { name: 'Publish guide' }),
    );
    await waitFor(() => expect(mockPublish).toHaveBeenCalledWith('venue-1'));
    // Nothing was edited, so nothing is saved first.
    expect(mockSave).not.toHaveBeenCalled();
    await waitFor(() => expect(onGuideChange).toHaveBeenCalledWith(published));
  });

  it('says "1 section written." and holds Publish behind the Accessibility gate', () => {
    renderTab({ ...draftGuide, chips: [] });
    const shown = bar();
    if (shown === null) throw new Error('no bar');
    expect(shown.textContent).toContain('1 section written.');
    const button = within(shown).getByRole('button', { name: COPY.publish });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(COPY.publishBlocked)).toBeTruthy();
    fireEvent.click(button);
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('shows the gate line when the API’s publish gate refuses', async () => {
    mockPublish.mockResolvedValue({ success: false, field: 'accessibility' });
    renderTab();
    const shown = bar();
    if (shown === null) throw new Error('no bar');
    fireEvent.click(within(shown).getByRole('button', { name: COPY.publish }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(COPY.publishGate),
    );
    expect(onGuideChange).not.toHaveBeenCalled();
  });

  it('a failed publish says so and offers a retry', async () => {
    mockPublish.mockResolvedValue({ success: false });
    renderTab();
    const shown = bar();
    if (shown === null) throw new Error('no bar');
    fireEvent.click(within(shown).getByRole('button', { name: COPY.publish }));
    await waitFor(() => expect(screen.getByTestId('save-failed')).toBeTruthy());
    expect(screen.getByTestId('save-failed').textContent).toContain(
      COPY.failed.publish,
    );
    expect(onGuideChange).not.toHaveBeenCalled();
  });

  it('is gone once the guide is live, and the count line stays', () => {
    renderTab({ ...draftGuide, publishedAt: '2026-11-01' });
    expect(bar()).toBeNull();
    expect(screen.getByTestId('guide-count').textContent).toBe(
      COPY.countLive(3, 9),
    );
  });

  it('is not drawn with nothing written: the empty state stands', () => {
    renderTab({ ...draftGuide, chips: [], insiderTip: null });
    expect(bar()).toBeNull();
    cleanup();
    // Can't document yet is a placeholder, not writing.
    renderTab({
      chips: [{ chipType: 'accessibility', body: '', isPlaceholder: true }],
      insiderTip: null,
      publishedAt: null,
    });
    expect(bar()).toBeNull();
  });

  it('hides while a section panel is open, and comes back when it closes', () => {
    renderTab();
    expect(bar()).not.toBeNull();
    fireEvent.click(
      screen.getByRole('button', {
        name: COPY.editLabel(COPY.section.parking),
      }),
    );
    expect(screen.getByTestId('side-panel')).toBeTruthy();
    expect(bar()).toBeNull();
    // Only the panel's Publish guide is reachable.
    expect(screen.getAllByRole('button', { name: COPY.publish })).toHaveLength(
      1,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('side-panel')).toBeNull();
    expect(bar()).not.toBeNull();
  });

  it('announces Publishing… through a polite status region', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    mockPublish.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    renderTab();
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');
    const shown = bar();
    if (shown === null) throw new Error('no bar');
    fireEvent.click(within(shown).getByRole('button', { name: COPY.publish }));
    await waitFor(() => expect(status.textContent).toBe(COPY.publishing));
    resolve({ success: false });
    await waitFor(() => expect(screen.getByTestId('save-failed')).toBeTruthy());
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('a success without a guide is a failure, not a stale overwrite', async () => {
    mockPublish.mockResolvedValue({ success: true });
    renderTab();
    const shown = bar();
    if (shown === null) throw new Error('no bar');
    fireEvent.click(within(shown).getByRole('button', { name: COPY.publish }));
    await waitFor(() => expect(screen.getByTestId('save-failed')).toBeTruthy());
    expect(onGuideChange).not.toHaveBeenCalled();
  });

  it('stacks on the phone with a full-width Publish guide (`16/guide-m`)', async () => {
    phone = true;
    renderTab();
    // useIsPhone settles after mount, so wait for the phone layout.
    await waitFor(() =>
      expect(
        screen.getByTestId('guide-unpublished-bar').style.flexDirection,
      ).toBe('column'),
    );
    const shown = screen.getByTestId('guide-unpublished-bar');
    const button = within(shown).getByRole('button', { name: COPY.publish });
    expect(button.style.width).toBe('100%');
    expect(button.style.height).toBe('40px');
  });
});

describe('GuideEditPanel publish footer (item 16)', () => {
  const openParking = () =>
    fireEvent.click(
      screen.getByRole('button', {
        name: COPY.editLabel(COPY.section.parking),
      }),
    );

  it('before the first publish: the note, then Save draft leading Publish guide', () => {
    renderTab();
    openParking();
    const panel = screen.getByTestId('side-panel');
    expect(within(panel).getByTestId('guide-publish-note').textContent).toBe(
      'Publish guide puts the guide live, every section at once.',
    );
    const save = within(panel).getByTestId('guide-save');
    const publish = within(panel).getByTestId('guide-publish');
    expect(publish.textContent).toBe('Publish guide');
    expect(save.getAttribute('data-rank')).toBe('primary');
    expect(publish.getAttribute('data-rank')).toBe('secondary');
    expect(
      save.compareDocumentPosition(publish) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(save.hasAttribute('disabled')).toBe(false);
  });

  it('on a live guide: no note, Publish guide leads, Save draft is held', () => {
    renderTab({ ...draftGuide, publishedAt: '2026-11-01' });
    openParking();
    const panel = screen.getByTestId('side-panel');
    expect(within(panel).queryByTestId('guide-publish-note')).toBeNull();
    const save = within(panel).getByTestId('guide-save');
    const publish = within(panel).getByTestId('guide-publish');
    expect(publish.textContent).toBe('Publish guide');
    expect(publish.getAttribute('data-rank')).toBe('primary');
    expect(save.getAttribute('data-rank')).toBe('secondary');
    expect(
      publish.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(save.hasAttribute('disabled')).toBe(true);
  });

  it('⌘↵ before the first publish saves a draft, and never publishes', async () => {
    mockSave.mockResolvedValue({ success: true, data: draftGuide });
    renderTab();
    openParking();
    fireEvent.keyDown(screen.getByRole('textbox'), {
      key: 'Enter',
      metaKey: true,
    });
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onGuideChange).toHaveBeenCalledWith(draftGuide));
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('⌘↵ on a live guide saves, then publishes', async () => {
    const live = { ...draftGuide, publishedAt: '2026-11-01' };
    mockSave.mockResolvedValue({ success: true, data: live });
    mockPublish.mockResolvedValue({ success: true, data: live });
    renderTab(live);
    openParking();
    fireEvent.keyDown(screen.getByRole('textbox'), {
      key: 'Enter',
      ctrlKey: true,
    });
    await waitFor(() => expect(mockPublish).toHaveBeenCalledWith('venue-1'));
    expect(mockSave).toHaveBeenCalledTimes(1);
  });
});

describe('GuideTab on the phone', () => {
  it('stacks each row as one button and opens the editor full screen', async () => {
    phone = true;
    renderTab();
    // The row's name carries its state and text, not just "Edit Parking".
    const row = await screen.findByRole('button', {
      name: COPY.rowLabel(
        COPY.editLabel(COPY.section.parking),
        COPY.state.draft,
        'Lots open 2 hours early.',
      ),
    });
    expect(row.getAttribute('data-testid')).toBe('guide-row-parking');
    // No separate Edit link on the phone: the row is the control.
    expect(screen.queryByText(COPY.edit)).toBeNull();
    fireEvent.click(row);
    expect(screen.getByTestId('admin-sheet')).toBeTruthy();
    expect(screen.queryByTestId('side-panel')).toBeNull();
    // 16px, so iOS Safari doesn't zoom into the autofocused field.
    expect(
      screen.getByRole('textbox', { name: COPY.section.parking }).style
        .fontSize,
    ).toBe('16px');
  });
});
