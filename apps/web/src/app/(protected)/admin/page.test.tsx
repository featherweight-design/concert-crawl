import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn<(path: string, token: string) => Promise<unknown>>(),
}));

vi.mock('@/lib/auth', () => ({
  requireAdminUser: vi.fn(async () => ({ role: 'admin' })),
  auth: vi.fn(async () => ({ getToken: async () => 'token' })),
}));
vi.mock('@/lib/api', () => ({
  apiClient: { get: (path: string, token: string) => mockGet(path, token) },
}));

const fixtures: Record<string, unknown> = {
  '/v1/admin/crawl/status': [],
  '/v1/admin/venues': [],
  '/v1/admin/settings': { llmMonthlyBudgetUsd: 15 },
  '/v1/admin/artists/counts': {
    matched: 1,
    auto_matched: 0,
    to_check: 0,
    to_check_soon: 0,
  },
  '/v1/admin/notifications/delivery': {
    lastSentAt: null,
    sent24h: 0,
    failed24h: 0,
    suppressed24h: 0,
  },
  '/v1/admin/needs-you/count': { decisions: 2 },
  '/v1/admin/triage': { success: true, data: [] },
};

const answer = (failing: string[] = []) =>
  mockGet.mockImplementation(async (path) => {
    const key = path.split('?')[0] ?? path;
    if (failing.includes(key)) throw new Error(`boom: ${key}`);
    if (key === '/v1/admin/costs/daily') return { days: [], totalUsd: 0 };
    return fixtures[key];
  });

describe('/admin Health page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Nov 12 2026, 10:00 MT.
    vi.setSystemTime(new Date('2026-11-12T17:00:00Z'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    mockGet.mockReset();
  });

  it('asks for the month to date in Mountain Time', async () => {
    answer();
    const { default: AdminHealthPage } = await import('./page');
    await AdminHealthPage();
    expect(mockGet).toHaveBeenCalledWith(
      '/v1/admin/costs/daily?days=12',
      'token',
    );
  });

  it('throws to the error boundary when the tiles cannot load', async () => {
    answer(['/v1/admin/crawl/status']);
    const { default: AdminHealthPage } = await import('./page');
    await expect(AdminHealthPage()).rejects.toThrow(/crawl\/status/);
  });

  it('still renders when only the Needs you count and triage fail', async () => {
    answer(['/v1/admin/needs-you/count', '/v1/admin/triage']);
    const { default: AdminHealthPage } = await import('./page');
    await expect(AdminHealthPage()).resolves.not.toBeNull();
  });
});
