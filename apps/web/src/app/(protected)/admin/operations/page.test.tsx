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

const render = async (query: Record<string, string> = {}) => {
  const { default: Page } = await import('./page');
  return Page({ searchParams: Promise.resolve(query) });
};

describe('/admin/operations', () => {
  it('checks the admin, then draws the client on the Feedback tab', async () => {
    const element = await render();
    expect(requireAdminUser).toHaveBeenCalledOnce();
    expect(element.props).toEqual({ initialTab: 'feedback' });
  });

  it('opens the Activity log at ?tab=log', async () => {
    const element = await render({ tab: 'log' });
    expect(element.props).toEqual({ initialTab: 'log' });
  });

  it('draws nothing when the admin check throws', async () => {
    requireAdminUser.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(render()).rejects.toThrow('NEXT_REDIRECT');
  });
});
