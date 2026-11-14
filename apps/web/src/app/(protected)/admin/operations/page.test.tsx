import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: string[] = [];

const { requireAdminUser, auth, get } = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  auth: vi.fn(),
  get: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAdminUser, auth }));
vi.mock('@/lib/api', () => ({ apiClient: { get } }));
vi.mock('@/components/admin/operations/OperationsClient', () => ({
  OperationsClient: () => null,
}));

beforeEach(() => {
  calls.length = 0;
  requireAdminUser.mockReset().mockImplementation(async () => {
    calls.push('requireAdminUser');
    return {};
  });
  auth.mockReset().mockImplementation(async () => ({
    getToken: async () => {
      calls.push('getToken');
      return 'test-token';
    },
  }));
  get.mockReset().mockResolvedValue({ unread: 4 });
});

const render = async () => {
  const { default: Page } = await import('./page');
  return Page();
};

describe('/admin/operations', () => {
  it('checks the admin before it reads a token', async () => {
    await render();
    expect(calls).toEqual(['requireAdminUser', 'getToken']);
  });

  it('reads no token when the admin check throws', async () => {
    requireAdminUser.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(render()).rejects.toThrow('NEXT_REDIRECT');
    expect(calls).toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });

  it('passes the unread count, and null when the read fails', async () => {
    expect((await render()).props.feedbackUnread).toBe(4);
    get.mockRejectedValueOnce(new Error('down'));
    expect((await render()).props.feedbackUnread).toBeNull();
  });
});
