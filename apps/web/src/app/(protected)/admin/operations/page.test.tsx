import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireAdminUser } = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAdminUser }));
vi.mock('@/components/admin/operations/OperationsClient', () => ({
  OperationsClient: () => null,
}));

beforeEach(() => {
  requireAdminUser.mockReset().mockResolvedValue({});
});

const render = async () => {
  const { default: Page } = await import('./page');
  return Page();
};

describe('/admin/operations', () => {
  // The client reads `?tab=` off the URL itself, so the page passes nothing.
  it('checks the admin, then draws the client', async () => {
    const element = await render();
    expect(requireAdminUser).toHaveBeenCalledOnce();
    expect(element.props).toEqual({});
  });

  it('draws nothing when the admin check throws', async () => {
    requireAdminUser.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(render()).rejects.toThrow('NEXT_REDIRECT');
  });
});
