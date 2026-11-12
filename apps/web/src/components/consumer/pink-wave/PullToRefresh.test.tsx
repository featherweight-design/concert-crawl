// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const refreshMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import { PullToRefresh } from './PullToRefresh';

// jsdom has no matchMedia; the wave reads reduced motion through it.
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  refreshMock.mockReset();
  vi.unstubAllGlobals();
});

const touch = (type: string, clientY: number) => {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, 'touches', {
    value: type === 'touchend' ? [] : [{ clientY }],
  });
  window.dispatchEvent(event);
};

describe('PullToRefresh', () => {
  it('draws the wave at rest until the pull passes 74px, and snaps back on --motion-fast', () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <PullToRefresh />
      </QueryClientProvider>,
    );
    act(() => {
      touch('touchstart', 100);
      touch('touchmove', 100 + 60 * 2);
    });
    expect(
      document
        .querySelector('[data-pink-wave]')
        ?.getAttribute('data-pink-wave'),
    ).toBe('still');
    act(() => {
      touch('touchend', 0);
    });
    const zone = screen.getByRole('status', { name: 'Loading shows' });
    expect(zone.style.transition).toContain('var(--motion-fast)');
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('takes no space until a pull begins', () => {
    const client = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={client}>
        <PullToRefresh />
      </QueryClientProvider>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows the wave and Loading shows while pulling, and reloads on release', async () => {
    const client = new QueryClient();
    const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue();
    render(
      <QueryClientProvider client={client}>
        <PullToRefresh />
      </QueryClientProvider>,
    );
    act(() => {
      touch('touchstart', 100);
      touch('touchmove', 260);
    });
    expect(screen.getByRole('status', { name: 'Loading shows' })).toBeTruthy();
    expect(
      document
        .querySelector('[data-pink-wave]')
        ?.getAttribute('data-pink-wave'),
    ).toBe('running');
    await act(async () => {
      touch('touchend', 0);
    });
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenCalledWith({ queryKey: ['events'] });
  });
});
