import { describe, it, expect, vi } from 'vitest';
import { isValidElement } from 'react';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  auth: async () => ({ getToken: async () => 'token' }),
  requireAdminUser: async () => undefined,
}));
vi.mock('@/lib/api', () => ({
  apiClient: { get: async () => ({ id: 'v-1', name: 'Bluebird' }) },
}));
vi.mock('@/components/admin/VenueDetailsClient', () => ({
  VenueDetailsClient: () => null,
}));

import VenueDetailPage from './page';

const openedOn = async (tab?: string | string[]) => {
  const element = await VenueDetailPage({
    params: Promise.resolve({ id: 'v-1' }),
    searchParams: Promise.resolve(tab === undefined ? {} : { tab }),
  });
  if (!isValidElement<{ initialTab: unknown }>(element)) {
    throw new Error('Expected the page to render the venue client');
  }
  return element.props.initialTab;
};

describe('/admin/venues/[id] ?tab=', () => {
  it('opens the tab the URL names', async () => {
    expect(await openedOn('runs')).toBe('runs');
    expect(await openedOn('guide')).toBe('guide');
  });

  it('opens Overview with no tab', async () => {
    expect(await openedOn()).toBe('overview');
  });

  it('opens Overview for an unknown or repeated tab, without throwing', async () => {
    expect(await openedOn('inspect')).toBe('overview');
    expect(await openedOn(['runs', 'source'])).toBe('overview');
  });
});
