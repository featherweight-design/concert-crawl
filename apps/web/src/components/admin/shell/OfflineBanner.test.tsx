// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { OfflineBanner } from './OfflineBanner';

const setOnline = (online: boolean) => {
  act(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: online,
      configurable: true,
    });
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
};

describe('OfflineBanner', () => {
  afterEach(() => {
    cleanup();
    const nav: { onLine?: boolean } = navigator;
    delete nav.onLine;
  });

  it('draws nothing while the browser is online', () => {
    render(<OfflineBanner />);
    expect(screen.queryByTestId('admin-offline-banner')).toBeNull();
  });

  it('shows a 40px warning banner that says what will not work, and goes when back online', () => {
    render(<OfflineBanner />);
    setOnline(false);
    const banner = screen.getByTestId('admin-offline-banner');
    expect(banner).toHaveStyle({ height: '40px' });
    // It says what will not work, and promises no queue.
    expect(banner).toHaveTextContent(
      "Offline. You can't save until you're back.",
    );
    expect(banner).toHaveTextContent(ADMIN_COPY.states.offline.banner);
    setOnline(true);
    expect(screen.queryByTestId('admin-offline-banner')).toBeNull();
  });

  it('keeps its live region mounted while online, so the change is announced', () => {
    render(<OfflineBanner />);
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();
    setOnline(false);
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent("You can't save");
  });
});
