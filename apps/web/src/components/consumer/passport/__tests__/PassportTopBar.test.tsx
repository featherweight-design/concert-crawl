// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { PassportActions } from '../PassportActions';
import { PassportTopBar } from '../PassportTopBar';
import { usePassportShare } from '../lib/use-passport-share';
import type { ShareCapabilities } from '@/lib/share/destinations';

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

const COPY = CONSUMER_COPY.passport;

const objectUrlApi = {
  create: URL.createObjectURL,
  revoke: URL.revokeObjectURL,
};

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob()) }),
    ),
  );
  URL.createObjectURL = vi.fn(() => 'blob:passport');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  URL.createObjectURL = objectUrlApi.create;
  URL.revokeObjectURL = objectUrlApi.revoke;
});

// The top bar and the row wired to one share, as `PassportContent` does.
const Pair = ({ capabilities }: { capabilities: ShareCapabilities }) => {
  const share = usePassportShare('/passport/square', capabilities);
  return (
    <>
      <PassportTopBar share={share} />
      <PassportActions imageUrl="/passport/square" share={share} />
    </>
  );
};

describe('PassportTopBar', () => {
  it('draws the back link, the centred title and the share icon', async () => {
    render(<Pair capabilities={{ share: vi.fn(), canShare: () => true }} />);
    expect(screen.getByRole('link', { name: COPY.topBarBack })).toHaveAttribute(
      'href',
      '/history',
    );
    expect(
      screen.getByRole('heading', { level: 1, name: COPY.pageTitle }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: COPY.topBarShare }),
    ).toBeInTheDocument();
  });

  it('runs the same share as the Share row, off one fetch', async () => {
    const shared: ShareData[] = [];
    const share = (data: ShareData) => {
      shared.push(data);
      return Promise.resolve();
    };
    render(<Pair capabilities={{ share, canShare: () => true }} />);

    const icon = await screen.findByRole('button', { name: COPY.topBarShare });
    await waitFor(() => expect(icon).toBeEnabled());
    fireEvent.click(icon);
    fireEvent.click(screen.getByRole('button', { name: COPY.shareLabel }));

    expect(shared).toHaveLength(2);
    expect(shared[0]?.files).toHaveLength(1);
    expect(shared[1]?.files?.[0]).toBe(shared[0]?.files?.[0]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('drops the icon where the device cannot share the image', () => {
    render(<Pair capabilities={{}} />);
    expect(
      screen.queryByRole('button', { name: COPY.topBarShare }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('passport-top-bar')).toHaveClass('lg:hidden');
  });
});
