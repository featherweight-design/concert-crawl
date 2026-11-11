// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { qrPath, qrSvg } from '@/lib/poster/poster-rule';

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

  it('says so when there is no poster code yet', () => {
    renderTab([]);
    expect(
      screen.getByText('No poster codes yet. Mint one on the Codes tab.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('poster-sheet')).toBeNull();
  });
});
