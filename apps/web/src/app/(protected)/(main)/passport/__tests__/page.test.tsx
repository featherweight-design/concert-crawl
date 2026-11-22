import { beforeEach, describe, expect, it, vi } from 'vitest';

const afterCallbacks: Array<() => Promise<void>> = [];
vi.mock('next/server', () => ({
  after: (callback: () => Promise<void>) => {
    afterCallbacks.push(callback);
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: async () => ({ getToken: async () => 'test-token' }),
}));
vi.mock('@/lib/api', () => ({
  apiClient: { get: vi.fn(async () => []) },
}));
const fetchHistoryMock = vi.fn();
vi.mock('@/lib/history', () => ({ fetchHistory: fetchHistoryMock }));
vi.mock('@/lib/users', () => ({
  fetchMe: async () => ({ id: 'user_a', handle: '@huey', theme: 'jade' }),
}));
vi.mock('@/components/consumer/passport/PassportContent', () => ({
  PassportContent: () => null,
}));

const renderMock = vi.fn();
const planMock = vi.fn(() => ({ key: 'k', render: renderMock }));
vi.mock('@/lib/passport/render-card', () => ({
  planPassportCard: planMock,
}));
vi.mock('@/lib/share/site-origin', () => ({
  siteOrigin: () => 'https://configured.example.test',
}));

const { default: PassportPage } =
  await import('@/app/(protected)/(main)/passport/page');

describe('PassportPage card pre-warm', () => {
  beforeEach(() => {
    afterCallbacks.length = 0;
    vi.clearAllMocks();
    renderMock.mockResolvedValue(new ArrayBuffer(1));
  });

  it('schedules no warm-up for a reader with no stamps', async () => {
    fetchHistoryMock.mockResolvedValue({ past: [], upcoming: [] });
    await PassportPage();
    expect(afterCallbacks).toHaveLength(0);
  });

  it('warms the stored-theme card from the configured origin, after the response', async () => {
    fetchHistoryMock.mockResolvedValue({ past: [{}], upcoming: [] });
    await PassportPage();
    expect(afterCallbacks).toHaveLength(1);
    expect(planMock).not.toHaveBeenCalled();

    await afterCallbacks[0]?.();
    expect(planMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user_a', profileTheme: 'jade' }),
    );
    expect(renderMock).toHaveBeenCalledWith('https://configured.example.test');
  });

  it('logs a failed warm-up instead of throwing', async () => {
    fetchHistoryMock.mockResolvedValue({ past: [{}], upcoming: [] });
    renderMock.mockRejectedValue(new Error('boom'));
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    await PassportPage();
    await expect(afterCallbacks[0]?.()).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalled();
  });
});
