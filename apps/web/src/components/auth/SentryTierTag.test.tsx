import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setTag = vi.fn();
vi.mock('@sentry/nextjs', () => ({ setTag }));
const useAuth = vi.fn();
vi.mock('@clerk/nextjs', () => ({ useAuth: () => useAuth() }));

const { SentryTierTag } = await import('./SentryTierTag');

describe('SentryTierTag', () => {
  beforeEach(() => setTag.mockClear());

  it('tags the plan from the session claim', () => {
    useAuth.mockReturnValue({
      isSignedIn: true,
      sessionClaims: { metadata: { plan: 'supporter' } },
    });
    render(<SentryTierTag />);
    expect(setTag).toHaveBeenCalledWith('tier', 'supporter');
  });

  it('tags unknown for a visitor and for a claim without a plan', () => {
    useAuth.mockReturnValue({ isSignedIn: false, sessionClaims: undefined });
    render(<SentryTierTag />);
    expect(setTag).toHaveBeenLastCalledWith('tier', 'unknown');

    useAuth.mockReturnValue({ isSignedIn: true, sessionClaims: {} });
    render(<SentryTierTag />);
    expect(setTag).toHaveBeenLastCalledWith('tier', 'unknown');
  });
});
