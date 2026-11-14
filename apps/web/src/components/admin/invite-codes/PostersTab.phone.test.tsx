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
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { qrPath } from '@/lib/poster/poster-rule';

// P47-15 PR2: the phone Posters page against 07/posters-mobile, and desktop
// left exactly as it was.

const { getTokenMock } = vi.hoisted(() => ({
  // One function for every render, so `useMemo([getToken])` never refetches.
  getTokenMock: async () => 'token',
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: getTokenMock }),
}));
vi.mock('@/app/(protected)/admin/people/invite-codes/actions', () => ({
  mintInviteCodeWithOptions: vi.fn(),
}));

import { PostersTab, type PosterCodeCard } from './PostersTab';

const copy = ADMIN_COPY.inviteCodes.poster;

const card = (id: string): PosterCodeCard => {
  const url = `HTTPS://CONCERTCRAWL.APP/I/${id.toUpperCase()}`;
  return {
    id,
    code: id.toUpperCase(),
    label: `Wall ${id}`,
    taken: 12,
    max: 50,
    expiresAt: null,
    full: false,
    url,
    qr: qrPath(url),
  };
};

const CARDS = [card('hidive'), card('larimer')];

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const setPhone = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

const renderTab = () =>
  render(
    <PostersTab
      cards={CARDS}
      typedUrl="concertcrawl.app/i"
      venues={{ venueCount: 21, venueNames: ['Hi-Dive'], moreVenues: true }}
      initial={{ code: null, look: 'night', tabs: false }}
      // Every code the server page loaded, posters and personal alike.
      codeCount={7}
    />,
  );

const sheet = () => screen.getByTestId('poster-sheet');

const fetchMock = vi.fn(async (url: string) =>
  url.includes('/v1/admin/people')
    ? json({ success: true, data: { total: 214 } })
    : new Response(null, { status: 500 }),
);

beforeEach(() => {
  window.history.replaceState(null, '', '/admin/people/invite-codes/posters');
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Posters on a phone (07/posters-mobile)', () => {
  beforeEach(() => setPhone(true));

  it('heads the page with the People segment, Posters current', async () => {
    renderTab();
    const nav = screen.getByRole('navigation', {
      name: ADMIN_COPY.codesPage.tabs.label,
    });
    // People is fetched; Codes and Posters come from the server page's list.
    await within(nav).findByText('214');
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'People214',
      'Codes7',
      'Posters2',
    ]);
    expect(links[2]).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText(copy.title)).toBeNull();
    expect(
      screen.queryByRole('link', { name: copy.tabs.label }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: copy.tabs.label }),
    ).toBeNull();
  });

  it('labels the steps in mono, 1 · Code to 3 · Print', () => {
    renderTab();
    for (const [num, name] of [
      [1, copy.steps.code],
      [2, copy.steps.look],
      [3, copy.steps.print],
    ] as const) {
      const label = screen.getByText(copy.phone.step(num, name));
      expect(label).toHaveClass('pt-plabel');
    }
    expect(screen.getByText('1 · Code')).toHaveAttribute('id', 'pt-step-code');
    expect(document.querySelector('.pt-n')).toBeNull();
  });

  it('folds Code to one line with Change, and opens the list from it', () => {
    renderTab();
    expect(screen.getByTestId('poster-code-line')).toHaveTextContent('HIDIVE');
    expect(screen.queryAllByTestId('poster-code-card')).toHaveLength(0);
    expect(screen.queryByText(/more poster code/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: copy.phone.change }));
    expect(screen.getAllByTestId('poster-code-card')).toHaveLength(2);

    fireEvent.click(screen.getByRole('radio', { name: /LARIMER/ }));
    expect(screen.getByTestId('poster-code-line')).toHaveTextContent('LARIMER');
    expect(sheet()).toHaveAttribute('data-url', CARDS[1]!.url);
  });

  it('draws Look as two cards with the phone descriptions', () => {
    renderTab();
    const looks = screen.getAllByTestId('poster-look-card');
    expect(looks).toHaveLength(2);
    expect(looks[0]).toHaveTextContent(
      'NightDark, glowing. Turn on Background graphics when printing.',
    );
    expect(looks[1]).toHaveTextContent(
      'PaperOne ink on white. Cheapest to print.',
    );
    expect(looks[0]).toHaveAttribute('data-on', 'true');
    expect(screen.queryByText(copy.look.night.hint)).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: /Paper/ }));
    expect(looks[1]).toHaveAttribute('data-on', 'true');
    expect(sheet()).toHaveAttribute('data-look', 'paper');
  });

  it('makes tear-off tabs a checkbox with the short hint', () => {
    renderTab();
    expect(screen.queryByRole('switch')).toBeNull();
    const box = screen.getByRole('checkbox', { name: /Tear-off tabs/ });
    expect(
      screen.getByText('The QR shrinks to 3.5 in to make room.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(copy.tearTabs.hint)).toBeNull();
    fireEvent.click(box);
    expect(box).toBeChecked();
    expect(sheet()).toHaveAttribute('data-tabs', 'true');
  });

  it('turns the print tips into a checklist kept on the page', () => {
    renderTab();
    const list = screen.getByRole('group', { name: copy.printTipsHeading });
    const boxes = within(list).getAllByRole('checkbox');
    expect(boxes.map((box) => box.closest('label')?.textContent)).toEqual([
      'US Letter, scale 100%',
      'Background graphics on',
      'Test scan from 6 ft',
    ]);
    boxes.forEach((box) => expect(box).not.toBeChecked());
    fireEvent.click(boxes[2]!);
    expect(boxes[2]).toBeChecked();
    expect(screen.queryByText(copy.scanTip)).toBeNull();
    expect(screen.queryByText(copy.printTips[0]!)).toBeNull();
  });

  it('pins Print alone, with no QR download and no tap-to-enlarge', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderTab();
    const buttons = document.querySelectorAll('.pt-pbar button');
    expect(buttons).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    expect(print).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: /QR/ })).toBeNull();
    // The board's "tap to enlarge" is dropped by orchestrator ruling (Design
    // item 32), not an omission: guard that it stays out.
    expect(screen.queryByText(/tap to enlarge/i)).toBeNull();
    expect(screen.queryByTestId('poster-preview-spec')).toBeNull();
  });

  it('moves focus to a radio after Change and to Change after a pick', () => {
    renderTab();
    // Nothing is focused on mount.
    expect(document.body).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: copy.phone.change }));
    // Change unmounted; the selected code's radio takes focus.
    expect(screen.getByRole('radio', { name: /HIDIVE/ })).toHaveFocus();

    fireEvent.click(screen.getByRole('radio', { name: /LARIMER/ }));
    // The radio unmounted with the fold; the one-line Change takes focus.
    expect(
      screen.getByRole('button', { name: copy.phone.change }),
    ).toHaveFocus();
  });

  it('keeps the selection on the current Posters segment', async () => {
    renderTab();
    const nav = screen.getByRole('navigation', {
      name: ADMIN_COPY.codesPage.tabs.label,
    });
    await within(nav).findByText('214');
    const posters = () => within(nav).getAllByRole('link')[2]!;
    expect(posters()).toHaveAttribute('aria-current', 'page');
    expect(posters()).toHaveAttribute(
      'href',
      '/admin/people/invite-codes/posters?code=hidive',
    );

    fireEvent.click(screen.getByRole('button', { name: copy.phone.change }));
    fireEvent.click(screen.getByRole('radio', { name: /LARIMER/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Paper/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Tear-off tabs/ }));
    // Tapping it lands on the page as it is, never a bare /posters.
    expect(posters()).toHaveAttribute(
      'href',
      '/admin/people/invite-codes/posters?code=larimer&look=paper&tabs=1',
    );
  });

  it('counts Codes from the page and never requests the invite-code list', async () => {
    renderTab();
    const nav = screen.getByRole('navigation', {
      name: ADMIN_COPY.codesPage.tabs.label,
    });
    await within(nav).findByText('214');
    expect(within(nav).getByText('7')).toBeInTheDocument();
    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls.some((url) => url.includes('/v1/admin/invite-codes'))).toBe(
      false,
    );
    expect(urls.every((url) => url.includes('/v1/admin/people'))).toBe(true);
  });
});

