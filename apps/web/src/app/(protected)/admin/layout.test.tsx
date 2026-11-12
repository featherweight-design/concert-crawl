// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const { requireAdminUser, getToken, apiGet } = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  getToken: vi.fn(),
  apiGet: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireAdminUser,
  auth: async () => ({ getToken }),
}));
vi.mock('@/lib/api', () => ({ apiClient: { get: apiGet } }));
vi.mock('./admin.css', () => ({}));
vi.mock('@/components/admin/shell/AdminShellClient', () => ({
  AdminShellClient: ({
    badgeCounts,
    children,
  }: {
    badgeCounts: { needsYou: number };
    children: React.ReactNode;
  }) => (
    <div data-testid="shell" data-needs-you={badgeCounts.needsYou}>
      {children}
    </div>
  ),
}));

import AdminLayout from './layout';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminLayout', () => {
  it('still sends a non-admin away before anything renders or fetches', async () => {
    requireAdminUser.mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(AdminLayout({ children: <p>secret</p> })).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(getToken).not.toHaveBeenCalled();
    expect(apiGet).not.toHaveBeenCalled();
  });

  it('badges Needs you with the decision tabs, leaving price coverage out', async () => {
    requireAdminUser.mockResolvedValue({
      firstName: 'Hugh',
      email: 'h@x.test',
    });
    getToken.mockResolvedValue('token');
    apiGet.mockImplementation(async (path: string) =>
      path === '/v1/users/me'
        ? { handle: 'hugh' }
        : { eventFlags: 2, prices: 200, missing: 3, priceContests: 1 },
    );
    render(await AdminLayout({ children: <p>page</p> }));
    expect(screen.getByTestId('shell')).toHaveAttribute('data-needs-you', '6');
    expect(apiGet).toHaveBeenCalledWith('/v1/admin/review/counts', 'token');
  });

  it('renders with a zero badge when the counts fail', async () => {
    requireAdminUser.mockResolvedValue({ firstName: null, email: 'h@x.test' });
    getToken.mockResolvedValue('token');
    apiGet.mockRejectedValue(new Error('down'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(await AdminLayout({ children: <p>page</p> }));
    expect(screen.getByTestId('shell')).toHaveAttribute('data-needs-you', '0');
    expect(screen.getByText('page')).toBeInTheDocument();
  });
});
