'use client';

import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api';

/**
 * Records that the tour is done (finished or skipped), then refreshes the
 * session token so the proxy sees `metadata.onboardedAt` on the very next
 * navigation. Without the refresh the cached token (up to a minute old) still
 * reads "not onboarded", and the proxy sends the visitor straight back here.
 *
 * Never throws and never blocks leaving: a failed write is logged, and the
 * proxy brings the visitor back to the tour on their next page, which is the
 * rule's own safety net.
 */
export const useMarkOnboarded = (): (() => Promise<void>) => {
  const { getToken } = useAuth();
  return useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      await apiClient.post('/v1/me/onboarded', token, {});
      await getToken({ skipCache: true });
    } catch (err) {
      console.error('[onboarding] could not record the tour as done', err);
    }
  }, [getToken]);
};