describe('Posters on desktop keeps its approved design', () => {
  beforeEach(() => setPhone(false));

  it('carries no data-phone or data-pending attribute once resolved', () => {
    renderTab();
    const page = screen.getByTestId('posters-tab');
    expect(page).not.toHaveAttribute('data-phone');
    expect(page).not.toHaveAttribute('data-pending');
    expect(page.querySelector('.pt-grid')).not.toHaveAttribute('data-phone');
  });

  it('keeps the heading, two tabs, numbered steps and the long Look hints', () => {
    renderTab();
    expect(screen.getByText(copy.title)).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: copy.tabs.label }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', {
        name: ADMIN_COPY.codesPage.tabs.label,
      }),
    ).toBeNull();
    expect(document.querySelectorAll('.pt-n')).toHaveLength(3);
    expect(screen.getAllByTestId('poster-code-card')).toHaveLength(2);
    expect(screen.queryByTestId('poster-code-line')).toBeNull();
    expect(screen.getByText(copy.look.night.hint)).toBeInTheDocument();
    expect(screen.getByText(copy.look.paper.hint)).toBeInTheDocument();
  });

  it('keeps the tear-off switch, Print poster, QR as SVG and the tips', () => {
    renderTab();
    expect(
      screen.getByRole('switch', { name: /Tear-off tabs/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.tearTabs.hint)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: copy.print }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.qrDownload)).toBeInTheDocument();
    for (const tip of copy.printTips)
      expect(screen.getByText(tip)).toBeInTheDocument();
    expect(screen.getByText(copy.scanTip)).toBeInTheDocument();
    expect(screen.getByTestId('poster-preview-spec')).toBeInTheDocument();
    expect(screen.queryByText(copy.phone.tearTabsHint)).toBeNull();
    expect(
      screen.queryByRole('group', { name: copy.printTipsHeading }),
    ).toBeNull();
  });
});
