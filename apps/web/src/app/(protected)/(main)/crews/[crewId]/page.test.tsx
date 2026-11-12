import { describe, it, expect, vi, beforeEach } from 'vitest';

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);
const fetchCrew = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/auth', () => ({
  auth: async () => ({ getToken: async () => 'token' }),
}));
vi.mock('@/lib/feature-flags', () => ({ isFeatureEnabled: async () => true }));
vi.mock('@/lib/crews', () => ({ fetchCrew }));
vi.mock('@/components/consumer/crews', () => ({ CrewHome: () => null }));

import { ApiError } from '@/lib/api';
import CrewPage from './page';

const render = () =>
  CrewPage({ params: Promise.resolve({ crewId: 'not-a-crew' }) });

beforeEach(() => {
  notFound.mockClear();
  fetchCrew.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('/crews/[crewId] load failures', () => {
  it.each([400, 403, 404])(
    'turns a %i into the not-found page, not the error boundary',
    async (status) => {
      fetchCrew.mockRejectedValue(new ApiError(status, 'nope'));

      await expect(render()).rejects.toThrow('NEXT_NOT_FOUND');
      expect(notFound).toHaveBeenCalledTimes(1);
    },
  );

  it('still lets a real failure reach the error boundary', async () => {
    fetchCrew.mockRejectedValue(new ApiError(500, 'boom'));

    await expect(render()).rejects.toThrow('boom');
    expect(notFound).not.toHaveBeenCalled();
  });
});
