'use client';

import { useCallback, useRef, useState, type RefObject } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '';

export type WithdrawState = 'idle' | 'withdrawing' | 'error';

interface UseWithdrawUpdateArgs {
  /** The viewer's own pending update; null when there is nothing to withdraw. */
  counterId: string | null;
  /** Where focus goes once the Withdraw button is about to disappear. */
  focusRef: RefObject<HTMLElement | null>;
  /** Runs after the DELETE lands and the page refresh is asked for. */
  onDone?: () => void;
}

/**
 * Withdraw the viewer's pending update: DELETE /v1/submissions/:id, then
 * refresh the page. Shared by the event page's price check card and the
 * update sheet's success preview.
 */
export function useWithdrawUpdate({
  counterId,
  focusRef,
  onDone,
}: UseWithdrawUpdateArgs) {
  const { getToken } = useAuth();
  const router = useRouter();
  // Keyed to the counter it was for, so a refresh that hands over a different
  // counterId (or none) drops a stale error or spinner without an effect.
  const [withdraw, setWithdraw] = useState<{
    counterId: string;
    state: 'withdrawing' | 'error';
  } | null>(null);
  const state: WithdrawState =
    withdraw !== null && withdraw.counterId === counterId
      ? withdraw.state
      : 'idle';
  // A ref, not state: two clicks in one frame both read the same render.
  const inFlightRef = useRef<string | null>(null);

  const run = useCallback(async () => {
    const target = counterId;
    if (target === null || inFlightRef.current === target) return;
    inFlightRef.current = target;
    setWithdraw({ counterId: target, state: 'withdrawing' });
    const fail = (reason: unknown) => {
      console.error('Price check: withdraw failed', reason);
      inFlightRef.current = null;
      setWithdraw({ counterId: target, state: 'error' });
    };
    try {
      const token = await getToken();
      if (!token) {
        fail('no token');
        return;
      }
      const res = await fetch(`${API_URL}/v1/submissions/${target}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      // A 404 means the update is already gone (withdrawn in another tab, or
      // archived when the check was decided): the outcome the fan asked for.
      if (!res.ok && res.status !== 404) {
        fail(res.status);
        return;
      }
      // Stay 'withdrawing' until the refresh replaces counterId, so the button
      // cannot fire again in between. The button is about to go, so focus
      // moves to a stable target rather than falling back to the page.
      focusRef.current?.focus();
      router.refresh();
      onDone?.();
    } catch (err) {
      fail(err);
    }
  }, [counterId, getToken, router, focusRef, onDone]);

  const start = useCallback(() => {
    void run();
  }, [run]);

  return { state, withdraw: start };
}
