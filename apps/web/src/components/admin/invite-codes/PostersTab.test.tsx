// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { qrPath, qrSvg } from '@/lib/poster/poster-rule';

const { mint } = vi.hoisted(() => ({
  mint: vi.fn(async () => ({
    ok: true,
    id: 'code-new',
    code: 'BETA-NEW0-0000',
  })),
}));
vi.mock('@/app/(protected)/admin/invite-codes/actions', () => ({
  mintInviteCodeWithOptions: mint,
}));

import { PostersTab, type PosterCodeCard } from './PostersTab';

const card = (id: string, overrides: Partial<PosterCodeCard> = {}) => {
  const url = `HTTPS://CONCERTCRAWL.APP/I/BETA-${id.toUpperCase()}`;
  return {
    id,
    code: `BETA-${id.toUpperCase()}`,
    label: `Wall ${id}`,
    taken: 12,
    max: 50,
    expiresAt: null,
    full: false,
    url,
    qr: qrPath(url),
    ...overrides,
  };
};

const CARDS = [
  card('one'),
  card('two', { expiresAt: '2027-01-01T06:00:00Z' }),
  card('full', { taken: 50, full: true, qr: null }),
];

const renderTab = (cards = CARDS, code: string | null = null) =>
  render(
    <PostersTab
      cards={cards}
      typedUrl="concertcrawl.app/i"
      venues={{ venueCount: 21, venueNames: ['Hi-Dive'], moreVenues: true }}
      initial={{ code, look: 'night', tabs: false }}
    />,
  );

const sheet = () => screen.getByTestId('poster-sheet');

