'use client';

import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api';
import {
  ONBOARDED_COOKIE,
  ONBOARDED_COOKIE_MAX_AGE,
} from '@/lib/auth/onboarding-required';

/**
 * Records that the tour is done (finished or skipped). Synchronous on purpose,
 * so leaving never waits on the network:
 *
 * 1. It sets the `cc_onboarded` cookie to this user's id at once. The proxy
 *    honours it on the very next request, from this tab or a new one opened
 *    with a modified click, and whether or not the write below succeeds.
 * 2. It stamps `publicMetadata.onboardedAt` in the background, which reaches
 *    the session token on its next refresh and covers the account's other
 *    devices. Skipped when the token already carries a stamp (an older account
 *    closing the tour from the account menu). A failed write is logged; this
 *    device is already let through by the cookie.
 */
export const useMarkOnboarded = (): (() => void) => {
  const { userId, sessionClaims, getToken } = useAuth();
  const stamped = Boolean(sessionClaims?.metadata?.onboardedAt);
  return useCallback(() => {
    if (!userId) return;
    document.cookie = `${ONBOARDED_COOKIE}=${encodeURIComponent(userId)}; Path=/; Max-Age=${ONBOARDED_COOKIE_MAX_AGE}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
    if (stamped) return;
    void (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        // keepalive: a hard navigation or a closed tab must not cancel it.
        await apiClient.post(
          '/v1/me/onboarded',
          token,
          {},
          { keepalive: true },
        );
      } catch (err) {
        console.error('[onboarding] could not record the tour as done', err);
      }
    })();
  }, [userId, stamped, getToken]);
};
