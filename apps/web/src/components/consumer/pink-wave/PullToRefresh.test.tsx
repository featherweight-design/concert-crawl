// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const refreshMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import { PullToRefresh } from './PullToRefresh';

afterEach(() => {
  cleanup();
  refreshMock.mockReset();
});

const touch = (type: string, clientY: number) => {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, 'touches', {
    value: type === 'touchend' ? [] : [{ clientY }],
  });
  window.dispatchEvent(event);
};

describe('PullToRefresh', () => {
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
    await act(async () => {
      touch('touchend', 0);
    });
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenCalledWith({ queryKey: ['events'] });
  });
});