describe('PostersTab', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/admin/invite-codes/posters');
  });
  afterEach(() => {
    cleanup();
    mint.mockClear();
    vi.restoreAllMocks();
  });

  it('selects the first printable code and shows seats and expiry', () => {
    renderTab();
    expect(sheet()).toHaveAttribute('data-url', CARDS[0]!.url);
    const [, second, full] = screen.getAllByTestId('poster-code-card');
    expect(second).toHaveTextContent('12 of 50 seats taken');
    // Midnight UTC on Jan 1 is still Dec 31 in Denver.
    expect(second).toHaveTextContent('Expires Dec 31');
    expect(full).toHaveAttribute('data-full', 'true');
    expect(full!.querySelector('input')).toBeDisabled();
    expect(window.location.search).toBe('?code=one');
  });

  it('picking a code updates the preview and the URL', () => {
    renderTab();
    fireEvent.click(screen.getByRole('radio', { name: /BETA-TWO/ }));
    expect(sheet()).toHaveAttribute('data-url', CARDS[1]!.url);
    expect(window.location.search).toBe('?code=two');
  });

  it('switches the look and the tabs, and keeps them in the URL', () => {
    renderTab(CARDS, 'two');
    fireEvent.click(screen.getByRole('radio', { name: /Paper/ }));
    fireEvent.click(screen.getByRole('switch', { name: /Tear-off tabs/ }));
    expect(sheet()).toHaveAttribute('data-look', 'paper');
    expect(sheet()).toHaveAttribute('data-tabs', 'true');
    expect(screen.getByTestId('poster-preview-spec')).toHaveTextContent(
      'QR 3.5 in · scans from about 6 ft',
    );
    expect(window.location.search).toBe('?code=two&look=paper&tabs=1');
  });

  it('downloads the selected QR as an SVG named for the code', async () => {
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:qr';
    });
    URL.revokeObjectURL = vi.fn();
    let saved = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      saved = this.download;
    });
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: /QR as SVG/ }));
    expect(saved).toBe('poster-qr-BETA-ONE.svg');
    expect(blobs[0]!.type).toBe('image/svg+xml');
    expect(await blobs[0]!.text()).toBe(qrSvg(CARDS[0]!.qr!));
  });

  it('prints with the browser dialog', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: /Print poster/ }));
    expect(print).toHaveBeenCalled();
  });

  it('folds the phone picker to the selected card with a count of the rest', () => {
    renderTab();
    expect(screen.getByRole('radiogroup', { name: 'Code' })).toHaveAttribute(
      'data-folded',
      'true',
    );
    const more = screen.getByRole('button', {
      name: /2 more poster codes, 1 full/,
    });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('radiogroup', { name: 'Code' })).toHaveAttribute(
      'data-folded',
      'false',
    );
  });

  it('never folds away every card: a lone full code still shows why', () => {
    renderTab([CARDS[2]!]);
    expect(screen.getByRole('radiogroup', { name: 'Code' })).toHaveAttribute(
      'data-folded',
      'false',
    );
    expect(
      screen.queryByRole('button', { name: /more poster code/ }),
    ).toBeNull();
    expect(
      screen.getByText(
        'Every seat is taken. Mint a new code to put up another poster.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('poster-sheet')).toBeNull();
  });

  it.each(['full', 'gone'])(
    'refuses a requested %s code: nothing selected, URL kept, notice shown',
    (code) => {
      window.history.replaceState(
        null,
        '',
        `/admin/invite-codes/posters?code=${code}&look=paper`,
      );
      renderTab(CARDS, code);
      expect(screen.getByRole('alert')).toHaveTextContent(
        "That code can't be printed",
      );
      expect(screen.queryByTestId('poster-sheet')).toBeNull();
      expect(
        document.querySelector('input[name="poster-code"]:checked'),
      ).toBeNull();
      expect(screen.getByRole('radiogroup', { name: 'Code' })).toHaveAttribute(
        'data-folded',
        'false',
      );
      expect(window.location.search).toBe(`?code=${code}&look=paper`);
      // Picking a code clears the notice and takes over the URL.
      fireEvent.click(screen.getByRole('radio', { name: /BETA-TWO/ }));
      expect(screen.queryByRole('alert')).toBeNull();
      expect(window.location.search).toBe('?code=two');
    },
  );

  it('validates seats from 2 to 500, quietly until Other is touched', () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: /New poster code/ }));
    expect(screen.getByTestId('poster-mat-note')).toHaveTextContent(
      "The preview switches to the new code once it's minted.",
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Other' }));
    const seats = screen.getByRole('textbox', { name: 'Seats' });
    const submit = screen.getByRole('button', { name: 'Mint and preview' });
    expect(submit).toBeDisabled();
    expect(seats).toHaveAttribute('aria-invalid', 'false');
    fireEvent.blur(seats);
    expect(seats).toHaveAttribute('aria-invalid', 'true');
    for (const typed of ['', '0', '1', '501', '12.5']) {
      fireEvent.change(seats, { target: { value: typed } });
      expect(submit).toBeDisabled();
    }
    fireEvent.change(seats, { target: { value: '2' } });
    expect(submit).toBeEnabled();
    expect(seats).toHaveAttribute('aria-invalid', 'false');
    fireEvent.change(seats, { target: { value: '500' } });
    expect(submit).toBeEnabled();
  });

  const openAndMint = async () => {
    fireEvent.click(screen.getByRole('button', { name: /New poster code/ }));
    fireEvent.change(
      screen.getByRole('textbox', { name: /Where it's going/ }),
      { target: { value: 'Record shop on Colfax' } },
    );
    fireEvent.click(screen.getByRole('radio', { name: '100' }));
    fireEvent.click(screen.getByRole('radio', { name: '90 days' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mint and preview' }));
    });
  };

  it('mints through the audited action, keeps the old preview dimmed, then selects the new code', async () => {
    const view = renderTab();
    await openAndMint();
    expect(mint).toHaveBeenCalledWith({
      expiresIn: '90d',
      label: 'Record shop on Colfax',
      maxUses: 100,
    });
    // Until the new code arrives, the old preview stays up, dimmed, and the
    // form can't mint again.
    expect(sheet()).toHaveAttribute('data-url', CARDS[0]!.url);
    expect(
      screen.getByRole('button', { name: 'Mint and preview' }),
    ).toBeDisabled();
    expect(screen.queryByText(/That code can't be printed/)).toBeNull();
    const fresh = { ...card('new'), id: 'code-new' };
    view.rerender(
      <PostersTab
        cards={[fresh, ...CARDS]}
        typedUrl="concertcrawl.app/i"
        venues={{ venueCount: 21, venueNames: ['Hi-Dive'], moreVenues: true }}
        initial={{ code: null, look: 'night', tabs: false }}
      />,
    );
    expect(screen.queryByTestId('new-poster-code')).toBeNull();
    expect(sheet()).toHaveAttribute('data-url', fresh.url);
    expect(window.location.search).toBe('?code=code-new');
  });

  it('says so when the minted code never shows up in the list', async () => {
    renderTab();
    await openAndMint();
    expect(screen.getByTestId('poster-mat-note')).toHaveTextContent(
      "Minted, but the list didn't refresh.",
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Minted, but the list didn't refresh.",
    );
  });

  it('shows an error, not silence, when a mint comes back without an id', async () => {
    mint.mockResolvedValueOnce({ ok: true, code: 'BETA-NEW0-0000' } as never);
    renderTab();
    await openAndMint();
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Minted, but couldn't select it. Find it in the list.",
    );
    expect(
      screen.getByRole('button', { name: 'Mint and preview' }),
    ).toBeDisabled();
  });

  it('holds Cancel while a mint is pending', async () => {
    let finish: (value: {
      ok: boolean;
      id: string;
      code: string;
    }) => void = () => {};
    mint.mockImplementationOnce(
      () => new Promise((resolve) => (finish = resolve)),
    );
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: /New poster code/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mint and preview' }));
    });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await act(async () => finish({ ok: true, id: 'x', code: 'BETA-X' }));
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });

  it('refuses a picked code once it can no longer be printed', () => {
    const view = renderTab();
    view.rerender(
      <PostersTab
        cards={[
          { ...CARDS[0]!, full: true, taken: 50, qr: null },
          ...CARDS.slice(1),
        ]}
        typedUrl="concertcrawl.app/i"
        venues={{ venueCount: 21, venueNames: ['Hi-Dive'], moreVenues: true }}
        initial={{ code: null, look: 'night', tabs: false }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      "That code can't be printed",
    );
    expect(screen.queryByTestId('poster-sheet')).toBeNull();
  });

  it('says so when there is no poster code yet', () => {
    renderTab([]);
    expect(
      screen.getByText('No poster codes yet. Mint one to print a poster.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('poster-sheet')).toBeNull();
  });
});
